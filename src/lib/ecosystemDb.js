// Capa de datos del modulo Ecosystem 2.0: un Kanban de coordinacion de la migracion.
// Tabla propia `ecosystem_tasks` (independiente de projects/tasks). Si la tabla no
// existe todavia, el modulo muestra el SQL de setup en pantalla (ver SETUP_SQL).
import { supabase } from './supabase'
import { addDaysISO, daysBetween, toISO } from './dates'

function throwIf(error) {
  if (error) throw new Error(error.message || 'Error de Supabase')
}

// Columnas del Kanban (orden fijo, de izquierda a derecha).
export const ECO_STATUSES = ['Open', 'In Progress', 'On Hold', 'Done']

// El tablero se divide en DOS ejes independientes:
//   - MERCADO (`market`): a que mercado le pega la tarea. "General" = transversal.
//   - TOPIC (`section` en la DB, por historia): de que va la tarea. Lista CERRADA.
// El filtro principal es el mercado; el topic filtra dentro de ese mercado.
export const ECO_MARKETS = ['MX', 'BR', 'CAM', 'General']
export const ECO_MARKET_LABEL = { MX: 'México', BR: 'Brasil', CAM: 'CAM', General: 'General' }
export const DEFAULT_MARKET = 'MX'

export const ECO_TOPICS = ['Web', 'CIAM', 'Buy Now', 'CRM', 'Proceso']

// Prioridades (rank para ordenar: menor = mas arriba).
export const ECO_PRIORITIES = ['alta', 'media', 'baja']
export const PRIORITY_RANK = { alta: 0, media: 1, baja: 2 }

// Tags sugeridos por defecto (se suman a los ya usados en el board).
export const DEFAULT_TAGS = ['Helo']

// Si una tarjeta nueva no trae deadline, se le pone 1 semana.
export const DEFAULT_DEADLINE_DAYS = 7

// Tag VIRTUAL (no se guarda en la DB, se calcula): a la MITAD del camino entre que
// se creo la tarjeta y su deadline, la tarjeta se marca "Follow-up" (y se pinta en
// amarillo) para acordarse de empujarla antes de que venza.
export const FOLLOW_UP_TAG = 'Follow-up'

export function isFollowUp(task, todayISO = toISO(new Date())) {
  if (!task || task.status === 'Done') return false
  const dl = effectiveDeadline(task)
  if (!dl) return false
  // Arranque = fecha de creacion; si no la tenemos, asumimos la ventana por defecto.
  const start = task.created_at ? String(task.created_at).slice(0, 10) : addDaysISO(dl, -DEFAULT_DEADLINE_DAYS)
  const span = daysBetween(start, dl)
  if (span <= 0) return true
  return todayISO >= addDaysISO(start, Math.ceil(span / 2))
}

// Tags de una tarjeta = los guardados + los virtuales (Follow-up).
export function ecoTags(task, todayISO) {
  const own = Array.isArray(task?.tags) ? task.tags : []
  return isFollowUp(task, todayISO) ? [...own, FOLLOW_UP_TAG] : own
}

// Deadline efectivo de una tarjeta = la fecha mas temprana entre su propio deadline
// y las deadlines de los items del checklist AUN NO hechos. Es lo que manda para el
// color (tono) y el orden: si un sub-item vence pronto, la tarjeta sube aunque la
// tarjeta en si no tenga fecha.
export function effectiveDeadline(task) {
  let best = task.deadline || null
  for (const c of task.checklist || []) {
    if (c.done || !c.deadline) continue
    if (!best || c.deadline < best) best = c.deadline
  }
  return best
}

// La deadline pendiente mas cercana del checklist (para mostrar el chip en la tarjeta).
export function nextChecklistDeadline(task) {
  let best = null
  for (const c of task.checklist || []) {
    if (c.done || !c.deadline) continue
    if (!best || c.deadline < best) best = c.deadline
  }
  return best
}

// Orden dentro de una columna: PREDOMINA el deadline EFECTIVO (las que tienen fecha van
// arriba, por fecha ascendente), luego la prioridad (alta > media > baja), y como
// desempate el sort_order original.
export function ecoOrder(a, b) {
  const ad = effectiveDeadline(a)
  const bd = effectiveDeadline(b)
  if (ad && bd) { if (ad !== bd) return ad < bd ? -1 : 1 }
  else if (ad && !bd) return -1
  else if (!ad && bd) return 1
  const pr = (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1)
  if (pr) return pr
  return (a.sort_order || 0) - (b.sort_order || 0)
}

// SQL que el usuario corre UNA vez en el editor SQL de Supabase (proyecto Purina-Hub).
// Crea la tabla con RLS abierta (fase dummy, igual que el resto de las tablas).
export const SETUP_SQL = `create table if not exists public.ecosystem_tasks (
  id uuid primary key default gen_random_uuid(),
  market text,
  section text,
  topic text,
  owner text,
  status text not null default 'Open',
  priority text not null default 'media',
  notes text,
  deadline date,
  checklist jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.ecosystem_tasks enable row level security;

create policy "dummy_all_ecosystem" on public.ecosystem_tasks
  for all to anon, authenticated using (true) with check (true);`

