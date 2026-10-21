import { prepareImage, type PreparedImage } from './image'
import { PHOTO_BUCKET, supabase } from './supabase'
import type { Photo, Trip } from './types'

/** อัปโหลดรูป 1 รูปลง Storage โฟลเดอร์ <user_id>/<trip_id>/ แล้วบันทึกข้อมูล EXIF ลงตาราง photos */
export async function uploadPhoto(trip: Trip, file: File, kind: 'photo' | 'receipt' = 'photo', prepared?: PreparedImage): Promise<Photo> {
  const img = prepared ?? (await prepareImage(file))
  const id = crypto.randomUUID()
  const base = `${trip.user_id}/${trip.id}`
  const path = `${base}/${id}.jpg`
  const thumbPath = `${base}/thumbs/${id}.jpg`
  const opts = { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false }
  const [a, b] = await Promise.all([
    supabase.storage.from(PHOTO_BUCKET).upload(path, img.full, opts),
    supabase.storage.from(PHOTO_BUCKET).upload(thumbPath, img.thumb, opts),
  ])
  if (a.error) throw a.error
  if (b.error) throw b.error
  const { data, error } = await supabase
    .from('photos')
    .insert({
      id, trip_id: trip.id, storage_path: path, thumb_path: thumbPath, original_name: file.name, kind,
      taken_at: img.takenAt, lat: img.lat, lon: img.lon, width: img.width, height: img.height,
    })
    .select()
    .single()
  if (error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path, thumbPath])
    throw error
  }
  if (!trip.cover_photo_path && kind === 'photo') {
    await supabase.from('trips').update({ cover_photo_path: path }).eq('id', trip.id)
    trip.cover_photo_path = path
  }
  return data as Photo
}

export async function deletePhotos(photos: Photo[]) {
  const paths = photos.flatMap((p) => [p.storage_path, p.thumb_path].filter(Boolean) as string[])
  if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths)
  await supabase.from('photos').delete().in('id', photos.map((p) => p.id))
}

/** ลบไฟล์ทั้งโฟลเดอร์ของทริป (ใช้ตอนลบทริป) */
export async function deleteTripFolder(trip: Trip) {
  const base = `${trip.user_id}/${trip.id}`
  for (const dir of [base, `${base}/thumbs`]) {
    for (;;) {
      const { data } = await supabase.storage.from(PHOTO_BUCKET).list(dir, { limit: 100 })
      const files = (data ?? []).filter((f) => f.id)
      if (!files.length) break
      await supabase.storage.from(PHOTO_BUCKET).remove(files.map((f) => `${dir}/${f.name}`))
    }
  }
}
