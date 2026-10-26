import { supabase } from './supabase'

export class AIUnavailable extends Error {}

/** เรียก Edge Function "ai" — ถ้ายังไม่ได้ตั้ง API Key หรือ AI ล่ม จะ throw AIUnavailable ให้ผู้เรียกใช้โหมดออฟไลน์แทน */
export async function callAI<T>(action: 'chat' | 'story' | 'caption' | 'document', payload: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ai', { body: { action, payload } })
  if (error) {
    let detail = error.message
    try {
      const body = await (error as { context?: Response }).context?.json()
      detail = body?.detail || body?.error || detail
    } catch {
      /* ignore */
    }
    throw new AIUnavailable(detail)
  }
  if (data?.error) throw new AIUnavailable(data.detail || data.error)
  return data as T
}
