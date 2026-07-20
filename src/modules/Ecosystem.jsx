import { useEffect, useMemo, useState } from 'react'
import {
  Boxes, RotateCw, Plus, Database, Copy, Check, AlertTriangle, Clock, ListChecks, Tag, FileText, Mail, Trash2, Pencil, User,
} from 'lucide-react'
import {
  ECO_STATUSES, DEFAULT_TAGS, SETUP_SQL, ecoOrder, effectiveDeadline, nextChecklistDeadline,
  fetchEcoTasks, seedEcoTasks, moveEcoTask, deleteEcoTask,
} from '../lib/ecosystemDb'
import { daysBetween, businessDaysBetween, fmtCorto, fmtLargo, toISO } from '../lib/dates'
import Modal from '../components/ui/Modal.jsx'
import EcoTaskModal from '../components/modals/EcoTaskModal.jsx'

// Genera un resumen en texto plano (para pegar en un email) de las tarjetas con un tag,
// agrupadas por estado. Cada tarjeta muestra: titulo (tema), descripcion (problema/situacion),
// accion y nota; los campos vacios no se muestran. Sin prioridad/tags/deadline/checklist.
function buildTagSummary(tasks, tag, todayISO) {
  const oneLine = (s) => String(s || '').replace(/\s*\n\s*/g, ' ').trim()
  const header = `RESUMEN ${tag.toUpperCase()} — ${fmtLargo(todayISO)}`
  const rows = tasks
    .filter((t) => (t.tags || []).includes(tag))
    // titulo = tema, descripcion = problema/situacion, luego accion y nota.
    .map((t) => ({ status: t.status, sort_order: t.sort_order, deadline: t.deadline, checklist: t.checklist,
      fields: [oneLine(t.topic), oneLine(t.issue), oneLine(t.action), oneLine(t.notes)].filter(Boolean) }))
    .filter((t) => t.fields.length > 0)
  if (rows.length === 0) return `${header}\n\nSin tareas con contenido para el tag "${tag}".`
  const parts = [`${header} (${rows.length} tarea${rows.length === 1 ? '' : 's'})`]
  for (const st of ECO_STATUSES) {
    const group = rows.filter((t) => t.status === st).sort(ecoOrder)
    if (!group.length) continue
    parts.push(`\n${st.toUpperCase()} (${group.length})`)
    group.forEach((t, i) => {
      parts.push(`${i + 1}. ${t.fields[0]}`)
      for (const f of t.fields.slice(1)) parts.push(`   ${f}`)
    })
  }
  return parts.join('\n')
}

// Paleta ciclica para los chips de seccion (estable por nombre).
const SECTION_PALETTE = ['#2e6fd0', '#0f766e', '#b45309', '#7c3aed', '#be123c', '#0369a1', '#4d7c0f', '#9333ea', '#0891b2', '#c2410c']
function sectionColor(name) {
  if (!name) return '#64748b'
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return SECTION_PALETTE[h % SECTION_PALETTE.length]
}

// Color del responsable (personas y agencias conocidas; resto neutro).
const OWNER_COLORS = { Ivan: '#7c3aed', Gaby: '#db2777', F5: '#1e6fd0', Hive: '#c8811a', NBS: '#0f766e', BNN: '#2563eb', MSE: '#0d9488' }
function ownerColor(owner) {
  if (!owner) return '#64748b'
  return OWNER_COLORS[owner.trim()] || '#64748b'
}

// Tono de una fecha relativa a hoy (dias habiles): vencida / se acerca / neutra.
function dateTone(iso, today) {
  if (!iso) return null
  if (daysBetween(today, iso) < 0) return 'overdue'
  if (businessDaysBetween(today, iso, null) <= 3) return 'soon'
  return null
}

// Tono de la tarjeta segun su deadline EFECTIVO (propio + checklist pendiente).
// Las 'Done' nunca se pintan.
function cardTone(t, today) {
  if (t.status === 'Done') return null
  return dateTone(effectiveDeadline(t), today)
}

const COLUMN_HINT = {
  Open: 'Por hacer',
  'In Progress': 'En curso',
  'On Hold': 'Frenado / esperando',
  Done: 'Hecho',
}

