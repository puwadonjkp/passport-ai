import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key)

export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true },
})

export const PHOTO_BUCKET = 'trip-photos'

export function publicUrl(path: string | null | undefined) {
  if (!path) return ''
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}
