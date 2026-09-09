// Acceso al HUB (Supabase) desde las herramientas del runner. Lo usan `cargar.mjs`
// (escribe una pagina) y `manifiesto.mjs` (la lee para armar el manifiesto), asi que vive
// aca y no duplicado en los dos.
//
// Credenciales por variables de entorno, o del .env del hub — que es el mismo que usa la
// app, asi no hay que configurar nada aparte:
//   SUPABASE_URL / SUPABASE_KEY   (tambien valen VITE_SUPABASE_URL / VITE_SUPABASE_KEY)
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function delEnvDelHub(clave) {
  const f = resolve('../.env')
  if (!existsSync(f)) return null
  const m = new RegExp(`^${clave}\\s*=\\s*(.+)$`, 'm').exec(readFileSync(f, 'utf8'))
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null
}

export function credenciales() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || delEnvDelHub('VITE_SUPABASE_URL')
  const key = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || delEnvDelHub('VITE_SUPABASE_KEY')
  return { url, key }
}

export function exigirCredenciales() {
  const { url, key } = credenciales()
  if (!url || !key) {
    process.stderr.write('Faltan credenciales del hub: SUPABASE_URL y SUPABASE_KEY '
      + '(o el .env del hub, en la carpeta de arriba).\n')
    process.exit(2)
  }
  return { url, key }
}

export async function api(ruta, opciones = {}) {
  const { url, key } = exigirCredenciales()
  const res = await fetch(`${url}/rest/v1/${ruta}`, {
    ...opciones,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json', Prefer: 'return=representation',
      ...(opciones.headers || {}),
    },
  })
  const txt = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${ruta}: ${txt.slice(0, 300)}`)
  return txt ? JSON.parse(txt) : null
}

// Una pagina del hub con sus componentes, ya armada como ARBOL (los hijos adentro de su
// padre, ordenados por slot y despues por su orden dentro del slot).
export async function leerPagina(path, market = 'MX') {
  const paginas = await api(`pages?path=eq.${encodeURIComponent(path)}&market=eq.${market}&select=*`)
  const pagina = paginas[0]
  if (!pagina) return null
  const filas = await api(`page_components?page_id=eq.${pagina.id}&select=*&order=sort_order`)
  const hijosDe = new Map()
  for (const f of filas) {
    if (!f.parent_id) continue
    if (!hijosDe.has(f.parent_id)) hijosDe.set(f.parent_id, [])
    hijosDe.get(f.parent_id).push(f)
  }
  const conHijos = (f) => ({
    ...f,
    hijos: (hijosDe.get(f.id) || [])
      .sort((a, b) => (a.tab_index ?? 0) - (b.tab_index ?? 0) || a.sort_order - b.sort_order)
      .map(conHijos),
  })
  return { pagina, bloques: filas.filter((f) => !f.parent_id).map(conHijos) }
}