// Detecta si el error es "la tabla no existe todavia".
function isMissingTable(error) {
  if (!error) return false
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /does not exist|schema cache|find the table/i.test(error.message || '')
  )
}

export async function fetchEcoTasks() {
  const { data, error } = await supabase
    .from('ecosystem_tasks')
    .select('*')
    .order('sort_order')
  if (error) return { data: [], error, tableMissing: isMissingTable(error) }
  return { data: data ?? [], error: null, tableMissing: false }
}

function ecoPayload(t) {
  return {
    market: ECO_MARKETS.includes(t.market) ? t.market : DEFAULT_MARKET,
    section: t.section?.trim() || null,
    topic: t.topic?.trim() || null,
    // Una tarjeta es TEMA + NOTA y nada mas. Los viejos `issue` (Problema / situacion)
    // y `action` (Accion a tomar) se sacaron del tablero y su contenido se migro a
    // `notes`. Las columnas siguen en la DB como respaldo pero ya no se escriben.
    owner: t.owner?.trim() || null,
    status: ECO_STATUSES.includes(t.status) ? t.status : 'Open',
    priority: ECO_PRIORITIES.includes(t.priority) ? t.priority : 'media',
    notes: t.notes?.trim() || null,
    deadline: t.deadline || null,
    checklist: Array.isArray(t.checklist) ? t.checklist : [],
    tags: Array.isArray(t.tags) ? t.tags.map((x) => String(x).trim()).filter(Boolean) : [],
  }
}

export async function createEcoTask(t, sort_order) {
  const { data, error } = await supabase
    .from('ecosystem_tasks')
    .insert({ ...ecoPayload(t), sort_order: sort_order ?? 0 })
    .select()
    .single()
  throwIf(error)
  return data
}

export async function updateEcoTask(id, t) {
  const payload = ecoPayload(t)
  if (t.sort_order != null) payload.sort_order = t.sort_order
  const { data, error } = await supabase
    .from('ecosystem_tasks')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  throwIf(error)
  return data
}

// Cambio rapido de columna (drag-drop): solo estado + orden, sin tocar el resto.
export async function moveEcoTask(id, status, sort_order) {
  const { error } = await supabase
    .from('ecosystem_tasks')
    .update({ status, sort_order })
    .eq('id', id)
  throwIf(error)
}

export async function deleteEcoTask(id) {
  const { error } = await supabase.from('ecosystem_tasks').delete().eq('id', id)
  throwIf(error)
}

// Carga inicial: inserta las 24 tareas de la migracion MX (una sola vez, board vacio).
export async function seedEcoTasks() {
  const rows = SEED_TASKS.map((t, i) => ({ ...ecoPayload(t), sort_order: i }))
  const { data, error } = await supabase.from('ecosystem_tasks').insert(rows).select()
  throwIf(error)
  return data
}

