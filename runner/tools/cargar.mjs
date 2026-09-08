// CARGA un plan en el hub: escribe la pagina y sus componentes en Supabase.
//
//   node tools/cargar.mjs planes/                  # todos
//   node tools/cargar.mjs planes/conoce-purina.json
//   node tools/cargar.mjs planes/ --seco           # muestra que haria, no escribe
//
// Reemplaza al SQL escrito a mano, que no escala: con 20 paginas son 20 archivos que hay
// que revisar de a uno y que se desincronizan del contenido real apenas se toca algo.
//
// ES IDEMPOTENTE. La pagina se identifica por `path` + `market`. Si ya existe, se
// ACTUALIZA y se le reemplazan TODOS los componentes (borrar + insertar), asi correrlo
// dos veces no deja la pagina duplicada ni con bloques repetidos. El `sort_order` de la
// pagina en el tracker se respeta si ya lo tenia: el orden de prioridad lo decide una
// persona, no este script.
//
// LAS NOTAS. Todo lo que quedo en `revisar` baja a `pages.notes`, que es donde se
// buscan los outliers. Es la unica forma de que las decisiones dudosas viajen con la
// pagina en vez de quedar en una consola.
//
// CREDENCIALES por variables de entorno (o el .env del hub, que ya las tiene):
//   SUPABASE_URL / SUPABASE_KEY  (tambien valen VITE_SUPABASE_URL / VITE_SUPABASE_KEY)
import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'

const args = process.argv.slice(2)
const SECO = args.includes('--seco')
const [entrada] = args.filter((a) => !a.startsWith('--'))
if (!entrada) {
  process.stderr.write('uso: node tools/cargar.mjs <planes/ | plan.json> [--seco]\n')
  process.exit(2)
}

// El .env del hub es el mismo que usa la app: no hay que configurar nada aparte.
function delEnvDelHub(clave) {
  const f = resolve('../.env')
  if (!existsSync(f)) return null
  const m = new RegExp(`^${clave}\\s*=\\s*(.+)$`, 'm').exec(readFileSync(f, 'utf8'))
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null
}
const URL_SB = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || delEnvDelHub('VITE_SUPABASE_URL')
const KEY_SB = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || delEnvDelHub('VITE_SUPABASE_KEY')
if (!SECO && (!URL_SB || !KEY_SB)) {
  process.stderr.write('Faltan credenciales: SUPABASE_URL y SUPABASE_KEY (o el .env del hub).\n')
  process.exit(2)
}

