// Subida de imagenes/videos a Supabase Storage para los componentes del builder.
// Se guarda en un bucket publico y se devuelve la URL publica (lo que se persiste
// en el content del componente, igual que si se pegara una URL a mano).
import { supabase } from './supabase'

export const MEDIA_BUCKET = 'page-media'

// ¿La URL apunta a un video? (para renderizar <video> en vez de <img>).
export function isVideoUrl(u) {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(String(u || ''))
}

// Sube un File y devuelve su URL publica. Lanza un error legible si falta el bucket.
export async function uploadMedia(file) {
  if (!file) throw new Error('No se seleccionó ningún archivo.')
  // 25MB de tope defensivo (los banners con video pesan hasta 10MB segun el guide).
  if (file.size > 25 * 1024 * 1024) throw new Error('El archivo supera los 25MB.')

  const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-60)
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${clean}`

  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined })

  if (error) {
    if (/bucket|not found/i.test(error.message)) {
      throw new Error(`Falta el bucket "${MEDIA_BUCKET}" en Supabase Storage. Corré sql/2026_page_media_bucket.sql.`)
    }
    throw error
  }

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