export default function Ecosystem() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tableMissing, setTableMissing] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState(() => localStorage.getItem('wmh_eco_filter') || '__all__')
  const [tagFilter, setTagFilter] = useState(() => localStorage.getItem('wmh_eco_tag') || '__all__')
  const [modal, setModal] = useState(null) // { task? , status? }
  const [summary, setSummary] = useState(null) // { tag, text }
  const [sumCopied, setSumCopied] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)

  const today = toISO(new Date())

  async function load() {
    setLoading(true)
    const { data, error, tableMissing } = await fetchEcoTasks()
    setTasks(data)
    setError(tableMissing ? null : error?.message || null)
    setTableMissing(tableMissing)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const sections = useMemo(
    () => [...new Set(tasks.map((t) => t.section).filter(Boolean))].sort(),
    [tasks]
  )
  const owners = useMemo(
    () => [...new Set(tasks.map((t) => t.owner).filter(Boolean))].sort(),
    [tasks]
  )
  // Tags en uso + los sugeridos por defecto (ej. Helo).
  const allTags = useMemo(
    () => [...new Set([...DEFAULT_TAGS, ...tasks.flatMap((t) => t.tags || [])])].sort(),
    [tasks]
  )
  useEffect(() => { localStorage.setItem('wmh_eco_filter', filter) }, [filter])
  useEffect(() => { localStorage.setItem('wmh_eco_tag', tagFilter) }, [tagFilter])
  // Si la seccion/tag guardado ya no existe, caemos a "Todas".
  const activeFilter = filter !== '__all__' && !sections.includes(filter) ? '__all__' : filter
  const activeTag = tagFilter !== '__all__' && !allTags.includes(tagFilter) ? '__all__' : tagFilter
  const visible = useMemo(
    () => tasks.filter((t) =>
      (activeFilter === '__all__' || t.section === activeFilter) &&
      (activeTag === '__all__' || (t.tags || []).includes(activeTag))
    ),
    [tasks, activeFilter, activeTag]
  )
  const byStatus = useMemo(() => {
    const m = Object.fromEntries(ECO_STATUSES.map((s) => [s, []]))
    for (const t of visible) (m[t.status] || (m[t.status] = [])).push(t)
    // Orden: deadline predomina, luego prioridad (alta>media>baja).
    for (const s of ECO_STATUSES) m[s].sort(ecoOrder)
    return m
  }, [visible])

  async function handleSeed() {
    setSeeding(true)
    try { await seedEcoTasks(); await load() }
    catch (e) { setError(e.message) }
    finally { setSeeding(false) }
  }

  async function onDrop(status) {
    setOverCol(null)
    const id = dragId
    setDragId(null)
    if (!id) return
    const t = tasks.find((x) => x.id === id)
    if (!t || t.status === status) return
    const maxSort = (byStatus[status] || []).reduce((m, x) => Math.max(m, x.sort_order || 0), 0)
    // Optimista: muevo en memoria y persisto.
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, status, sort_order: maxSort + 1 } : x)))
    try { await moveEcoTask(id, status, maxSort + 1) }
    catch (e) { setError(e.message); load() }
  }

  async function handleDelete(t) {
    if (!confirm(`Borrar la tarjeta "${t.topic || t.issue || ''}"?`)) return
    try { await deleteEcoTask(t.id); await load() }
    catch (e) { setError(e.message) }
  }

  function copySql() {
    navigator.clipboard?.writeText(SETUP_SQL)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const nextSort = tasks.reduce((m, t) => Math.max(m, t.sort_order || 0), 0) + 1

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Ecosystem 2.0</h1>
          <div className="sub">Coordinacion de la migracion — tablero Kanban</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-icon" title="Recargar" onClick={load}><RotateCw size={16} /></button>
          {!tableMissing && (
            <button className="btn btn-primary" onClick={() => setModal({ status: 'Open' })}>
              <Plus size={16} /> Nueva tarjeta
            </button>
          )}
        </div>
      </div>

      <div className="content">
        {loading ? (
          <div className="center-state"><div className="spinner" /><div>Cargando tablero...</div></div>
        ) : tableMissing ? (
          <div className="eco-setup">
            <div className="eco-setup-head"><Database size={18} /> Falta crear la tabla del tablero</div>
            <p>
              Corre este SQL una vez en el <b>SQL Editor</b> de Supabase (proyecto Purina-Hub). Crea la tabla
              con RLS abierta, igual que el resto. Despues volve aca y recarga.
            </p>
            <pre className="eco-sql">{SETUP_SQL}</pre>
            <div className="eco-setup-actions">
              <button className="btn" onClick={copySql}>
                {copied ? <><Check size={15} /> Copiado</> : <><Copy size={15} /> Copiar SQL</>}
              </button>
              <button className="btn btn-primary" onClick={load}><RotateCw size={15} /> Ya lo cree, recargar</button>
            </div>
          </div>
        ) : (
          <>
            {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

            <div className="eco-toolbar">
              <div className="eco-filter">
                <button className={`chip${activeFilter === '__all__' ? ' active' : ''}`} onClick={() => setFilter('__all__')}>
                  Todas <span className="chip-count">{tasks.length}</span>
                </button>
                {sections.map((s) => (
                  <button
                    key={s}
                    className={`chip${activeFilter === s ? ' active' : ''}`}
                    style={activeFilter === s ? { background: sectionColor(s), borderColor: sectionColor(s), color: '#fff' } : { borderColor: sectionColor(s) }}
                    onClick={() => setFilter(s)}
                  >
                    <span className="chip-dot" style={{ background: sectionColor(s) }} />
                    {s} <span className="chip-count">{tasks.filter((t) => t.section === s).length}</span>
                  </button>
                ))}
              </div>
              <div className="eco-legend">
                <span className="eco-lg"><span className="eco-lg-sw overdue" /> Vencida</span>
                <span className="eco-lg"><span className="eco-lg-sw soon" /> Se acerca (≤3d)</span>
              </div>
            </div>

            {tasks.some((t) => (t.tags || []).length > 0) && (
              <div className="eco-tagbar">
                <span className="eco-tagbar-lbl"><Tag size={13} /> Tags:</span>
                <button className={`chip${activeTag === '__all__' ? ' active' : ''}`} onClick={() => setTagFilter('__all__')}>Todos</button>
                {[...new Set(tasks.flatMap((t) => t.tags || []))].sort().map((tg) => (
                  <button key={tg} className={`chip${activeTag === tg ? ' active' : ''}`} onClick={() => setTagFilter(tg)}>
                    {tg} <span className="chip-count">{tasks.filter((t) => (t.tags || []).includes(tg)).length}</span>
                  </button>
                ))}
                {(() => {
                  const target = activeTag === '__all__' ? 'Helo' : activeTag
                  return (
                    <button className="btn btn-sm" style={{ marginLeft: 4 }}
                      onClick={() => { setSumCopied(false); setSummary({ tag: target, text: buildTagSummary(tasks, target, today) }) }}>
                      <FileText size={14} /> Resumen {target}
                    </button>
                  )
                })()}
              </div>
            )}

            {tasks.length === 0 ? (
              <div className="eco-empty">
                <Boxes size={26} />
                <h3>Tablero vacio</h3>
                <p>Podes cargar las 24 tareas de la migracion MX para arrancar, o crear tarjetas a mano.</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={handleSeed} disabled={seeding}>
                    <Database size={15} /> {seeding ? 'Cargando...' : 'Cargar las 24 tareas iniciales'}
                  </button>
                  <button className="btn" onClick={() => setModal({ status: 'Open' })}><Plus size={15} /> Crear a mano</button>
                </div>
              </div>
            ) : (
              <div className="eco-board">
                {ECO_STATUSES.map((status) => (
                  <div
                    key={status}
                    className={`eco-col${overCol === status ? ' over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setOverCol(status) }}
                    onDragLeave={(e) => { if (e.currentTarget === e.target) setOverCol(null) }}
                    onDrop={() => onDrop(status)}
                  >
                    <div className="eco-col-head">
                      <span className={`eco-col-dot s-${status.replace(/\s/g, '')}`} />
                      <span className="eco-col-title">{status}</span>
                      <span className="eco-col-hint">{COLUMN_HINT[status]}</span>
                      <span className="eco-col-count">{byStatus[status].length}</span>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Agregar aca" onClick={() => setModal({ status })}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="eco-col-body">
                      {byStatus[status].map((t) => {
                        const tone = cardTone(t, today)
                        const done = t.checklist?.filter((c) => c.done).length || 0
                        const total = t.checklist?.length || 0
                        const clDl = nextChecklistDeadline(t)
                        return (
                          <div
                            key={t.id}
                            className={`eco-card${tone ? ' ' + tone : ''}${dragId === t.id ? ' dragging' : ''}`}
                            draggable
                            onDragStart={() => setDragId(t.id)}
                            onDragEnd={() => { setDragId(null); setOverCol(null) }}
                            onClick={() => setModal({ task: t })}
                          >
                            {t.section && (
                              <span className="eco-card-sec" style={{ background: sectionColor(t.section) }}>{t.section}</span>
                            )}
                            {t.topic && <div className="eco-card-topic">{t.topic}</div>}
                            {t.issue && <div className="eco-card-issue">{t.issue}</div>}
                            {(t.tags || []).length > 0 && (
                              <div className="eco-card-tags">
                                {t.tags.map((tg) => <span key={tg} className="eco-tag sm"><Tag size={9} /> {tg}</span>)}
                              </div>
                            )}
                            <div className="eco-card-foot">
                              {t.priority && (
                                <span className={`eco-prio p-${t.priority}`} title={`Prioridad ${t.priority}`}>
                                  {t.priority === 'alta' ? 'Alta' : t.priority === 'baja' ? 'Baja' : 'Media'}
                                </span>
                              )}
                              {t.owner && (
                                <span className="eco-owner" title={t.owner}>
                                  <span className="eco-owner-dot" style={{ background: ownerColor(t.owner) }} />
                                  {t.owner}
                                </span>
                              )}
                              {t.deadline && (
                                <span className={`eco-dl${dateTone(t.deadline, today) ? ' ' + dateTone(t.deadline, today) : ''}`} title="Deadline de la tarjeta">
                                  <Clock size={11} /> {fmtCorto(t.deadline)}
                                </span>
                              )}
                              {clDl && (
                                <span className={`eco-dl cl${dateTone(clDl, today) ? ' ' + dateTone(clDl, today) : ''}`} title="Deadline mas cercana del checklist">
                                  <ListChecks size={11} /> {fmtCorto(clDl)}
                                </span>
                              )}
                              {total > 0 && (
                                <span className={`eco-prog${done === total ? ' full' : ''}`}>{done}/{total}</span>
                              )}
                              <span className="eco-card-actions">
                                <button className="btn btn-ghost btn-icon btn-sm" title="Editar" onClick={(e) => { e.stopPropagation(); setModal({ task: t }) }}><Pencil size={12} /></button>
                                <button className="btn btn-ghost btn-icon btn-sm" title="Borrar" onClick={(e) => { e.stopPropagation(); handleDelete(t) }}><Trash2 size={12} /></button>
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      {byStatus[status].length === 0 && <div className="eco-col-empty">Vacio</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {modal && (
        <EcoTaskModal
          task={modal.task}
          defaultStatus={modal.status}
          sections={sections}
          owners={owners.length ? owners : ['Ivan', 'Gaby', 'F5', 'Hive', 'NBS']}
          allTags={allTags}
          nextSort={nextSort}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}

      {summary && (
        <Modal
          title={`Resumen ${summary.tag}`}
          icon={<FileText size={18} color="var(--purina)" />}
          onClose={() => setSummary(null)}
          wide
          footer={
            <>
              <a
                className="btn"
                href={`mailto:?subject=${encodeURIComponent(`Resumen ${summary.tag} — ${fmtLargo(today)}`)}&body=${encodeURIComponent(summary.text)}`}
              >
                <Mail size={15} /> Abrir email
              </a>
              <button className="btn btn-primary" onClick={() => { navigator.clipboard?.writeText(summary.text); setSumCopied(true) }}>
                {sumCopied ? <><Check size={15} /> Copiado</> : <><Copy size={15} /> Copiar</>}
              </button>
            </>
          }
        >
          <p className="hint" style={{ marginTop: 0 }}>
            Lista lista para pegar en el email semanal. Copiala o abrila directamente en tu cliente de correo.
          </p>
          <textarea className="control eco-summary" readOnly rows={18} value={summary.text} onFocus={(e) => e.target.select()} />
        </Modal>
      )}
    </>
  )
}
