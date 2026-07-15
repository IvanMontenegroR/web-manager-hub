// Capa de datos del modulo Ecosystem 2.0: un Kanban de coordinacion de la migracion.
// Tabla propia `ecosystem_tasks` (independiente de projects/tasks). Si la tabla no
// existe todavia, el modulo muestra el SQL de setup en pantalla (ver SETUP_SQL).
import { supabase } from './supabase'

function throwIf(error) {
  if (error) throw new Error(error.message || 'Error de Supabase')
}

// Columnas del Kanban (orden fijo, de izquierda a derecha).
export const ECO_STATUSES = ['Open', 'In Progress', 'On Hold', 'Done']

// Prioridades (rank para ordenar: menor = mas arriba).
export const ECO_PRIORITIES = ['alta', 'media', 'baja']
export const PRIORITY_RANK = { alta: 0, media: 1, baja: 2 }

// Orden dentro de una columna: PREDOMINA el deadline (las que tienen fecha van arriba,
// por fecha ascendente), luego la prioridad (alta > media > baja), y como desempate el
// sort_order original.
export function ecoOrder(a, b) {
  const ad = a.deadline || null
  const bd = b.deadline || null
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
  section text,
  topic text,
  issue text,
  action text,
  owner text,
  status text not null default 'Open',
  notes text,
  deadline date,
  checklist jsonb not null default '[]'::jsonb,
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
    section: t.section?.trim() || null,
    topic: t.topic?.trim() || null,
    issue: t.issue?.trim() || null,
    action: t.action?.trim() || null,
    owner: t.owner?.trim() || null,
    status: ECO_STATUSES.includes(t.status) ? t.status : 'Open',
    priority: ECO_PRIORITIES.includes(t.priority) ? t.priority : 'media',
    notes: t.notes?.trim() || null,
    deadline: t.deadline || null,
    checklist: Array.isArray(t.checklist) ? t.checklist : [],
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
  { section: 'Home page', topic: 'Faltan videos mobile en home', issue: 'Mobile videos are missing. (generic / cats / dogs)', action: 'Ivan needs to align with MRM.', owner: 'Ivan', status: 'Open', priority: 'media' },
  { section: 'Producto', topic: 'Cambiar food types latas/sobres', issue: 'There are 2 food types, latas and sobres, which are not actual food types and they would not be migrated', action: 'Change food type of the products listed here: https://purina.com.mx/purina/productos?food_type_filter%5B109%5D=109&food_type_filter%5B110%5D=110&page=0 to ones of these: Húmedo, Seco, Snacks.', owner: 'Ivan', status: 'On Hold', priority: 'alta' },
  { section: 'Producto', topic: 'Corregir taxonomía Life stage', issue: 'Product migrated with old content.', action: 'After migration, "Life stage" texonomy must be changed.', owner: 'Ivan', status: 'On Hold', priority: 'media' },
  { section: 'Producto', topic: 'Alcance: ¿migrar productos despublicados?', issue: 'Definition of migration scope. Unpublished products must be migrated?', action: 'Define the scope.', owner: 'Ivan', status: 'Open', notes: 'Only published.', priority: 'alta' },
  { section: 'Producto', topic: 'Acortar texto de Ingredientes', issue: 'Current ingredient text is too long. EX: https://content-ef5-purina-latam-mx.pantheonsite.io/productos/campeonr-adultos-todos-los-tamanos', action: 'Text of the current content type - Ingrediente needs to be reviewed. It can be done before or after migration', owner: 'NBS', status: 'On Hold', priority: 'baja' },
  { section: 'Producto', topic: 'Imágenes de producto: fondo y tamaños', issue: 'There are products with white background.', action: 'Product image must have transparent background. Images need to be replaced after migration.\nDetail page - Desk = 1136 x 1136 / Mob = 670 x 670\nCards = 540 x 540', owner: 'NBS', status: 'On Hold', priority: 'media' },
  { section: 'Producto', topic: 'Definir texto Plan C (reviews)', issue: 'Text AI en la pagina de producto, Plan B ratings and reviews, y PLAN C (TEXT)?', action: 'Ivan to be defined the text for plan C. MRM suggestion on column G', owner: 'Ivan', status: 'Done', notes: '¿Ya probaste este producto? ¡Sé el primero en reseñarlo!\nEscribir la primera reseña', priority: 'baja' },
  { section: 'Producto', topic: 'Identificar productos multi-sabor', issue: 'Products with more than 1 flavour (or main ingredient) needs to be identified.', action: 'After migration, it will be required to update each product, if needed, with main ingredient and related product (different flavour)', owner: 'NBS', status: 'On Hold', priority: 'media' },
  { section: 'Producto', topic: 'Acortar descripciones de producto', issue: 'Long descriptions. Example: https://purina.com.mx/dogchow/productos/adultos-medianos-grandes', action: 'Description needs to be reviewed after migration.', owner: 'NBS', status: 'On Hold', priority: 'baja' },
  { section: 'Contact us', topic: 'Faltan Engage Keys de MX', issue: 'MX Engage Keys missing', action: 'Ivan will follow up on this.', owner: 'Ivan', status: 'Open', priority: 'alta' },
  { section: 'Articles', topic: 'Repoblar metadata Patasencasa', issue: 'Migration of Patasencasa metadata', action: 'Content will not be migrated. It must be populated after migration.', owner: 'Hive', status: 'On Hold', priority: 'media' },
  { section: 'Articles', topic: 'Recibir lista de artículos Patasencasa', issue: 'List of articles from Patas en Casa to be migrated', action: 'When are you going to receive this articles list?', owner: 'Ivan', status: 'Open', notes: 'Due date: July 17', deadline: '2026-07-17', priority: 'alta' },
  { section: 'Articles', topic: 'Alcance: ¿migrar artículos despublicados?', issue: 'Definition of migration scope. Unpublished articles must be migrated?', action: 'Define the scope.', owner: 'Ivan', status: 'Open', notes: 'Only published.', priority: 'alta' },
  { section: 'Brands', topic: 'Snacks no es marca (es componente)', issue: 'Snacks is not a brand but a component page', action: 'Align with market', owner: 'Ivan', status: 'Open', priority: 'media' },
  { section: 'Brands', topic: 'Generar imágenes de marca (670×502)', issue: 'Images from the homepage', action: 'Brand images needs to be generated (all brands). One image with size = 670 x 502', owner: 'Ivan', status: 'Open', priority: 'media' },
  { section: 'Brands', topic: 'Enviar guía de colores a F5', issue: 'Brand colors guide is missing. We have received only Proplan, Friskies and Fancy Feast.', action: 'Send to F5 brand guide colors.', owner: 'Ivan / Gaby', status: 'Open', priority: 'alta' },
  { section: 'Menu', topic: 'Definir menú principal y submenús', issue: 'Definition of main menu and sub menus CTAs. Including brand menu', action: 'Ivan will align with MX team.', owner: 'Ivan', status: 'Open', priority: 'alta' },
  { section: 'Menu', topic: 'Definir footer', issue: 'Definition of footer', action: 'Ivan will align with MX team.', owner: 'Ivan', status: 'Open', priority: 'media' },
  { section: 'Menu', topic: 'Definir menú de usuario logueado', issue: 'Definition of user logged menu.', action: 'Check MRM proposal', owner: 'F5', status: 'Open', priority: 'media' },
  { section: 'Club Purina', topic: 'Rediseñar Club Purina (no es componente)', issue: 'Page structure is totally different from a component page. https://www.figma.com/proto/esqBBkoMtEtiLSq23bNEfY/Purina---F5?node-id=4340-66404&t=E0fOZKhtY13qXAj5-0&scaling=scale-down&content-scaling=fixed&page-id=0%3A1', action: 'Ivan will align with MRM', owner: 'Ivan', status: 'Open', priority: 'media' },
  { section: 'History', topic: 'Ajustar contenido de History al layout', issue: 'Actual content does not fit the layout.', action: 'Review of actual content', owner: 'Ivan', status: 'Open', priority: 'baja' },
  { section: 'Menu', topic: 'Definir link de Sample request', issue: 'Sample request link', action: 'Ivan will align with MX team.', owner: 'Ivan', status: 'Open', priority: 'baja' },
  { section: 'Vetline', topic: 'Definir link de Vetline', issue: 'Vetline link', action: 'Ivan will align with MX team.', owner: 'Ivan', status: 'Open', priority: 'baja' },
  { section: 'General', topic: 'Sync de contenido post-migración', issue: 'Content synchronization after migration', action: 'Aignment date and how to proceed after content migrated', owner: 'Ivan + F5', status: 'Open', notes: 'Ivan + Helo will define a freeze period. Migration will happen after market architetural info file revision. Expected date: July 24', deadline: '2026-07-24', priority: 'alta' },
]
