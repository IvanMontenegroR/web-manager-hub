// Capa de datos del hub de Referencias: info de consulta "siempre a mano".
// Dos tablas propias, independientes del resto:
//   - directory_brands: ficha por marca (responsables, guidelines, links, notas)
//   - directory_stakeholders: directorio de personas y de que se encargan
// Ambas con RLS abierta (fase dummy). Si no existen todavia, el modulo muestra el
// SQL de setup en pantalla (ver SETUP_SQL) y tolera el error sin romper el resto.
import { supabase } from './supabase'

function throwIf(error) {
  if (error) throw new Error(error.message || 'Error de Supabase')
}

function isMissingTable(error) {
  if (!error) return false
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /does not exist|schema cache|find the table/i.test(error.message || '')
  )
}

// Especies sugeridas para la ficha de marca (opcional, editable).
export const SPECIES = ['Gato', 'Perro', 'Ambos']

export const SETUP_SQL = `create table if not exists public.directory_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owners jsonb not null default '[]'::jsonb,
  species text,
  color text,
  guidelines text,
  links jsonb not null default '[]'::jsonb,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.directory_stakeholders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  areas jsonb not null default '[]'::jsonb,
  email text,
  phone text,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.directory_brands enable row level security;
alter table public.directory_stakeholders enable row level security;

create policy "dummy_all_dir_brands" on public.directory_brands
  for all to anon, authenticated using (true) with check (true);
create policy "dummy_all_dir_stakeholders" on public.directory_stakeholders
  for all to anon, authenticated using (true) with check (true);`

// ---- Marcas ----
export async function fetchBrands() {
  const { data, error } = await supabase.from('directory_brands').select('*').order('sort_order')
  if (error) return { data: [], error, tableMissing: isMissingTable(error) }
  return { data: data ?? [], error: null, tableMissing: false }
}

function brandPayload(b) {
  return {
    name: b.name?.trim() || '',
    owners: Array.isArray(b.owners) ? b.owners.map((x) => String(x).trim()).filter(Boolean) : [],
    species: b.species?.trim() || null,
    color: b.color?.trim() || null,
    guidelines: b.guidelines?.trim() || null,
    links: Array.isArray(b.links) ? b.links.filter((l) => l && (l.url || l.label)) : [],
    notes: b.notes?.trim() || null,
  }
}

export async function createBrand(b, sort_order) {
  const { data, error } = await supabase
    .from('directory_brands')
    .insert({ ...brandPayload(b), sort_order: sort_order ?? 0 })
    .select().single()
  throwIf(error)
  return data
}

export async function updateBrand(id, b) {
  const { data, error } = await supabase
    .from('directory_brands').update(brandPayload(b)).eq('id', id).select().single()
  throwIf(error)
  return data
}

export async function deleteBrand(id) {
  const { error } = await supabase.from('directory_brands').delete().eq('id', id)
  throwIf(error)
}

// ---- Stakeholders ----
export async function fetchStakeholders() {
  const { data, error } = await supabase.from('directory_stakeholders').select('*').order('sort_order')
  if (error) return { data: [], error, tableMissing: isMissingTable(error) }
  return { data: data ?? [], error: null, tableMissing: false }
}

function stakeholderPayload(s) {
  return {
    name: s.name?.trim() || '',
    role: s.role?.trim() || null,
    areas: Array.isArray(s.areas) ? s.areas.map((x) => String(x).trim()).filter(Boolean) : [],
    email: s.email?.trim() || null,
    phone: s.phone?.trim() || null,
    notes: s.notes?.trim() || null,
  }
}

export async function createStakeholder(s, sort_order) {
  const { data, error } = await supabase
    .from('directory_stakeholders')
    .insert({ ...stakeholderPayload(s), sort_order: sort_order ?? 0 })
    .select().single()
  throwIf(error)
  return data
}

export async function updateStakeholder(id, s) {
  const { data, error } = await supabase
    .from('directory_stakeholders').update(stakeholderPayload(s)).eq('id', id).select().single()
  throwIf(error)
  return data
}

export async function deleteStakeholder(id) {
  const { error } = await supabase.from('directory_stakeholders').delete().eq('id', id)
  throwIf(error)
}

// ---- Seeds iniciales (una sola vez, cuando la seccion esta vacia) ----
export const SEED_STAKEHOLDERS = [
  { name: 'Marina', role: 'Brand owner', areas: ['Friskies', 'Fancy Feast', 'Felix', 'Beneful'] },
  { name: 'Dani Camacho', role: 'Brand owner', areas: ['Dog Chow', 'Cat Chow', 'Purina One'] },
  { name: 'Luciana Pellegrino', role: 'Brand owner', areas: ['Pro Plan'] },
]

export const SEED_BRANDS = [
  { name: 'Friskies', owners: ['Marina'], species: 'Gato' },
  { name: 'Fancy Feast', owners: ['Marina'], species: 'Gato' },
  { name: 'Felix', owners: ['Marina'], species: 'Gato' },
  { name: 'Beneful', owners: ['Marina'], species: 'Perro' },
  { name: 'Dog Chow', owners: ['Dani Camacho'], species: 'Perro' },
  { name: 'Cat Chow', owners: ['Dani Camacho'], species: 'Gato' },
  { name: 'Purina One', owners: ['Dani Camacho'], species: 'Ambos' },
  { name: 'Pro Plan', owners: ['Luciana Pellegrino'], species: 'Ambos' },
]

export async function seedStakeholders() {
  const rows = SEED_STAKEHOLDERS.map((s, i) => ({ ...stakeholderPayload(s), sort_order: i }))
  const { data, error } = await supabase.from('directory_stakeholders').insert(rows).select()
  throwIf(error)
  return data
}

export async function seedBrands() {
  const rows = SEED_BRANDS.map((b, i) => ({ ...brandPayload(b), sort_order: i }))
  const { data, error } = await supabase.from('directory_brands').insert(rows).select()
  throwIf(error)
  return data
}
