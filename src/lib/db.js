// Capa de datos: todas las lecturas y escrituras contra Supabase.
// IMPORTANTE: planned_end es una columna GENERADA en Postgres.
// Nunca se escribe: en inserts/updates solo mandamos planned_start y planned_days.
import { supabase } from './supabase'

function throwIf(error) {
  if (error) throw new Error(error.message || 'Error de Supabase')
}

// ---- Lecturas ----
export async function fetchAll() {
  const [partners, slas, projects, tasks, holidays, launches, partnerSlas] = await Promise.all([
    supabase.from('partners').select('*').order('name'),
    supabase.from('sla_definitions').select('*').order('sla_days'),
    supabase.from('projects').select('*').order('start_date'),
    supabase.from('tasks').select('*').order('sort_order'),
    supabase.from('holidays').select('*').order('date'),
    supabase.from('project_launches').select('*').order('launch_date'),
    supabase.from('partner_slas').select('*').order('sort_order'),
  ])
  throwIf(partners.error)
  throwIf(slas.error)
  throwIf(projects.error)
  throwIf(tasks.error)
  throwIf(holidays.error)
  throwIf(launches.error)
  throwIf(partnerSlas.error)
  return {
    partners: partners.data ?? [],
    slas: slas.data ?? [],
    projects: projects.data ?? [],
    tasks: tasks.data ?? [],
    holidays: holidays.data ?? [],
    projectLaunches: launches.data ?? [],
    partnerSlas: partnerSlas.data ?? [],
  }
}

// ---- Partner SLAs (referencia por agencia; category/activity/tier/value en texto) ----
function partnerSlaPayload(s) {
  return {
    partner_id: s.partner_id,
    category: s.category?.trim() || null,
    activity: s.activity?.trim() || null,
    tier: s.tier?.trim() || null,
    value: s.value?.trim() || null,
  }
}

export async function createPartnerSla(s, sortOrder) {
  const { data, error } = await supabase
    .from('partner_slas')
    .insert({ ...partnerSlaPayload(s), sort_order: sortOrder ?? 0 })
    .select()
    .single()
  throwIf(error)
  return data
}

export async function updatePartnerSla(id, s) {
  const { data, error } = await supabase
    .from('partner_slas')
    .update(partnerSlaPayload(s))
    .eq('id', id)
    .select()
    .single()
  throwIf(error)
  return data
}

export async function deletePartnerSla(id) {
  const { error } = await supabase.from('partner_slas').delete().eq('id', id)
  throwIf(error)
}

// Reemplaza TODOS los lanzamientos de un proyecto por la lista dada (borra + inserta).
export async function replaceProjectLaunches(projectId, launches) {
  const del = await supabase.from('project_launches').delete().eq('project_id', projectId)
  throwIf(del.error)
  const rows = (launches || [])
    .filter((l) => l.market && String(l.market).trim())
    .map((l) => ({
      project_id: projectId,
      market: l.market,
      launch_date: l.precision === 'tbd' ? null : l.launch_date || null,
      precision: l.precision || 'day',
    }))
  if (rows.length === 0) return []
  const { data, error } = await supabase.from('project_launches').insert(rows).select()
  throwIf(error)
  return data
}

// ---- Projects ----
// region_country (feriados de Purina Región) solo se manda cuando tiene valor,
// para no romper el guardado si la columna todavia no existe en la DB.
export async function createProject(p) {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: p.name,
      brand: p.brand,
      market: p.market,
      ...(p.region_country ? { region_country: p.region_country } : {}),
      start_date: p.start_date,
      market_launch: p.market_launch || null,
      status: p.status || 'En curso',
    })
    .select()
    .single()
  throwIf(error)
  return data
}

export async function updateProject(id, p) {
  const { data, error } = await supabase
    .from('projects')
    .update({
      name: p.name,
      brand: p.brand,
      market: p.market,
      ...(p.region_country ? { region_country: p.region_country } : {}),
      start_date: p.start_date,
      market_launch: p.market_launch || null,
      status: p.status,
    })
    .eq('id', id)
    .select()
    .single()
  throwIf(error)
  return data
}

export async function deleteProject(id) {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  throwIf(error) // ON DELETE CASCADE borra las tasks del proyecto
}

// Archiva o desarchiva un proyecto. No toca el resto de sus campos.
export async function setProjectArchived(id, archived) {
  const { data, error } = await supabase
    .from('projects')
    .update({ archived })
    .eq('id', id)
    .select()
    .single()
  throwIf(error)
  return data
}

// ---- Tasks ----
// Nota: no se escribe planned_end (columna generada).
function taskPayload(t) {
  return {
    project_id: t.project_id,
    partner_id: t.partner_id || null,
    action_name: t.action_name,
    planned_start: t.planned_start,
    planned_days: Number(t.planned_days),
    actual_start: t.actual_start || null,
    actual_end: t.actual_end || null,
    status: t.status || 'Pendiente',
    delay_reason: t.delay_reason || null,
    excluded_holidays: Array.isArray(t.excluded_holidays) ? t.excluded_holidays : [],
    depends_on: Array.isArray(t.depends_on) ? t.depends_on : [],
  }
}

export async function createTask(t, nextSortOrder) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...taskPayload(t), sort_order: nextSortOrder })
    .select()
    .single()
  throwIf(error)
  return data
}

export async function updateTask(id, t) {
  const payload = taskPayload(t)
  if (t.sort_order != null) payload.sort_order = t.sort_order
  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  throwIf(error)
  return data
}

// Actualiza SOLO el orden de una tarea (sin tocar el resto de sus campos).
export async function updateTaskOrder(id, sort_order) {
  const { error } = await supabase.from('tasks').update({ sort_order }).eq('id', id)
  throwIf(error)
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  throwIf(error)
}

// ---- Partners ----
export async function createPartner(p) {
  const { data, error } = await supabase
    .from('partners')
    .insert({ name: p.name, color: p.color, country: p.country || null })
    .select()
    .single()
  throwIf(error)
  return data
}

export async function updatePartner(id, p) {
  const { data, error } = await supabase
    .from('partners')
    .update({ name: p.name, color: p.color, country: p.country || null })
    .eq('id', id)
    .select()
    .single()
  throwIf(error)
  return data
}

export async function deletePartner(id) {
  const { error } = await supabase.from('partners').delete().eq('id', id)
  throwIf(error) // partner_id en tasks es ON DELETE SET NULL
}

// ---- SLA definitions ----
export async function createSla(s) {
  const { data, error } = await supabase
    .from('sla_definitions')
    .insert({ action_name: s.action_name, sla_days: Number(s.sla_days) })
    .select()
    .single()
  throwIf(error)
  return data
}

export async function updateSla(id, s) {
  const { data, error } = await supabase
    .from('sla_definitions')
    .update({ action_name: s.action_name, sla_days: Number(s.sla_days) })
    .eq('id', id)
    .select()
    .single()
  throwIf(error)
  return data
}

export async function deleteSla(id) {
  const { error } = await supabase.from('sla_definitions').delete().eq('id', id)
  throwIf(error)
}

// ---- Holidays (feriados por partner) ----
export async function createHoliday(h) {
  const { data, error } = await supabase
    .from('holidays')
    .insert({ country: h.country, date: h.date, name: h.name || null })
    .select()
    .single()
  throwIf(error)
  return data
}

export async function deleteHoliday(id) {
  const { error } = await supabase.from('holidays').delete().eq('id', id)
  throwIf(error)
}
