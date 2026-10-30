// Agent 01 (ฝั่ง Browser): อ่าน EXIF (วันที่ + GPS) จากรูปจริง รองรับ HEIC จาก iPhone
// แล้วย่อรูปเป็น JPEG ก่อนอัปโหลด เพื่อประหยัดพื้นที่ Storage และโหลดเร็ว
import exifr from 'exifr'
import { extractHeifExif } from './heifExif'

export interface PreparedImage {
  full: Blob
  thumb: Blob
  width: number
  height: number
  takenAt: string | null // 'YYYY-MM-DDTHH:mm:ss' เวลาท้องถิ่นตาม EXIF
  lat: number | null
  lon: number | null
}

const pad = (n: number) => String(n).padStart(2, '0')

function localIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** ตรวจว่าเป็น HEIC จริงไหม จาก "เนื้อไฟล์" (ftyp box) ไม่ใช่จากนามสกุล —
 * รูปจาก iPhone ที่ส่งผ่าน LINE/AirDrop/iCloud มักชื่อ .HEIC แต่ข้างในถูกแปลงเป็น JPEG แล้ว */
export async function isHeic(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (head[0] === 0xff && head[1] === 0xd8) return false // JPEG
  if (head[0] === 0x89 && head[1] === 0x50) return false // PNG
  const box = String.fromCharCode(...head.slice(4, 12))
  return /^ftyp(heic|heix|hevc|hevx|heim|heis|mif1|msf1|avif)/.test(box)
}

/** แปลง HEIC -> JPEG ให้ Browser แสดง/ย่อได้ ลองตามลำดับ:
 *  1) Browser เปิดเองได้ (Safari / iPhone) -> ใช้ไฟล์เดิม
 *  2) heic-to (libheif รุ่นใหม่ รองรับ HEIC จาก iPhone รุ่นล่าสุด)
 *  3) heic2any (libheif รุ่นเก่า) เป็นทางสำรองสุดท้าย */
export async function toBrowserImage(file: Blob): Promise<Blob> {
  if (!(await isHeic(file))) return file
  try {
    const bmp = await createImageBitmap(file)
    bmp.close()
    return file
  } catch {
    /* Browser นี้เปิด HEIC เองไม่ได้ (Chrome/Edge/Firefox) */
  }
  const errors: string[] = []
  try {
    const { heicTo } = await import('heic-to')
    return await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 })
  } catch (e) {
    errors.push(`heic-to: ${errMsg(e)}`)
  }
  try {
    const { default: heic2any } = await import('heic2any')
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    return Array.isArray(out) ? out[0] : out
  } catch (e) {
    if (/already browser readable/i.test(errMsg(e))) return file
    errors.push(`heic2any: ${errMsg(e)}`)
  }
  throw new Error(`แปลง HEIC ไม่สำเร็จ (${errors.join(' | ')})`)
}

function errMsg(e: unknown) {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}

export async function readExif(file: Blob) {
  let takenAt: string | null = null
  let lat: number | null = null
  let lon: number | null = null
  // HEIC: ดึงก้อน TIFF/EXIF ออกมาเองก่อน เพราะ exifr อ่าน EXIF จาก HEIC รุ่นใหม่ไม่ได้
  let source: Blob | Uint8Array = file
  if (await isHeic(file)) {
    try {
      const tiff = extractHeifExif(await file.arrayBuffer())
      if (tiff) source = tiff
    } catch {
      /* ใช้ไฟล์เดิมให้ exifr ลองเอง */
    }
  }
  try {
    const data = await exifr.parse(source, { pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate'] })
    const dt: Date | undefined = data?.DateTimeOriginal || data?.CreateDate || data?.ModifyDate
    if (dt instanceof Date && !isNaN(dt.getTime())) takenAt = localIso(dt)
  } catch {
    /* ไม่มีวันที่ใน EXIF */
  }
  try {
    // ต้องใช้ exifr.gps() — ถ้า pick แค่ latitude/longitude จะกรองแท็ก GPS ดิบที่ใช้คำนวณทิ้งไป
    const gps = await exifr.gps(source)
    if (gps && isFinite(gps.latitude) && isFinite(gps.longitude) && !(gps.latitude === 0 && gps.longitude === 0)) {
      lat = gps.latitude
      lon = gps.longitude
    }
  } catch {
    /* ไม่มี GPS */
  }
  return { takenAt, lat, lon }
}

async function loadBitmap(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(blob, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    } catch {
      /* fallback ด้านล่าง */
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(blob)
  })
}

function resize(src: ImageBitmap | HTMLImageElement, maxDim: number, quality: number): Promise<{ blob: Blob; w: number; h: number }> {
  const sw = 'naturalWidth' in src ? src.naturalWidth : src.width
  const sh = 'naturalHeight' in src ? src.naturalHeight : src.height
  const scale = Math.min(1, maxDim / Math.max(sw, sh))
  const w = Math.round(sw * scale)
  const h = Math.round(sh * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(src, 0, 0, w, h)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve({ blob: b, w, h }) : reject(new Error('encode failed'))), 'image/jpeg', quality),
  )
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const exif = await readExif(file) // อ่านจากไฟล์ต้นฉบับก่อนแปลง (การแปลงจะทำให้ EXIF หาย)
  const decodable = await toBrowserImage(file)
  const bmp = await loadBitmap(decodable)
  const full = await resize(bmp, 2000, 0.86)
  const thumb = await resize(bmp, 480, 0.8)
  return { full: full.blob, thumb: thumb.blob, width: full.w, height: full.h, ...exif }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(bin)
}

/** ย่อรูปสำหรับส่งให้ AI (เล็กพอให้ส่งเร็ว แต่ยังอ่านตัวหนังสือในใบเสร็จออก) */
export async function imageForAI(blob: Blob, maxDim = 1280) {
  const bmp = await loadBitmap(blob)
  const { blob: small } = await resize(bmp, maxDim, 0.85)
  return { base64: await blobToBase64(small), mime: 'image/jpeg' }
}
