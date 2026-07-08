// Capa de datos: todas las lecturas y escrituras contra Supabase.
// IMPORTANTE: planned_end es una columna GENERADA en Postgres.
// Nunca se escribe: en inserts/updates solo mandamos planned_start y planned_days.
import { supabase } from './supabase'

function throwIf(error) {
  if (error) throw new Error(error.message || 'Error de Supabase')
}

// ---- Lecturas ----
export async function fetchAll() {
  const [partners, slas, projects, tasks] = await Promise.all([
    supabase.from('partners').select('*').order('name'),
    supabase.from('sla_definitions').select('*').order('sla_days'),
    supabase.from('projects').select('*').order('start_date'),
    supabase.from('tasks').select('*').order('sort_order'),
  ])
  throwIf(partners.error)
  throwIf(slas.error)
  throwIf(projects.error)
  throwIf(tasks.error)
  return {
    partners: partners.data ?? [],
    slas: slas.data ?? [],
    projects: projects.data ?? [],
    tasks: tasks.data ?? [],
  }
}

// ---- Projects ----
export async function createProject(p) {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: p.name,
      brand: p.brand,
      market: p.market,
      start_date: p.start_date,
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
      start_date: p.start_date,
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

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  throwIf(error)
}

// ---- Partners ----
export async function createPartner(p) {
  const { data, error } = await supabase
    .from('partners')
    .insert({ name: p.name, color: p.color })
    .select()
    .single()
  throwIf(error)
  return data
}

export async function updatePartner(id, p) {
  const { data, error } = await supabase
    .from('partners')
    .update({ name: p.name, color: p.color })
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
