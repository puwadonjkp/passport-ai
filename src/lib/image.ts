// Agent 01 (ฝั่ง Browser): อ่าน EXIF (วันที่ + GPS) จากรูปจริง รองรับ HEIC จาก iPhone
// แล้วย่อรูปเป็น JPEG ก่อนอัปโหลด เพื่อประหยัดพื้นที่ Storage และโหลดเร็ว
import exifr from 'exifr'

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

export function isHeic(file: File) {
  return /\.(heic|heif)$/i.test(file.name) || /heic|heif/i.test(file.type)
}

export async function readExif(file: Blob) {
  try {
    const data = await exifr.parse(file, { gps: true, pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'latitude', 'longitude'] })
    const dt: Date | undefined = data?.DateTimeOriginal || data?.CreateDate || data?.ModifyDate
    const lat = typeof data?.latitude === 'number' && isFinite(data.latitude) ? data.latitude : null
    const lon = typeof data?.longitude === 'number' && isFinite(data.longitude) ? data.longitude : null
    return { takenAt: dt instanceof Date && !isNaN(dt.getTime()) ? localIso(dt) : null, lat, lon }
  } catch {
    return { takenAt: null, lat: null, lon: null }
  }
}

async function toDecodable(file: File): Promise<Blob> {
  if (!isHeic(file)) return file
  const { default: heic2any } = await import('heic2any')
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
  return Array.isArray(out) ? out[0] : out
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
  const decodable = await toDecodable(file)
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