// Estado de la planilla original -> columna del Kanban.
//   Open -> Open ; After migration -> On Hold ; Closed -> Done
export const SEED_TASKS = [
  { section: 'Web', topic: 'Faltan videos mobile en home', owner: 'Ivan', status: 'Open', notes: 'Ivan needs to align with MRM.\n\nMobile videos are missing. (generic / cats / dogs)', priority: 'media' },
  { section: 'Web', topic: 'Cambiar food types latas/sobres', owner: 'Ivan', status: 'On Hold', notes: 'Change food type of the products listed here: https://purina.com.mx/purina/productos?food_type_filter%5B109%5D=109&food_type_filter%5B110%5D=110&page=0 to ones of these: Húmedo, Seco, Snacks.\n\nThere are 2 food types, latas and sobres, which are not actual food types and they would not be migrated', priority: 'alta' },
  { section: 'Web', topic: 'Corregir taxonomía Life stage', owner: 'Ivan', status: 'On Hold', notes: 'After migration, "Life stage" texonomy must be changed.\n\nProduct migrated with old content.', priority: 'media' },
  { section: 'Web', topic: 'Alcance: ¿migrar productos despublicados?', owner: 'Ivan', status: 'Open', notes: 'Define the scope.\n\nDefinition of migration scope. Unpublished products must be migrated?\n\nOnly published.', priority: 'alta' },
  { section: 'Web', topic: 'Acortar texto de Ingredientes', owner: 'NBS', status: 'On Hold', notes: 'Text of the current content type - Ingrediente needs to be reviewed. It can be done before or after migration\n\nCurrent ingredient text is too long. EX: https://content-ef5-purina-latam-mx.pantheonsite.io/productos/campeonr-adultos-todos-los-tamanos', priority: 'baja' },
  { section: 'Web', topic: 'Imágenes de producto: fondo y tamaños', owner: 'NBS', status: 'On Hold', notes: 'Product image must have transparent background. Images need to be replaced after migration.\nDetail page - Desk = 1136 x 1136 / Mob = 670 x 670\nCards = 540 x 540\n\nThere are products with white background.', priority: 'media' },
  { section: 'Web', topic: 'Definir texto Plan C (reviews)', owner: 'Ivan', status: 'Done', notes: 'Ivan to be defined the text for plan C. MRM suggestion on column G\n\nText AI en la pagina de producto, Plan B ratings and reviews, y PLAN C (TEXT)?\n\n¿Ya probaste este producto? ¡Sé el primero en reseñarlo!\nEscribir la primera reseña', priority: 'baja' },
  { section: 'Web', topic: 'Identificar productos multi-sabor', owner: 'NBS', status: 'On Hold', notes: 'After migration, it will be required to update each product, if needed, with main ingredient and related product (different flavour)\n\nProducts with more than 1 flavour (or main ingredient) needs to be identified.', priority: 'media' },
  { section: 'Web', topic: 'Acortar descripciones de producto', owner: 'NBS', status: 'On Hold', notes: 'Description needs to be reviewed after migration.\n\nLong descriptions. Example: https://purina.com.mx/dogchow/productos/adultos-medianos-grandes', priority: 'baja' },
  { section: 'CRM', topic: 'Faltan Engage Keys de MX', owner: 'Ivan', status: 'Open', notes: 'Ivan will follow up on this.\n\nMX Engage Keys missing', priority: 'alta' },
  { section: 'Web', topic: 'Repoblar metadata Patasencasa', owner: 'Hive', status: 'On Hold', notes: 'Content will not be migrated. It must be populated after migration.\n\nMigration of Patasencasa metadata', priority: 'media' },
  { section: 'Web', topic: 'Recibir lista de artículos Patasencasa', owner: 'Ivan', status: 'Open', notes: 'When are you going to receive this articles list?\n\nList of articles from Patas en Casa to be migrated\n\nDue date: July 17', deadline: '2026-07-17', priority: 'alta' },
  { section: 'Web', topic: 'Alcance: ¿migrar artículos despublicados?', owner: 'Ivan', status: 'Open', notes: 'Define the scope.\n\nDefinition of migration scope. Unpublished articles must be migrated?\n\nOnly published.', priority: 'alta' },
  { section: 'Web', topic: 'Snacks no es marca (es componente)', owner: 'Ivan', status: 'Open', notes: 'Align with market\n\nSnacks is not a brand but a component page', priority: 'media' },
  { section: 'Web', topic: 'Generar imágenes de marca (670×502)', owner: 'Ivan', status: 'Open', notes: 'Brand images needs to be generated (all brands). One image with size = 670 x 502\n\nImages from the homepage', priority: 'media' },
  { section: 'Web', topic: 'Enviar guía de colores a F5', owner: 'Ivan / Gaby', status: 'Open', notes: 'Send to F5 brand guide colors.\n\nBrand colors guide is missing. We have received only Proplan, Friskies and Fancy Feast.', priority: 'alta' },
  { section: 'Web', topic: 'Definir menú principal y submenús', owner: 'Ivan', status: 'Open', notes: 'Ivan will align with MX team.\n\nDefinition of main menu and sub menus CTAs. Including brand menu', priority: 'alta' },
  { section: 'Web', topic: 'Definir footer', owner: 'Ivan', status: 'Open', notes: 'Ivan will align with MX team.\n\nDefinition of footer', priority: 'media' },
  { section: 'Web', topic: 'Definir menú de usuario logueado', owner: 'F5', status: 'Open', notes: 'Check MRM proposal\n\nDefinition of user logged menu.', priority: 'media' },
  { section: 'Web', topic: 'Rediseñar Club Purina (no es componente)', owner: 'Ivan', status: 'Open', notes: 'Ivan will align with MRM\n\nPage structure is totally different from a component page. https://www.figma.com/proto/esqBBkoMtEtiLSq23bNEfY/Purina---F5?node-id=4340-66404&t=E0fOZKhtY13qXAj5-0&scaling=scale-down&content-scaling=fixed&page-id=0%3A1', priority: 'media' },
  { section: 'Web', topic: 'Ajustar contenido de History al layout', owner: 'Ivan', status: 'Open', notes: 'Review of actual content\n\nActual content does not fit the layout.', priority: 'baja' },
  { section: 'Web', topic: 'Definir link de Sample request', owner: 'Ivan', status: 'Open', notes: 'Ivan will align with MX team.\n\nSample request link', priority: 'baja' },
  { section: 'Web', topic: 'Definir link de Vetline', owner: 'Ivan', status: 'Open', notes: 'Ivan will align with MX team.\n\nVetline link', priority: 'baja' },
  { section: 'Proceso', topic: 'Sync de contenido post-migración', owner: 'Ivan + F5', status: 'Open', notes: 'Aignment date and how to proceed after content migrated\n\nContent synchronization after migration\n\nIvan + Helo will define a freeze period. Migration will happen after market architetural info file revision. Expected date: July 24', deadline: '2026-07-24', priority: 'alta' },
]
