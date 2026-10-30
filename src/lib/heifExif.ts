// ดึงก้อน EXIF ออกจากไฟล์ HEIC/HEIF เอง (exifr อ่าน EXIF จาก HEIC รุ่นใหม่ไม่ได้)
// โครงสร้าง HEIF = ISO-BMFF: meta > iinf (หา item ชนิด "Exif") + iloc (ตำแหน่งข้อมูลของ item นั้น)
// ก้อน Exif item = [4 ไบต์ offset ถึง TIFF header] + ... + TIFF ("II*\0" / "MM\0*") — คืนเฉพาะส่วน TIFF ให้ exifr อ่านต่อ

type Box = { type: string; start: number; body: number; end: number }

function readBoxes(v: DataView, from: number, to: number): Box[] {
  const out: Box[] = []
  let p = from
  while (p + 8 <= to) {
    let size = v.getUint32(p)
    const type = String.fromCharCode(v.getUint8(p + 4), v.getUint8(p + 5), v.getUint8(p + 6), v.getUint8(p + 7))
    let body = p + 8
    if (size === 1) {
      size = Number(v.getBigUint64(p + 8))
      body = p + 16
    } else if (size === 0) {
      size = to - p
    }
    if (size < 8 || p + size > to) break
    out.push({ type, start: p, body, end: p + size })
    p += size
  }
  return out
}

function readUint(v: DataView, p: number, bytes: number): number {
  if (bytes === 0) return 0
  if (bytes === 1) return v.getUint8(p)
  if (bytes === 2) return v.getUint16(p)
  if (bytes === 4) return v.getUint32(p)
  if (bytes === 8) return Number(v.getBigUint64(p))
  throw new Error(`unsupported int size ${bytes}`)
}

export function extractHeifExif(buf: ArrayBuffer): Uint8Array | null {
  const v = new DataView(buf)
  const meta = readBoxes(v, 0, buf.byteLength).find((b) => b.type === 'meta')
  if (!meta) return null
  const children = readBoxes(v, meta.body + 4, meta.end) // meta เป็น FullBox (version+flags 4 ไบต์)

  // ---- iinf: หา item_ID ของ Exif ----
  const iinf = children.find((b) => b.type === 'iinf')
  if (!iinf) return null
  const iinfVersion = v.getUint8(iinf.body)
  const entriesStart = iinf.body + 4 + (iinfVersion === 0 ? 2 : 4)
  let exifId: number | null = null
  for (const infe of readBoxes(v, entriesStart, iinf.end)) {
    if (infe.type !== 'infe') continue
    const ver = v.getUint8(infe.body)
    if (ver < 2) continue
    let p = infe.body + 4
    const id = ver === 2 ? v.getUint16(p) : v.getUint32(p)
    p += ver === 2 ? 2 : 4
    p += 2 // item_protection_index
    const itemType = String.fromCharCode(v.getUint8(p), v.getUint8(p + 1), v.getUint8(p + 2), v.getUint8(p + 3))
    if (itemType === 'Exif') {
      exifId = id
      break
    }
  }
  if (exifId == null) return null

  // ---- iloc: หาตำแหน่งข้อมูลของ item นั้น ----
  const iloc = children.find((b) => b.type === 'iloc')
  if (!iloc) return null
  const ver = v.getUint8(iloc.body)
  let p = iloc.body + 4
  const sizes1 = v.getUint8(p)
  const sizes2 = v.getUint8(p + 1)
  p += 2
  const offsetSize = sizes1 >> 4
  const lengthSize = sizes1 & 0x0f
  const baseOffsetSize = sizes2 >> 4
  const indexSize = ver === 1 || ver === 2 ? sizes2 & 0x0f : 0
  const count = ver < 2 ? v.getUint16(p) : v.getUint32(p)
  p += ver < 2 ? 2 : 4
  const idat = children.find((b) => b.type === 'idat')

  for (let i = 0; i < count; i++) {
    const id = ver < 2 ? v.getUint16(p) : v.getUint32(p)
    p += ver < 2 ? 2 : 4
    let method = 0
    if (ver === 1 || ver === 2) {
      method = v.getUint16(p) & 0x0f
      p += 2
    }
    p += 2 // data_reference_index
    const base = readUint(v, p, baseOffsetSize)
    p += baseOffsetSize
    const extents = v.getUint16(p)
    p += 2
    const parts: Uint8Array[] = []
    for (let e = 0; e < extents; e++) {
      p += indexSize
      const off = readUint(v, p, offsetSize)
      p += offsetSize
      const len = readUint(v, p, lengthSize)
      p += lengthSize
      if (id === exifId) {
        const origin = method === 1 && idat ? idat.body : 0
        parts.push(new Uint8Array(buf, origin + base + off, len))
      }
    }
    if (id !== exifId) continue
    const total = parts.reduce((s, x) => s + x.length, 0)
    const data = new Uint8Array(total)
    let o = 0
    for (const x of parts) {
      data.set(x, o)
      o += x.length
    }
    return toTiff(data)
  }
  return null
}

/** ตัดส่วนหัวของ Exif item ให้เหลือแค่ TIFF (บางไฟล์มี "Exif\0\0" นำหน้าด้วย) */
function toTiff(data: Uint8Array): Uint8Array | null {
  const isTiff = (i: number) =>
    (data[i] === 0x49 && data[i + 1] === 0x49 && data[i + 2] === 0x2a && data[i + 3] === 0x00) ||
    (data[i] === 0x4d && data[i + 1] === 0x4d && data[i + 2] === 0x00 && data[i + 3] === 0x2a)
  if (data.length > 8) {
    const hdr = ((data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3]) >>> 0
    if (4 + hdr < data.length - 4 && isTiff(4 + hdr)) return data.subarray(4 + hdr)
  }
  for (let i = 0; i < Math.min(data.length - 4, 64); i++) if (isTiff(i)) return data.subarray(i)
  return null
}
