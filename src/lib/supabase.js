import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY

if (!url || !key) {
  // No frenamos el render, pero dejamos rastro claro en consola.
  console.error(
    'Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_KEY. ' +
      'Revisa .env (local) o las Variables del repo en GitHub Actions.'
  )
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
})