async function api(ruta, opciones = {}) {
  const res = await fetch(`${URL_SB}/rest/v1/${ruta}`, {
    ...opciones,
    headers: {
      apikey: KEY_SB, Authorization: `Bearer ${KEY_SB}`,
      'Content-Type': 'application/json', Prefer: 'return=representation',
      ...(opciones.headers || {}),
    },
  })
  const txt = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${ruta}: ${txt.slice(0, 300)}`)
  return txt ? JSON.parse(txt) : null
}

// Una imagen del plan es un objeto despues de pasar por imagenes.mjs. En el hub va la
// URL de ORIGEN: es lo que el preview sabe mostrar. El archivo recortado es para el
// runner, que lo sube a la Media library — el hub nunca lo necesita.
function paraElHub(contenido) {
  if (Array.isArray(contenido)) return contenido.map(paraElHub)
  if (contenido && typeof contenido === 'object') {
    if (typeof contenido.origen === 'string' && 'archivo' in contenido) return contenido.origen
    return Object.fromEntries(Object.entries(contenido).map(([k, v]) => [k, paraElHub(v)]))
  }
  return contenido
}

// Las notas: lo que ya tenia la pagina NO se pisa (puede haber algo escrito a mano). Lo
// del plan se agrega debajo, bajo un encabezado que dice de donde salio.
const CABECERA = '--- Del plan de migracion (tools/plan.mjs) ---'
function notas(previas, revisar) {
  const mias = revisar.length ? [CABECERA, ...revisar.map((r) => `· ${r}`)].join('\n') : ''
  const aMano = String(previas || '').split(CABECERA)[0].trim()
  return [aMano, mias].filter(Boolean).join('\n\n') || null
}

const planes = statSync(resolve(entrada)).isDirectory()
  ? readdirSync(resolve(entrada)).filter((f) => f.endsWith('.json')).map((f) => join(resolve(entrada), f))
  : [resolve(entrada)]

let creadas = 0, actualizadas = 0
for (const archivo of planes) {
  const plan = JSON.parse(readFileSync(archivo, 'utf8'))
  const p = plan.pagina
  const bloques = plan.bloques || []
  const hijos = bloques.flatMap((b) => (b.hijos || []).length)
  const total = bloques.length + bloques.reduce((a, b) => a + (b.hijos || []).length, 0)

  if (SECO) {
    process.stderr.write(`\n${basename(archivo)}\n  ${p.name}  ${p.path}  [${p.market}]\n`
      + `  ${bloques.length} bloque/s sueltos + ${total - bloques.length} hijo/s\n`
      + bloques.map((b, i) => `   ${i} ${b.componente}`
          + (b.hijos?.length ? ` (${b.hijos.length} adentro)` : '')).join('\n') + '\n'
      + (plan.revisar?.length ? `  ${plan.revisar.length} nota/s para revisar\n` : ''))
    continue
  }

  const previas = await api(`pages?path=eq.${encodeURIComponent(p.path)}&market=eq.${p.market}&select=id,sort_order,notes`)
  const existente = previas[0]

  const fila = {
    name: p.name, path: p.path, market: p.market,
    category: p.category || null, status: p.status || 'Not started',
    url_old: p.url_old || null, url_new: p.url_new || null,
    notes: notas(existente?.notes, plan.revisar || []),
  }

  let id
  if (existente) {
    await api(`pages?id=eq.${existente.id}`, { method: 'PATCH', body: JSON.stringify(fila) })
    // Reemplazo COMPLETO de los componentes: el plan es la fuente de verdad de como esta
    // armada la pagina, y un merge por posicion dejaria restos de la corrida anterior.
    // El ON DELETE CASCADE de parent_id se lleva a los hijos.
    await api(`page_components?page_id=eq.${existente.id}&parent_id=is.null`, { method: 'DELETE' })
    id = existente.id
    actualizadas += 1
  } else {
    const maxs = await api('pages?select=sort_order&order=sort_order.desc&limit=1')
    const creada = await api('pages', { method: 'POST',
      body: JSON.stringify({ ...fila, sort_order: (maxs[0]?.sort_order ?? -1) + 1 }) })
    id = creada[0].id
    creadas += 1
  }

  // Los sueltos primero: los hijos necesitan el id de su padre.
  const padres = await api('page_components', { method: 'POST', body: JSON.stringify(
    bloques.map((b, i) => ({
      page_id: id, component_key: b.componente, parent_id: null, tab_index: null,
      sort_order: i, content: paraElHub(b.contenido || {}),
    })))
  })
  const dentro = []
  bloques.forEach((b, i) => {
    // El sort_order de los hijos es por SLOT, no global: los de una pestaña se ordenan
    // entre ellos (misma regla que el builder).
    const porSlot = new Map()
    for (const h of (b.hijos || [])) {
      const s = h.slot ?? 0
      porSlot.set(s, (porSlot.get(s) ?? -1) + 1)
      dentro.push({ page_id: id, component_key: h.componente, parent_id: padres[i].id,
        tab_index: s, sort_order: porSlot.get(s), content: paraElHub(h.contenido || {}) })
    }
  })
  if (dentro.length) await api('page_components', { method: 'POST', body: JSON.stringify(dentro) })

  process.stderr.write(`  ${existente ? 'actualizada' : 'creada'}  ${p.path}  `
    + `${padres.length} bloque/s${dentro.length ? ` + ${dentro.length} adentro` : ''}`
    + `${plan.revisar?.length ? `  (${plan.revisar.length} nota/s)` : ''}\n`)
}

if (SECO) process.stderr.write('\n(--seco: no se escribio nada)\n')
else process.stderr.write(`\n${creadas} creada/s, ${actualizadas} actualizada/s.\n`)
