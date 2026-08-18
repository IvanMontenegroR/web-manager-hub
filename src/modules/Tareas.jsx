import { useEffect, useMemo, useState } from 'react'
import {
  Boxes, RotateCw, Plus, Database, Copy, Check, AlertTriangle, Clock, ListChecks, Tag, FileText, Mail, Trash2, Pencil, User,
} from 'lucide-react'
import {
  ECO_STATUSES, ECO_MARKETS, ECO_MARKET_LABEL, ECO_TOPICS, DEFAULT_MARKET, DEFAULT_TAGS,
  FOLLOW_UP_TAG, SETUP_SQL, ecoOrder, ecoTags, effectiveDeadline, isFollowUp, nextChecklistDeadline,
  fetchEcoTasks, seedEcoTasks, moveEcoTask, deleteEcoTask,
} from '../lib/ecosystemDb'
import { daysBetween, businessDaysBetween, fmtCorto, fmtLargo, toISO } from '../lib/dates'
import { useData } from '../context/DataContext.jsx'
import Modal from '../components/ui/Modal.jsx'
import EcoTaskModal from '../components/modals/EcoTaskModal.jsx'

// Genera un resumen en texto plano (para pegar en un email) de las tarjetas con un tag.
// Arranca con un saludo para el 1:1 (usa el nombre del tag). Cada tarjeta muestra solo el
// nombre (tema) y la accion a tomar; sin agrupar por estado. Al pie agrega un bloque
// "STATUS DE PROYECTOS" con los proyectos (deduplicados por marca, una sola linea por marca
// aunque haya varios mercados) para completar el status a mano.
function buildTagSummary(tasks, tag, todayISO, projects = []) {
  const oneLine = (s) => String(s || '').replace(/\s*\n\s*/g, ' ').trim()
  const greeting = `Hola ${tag}!!\n\nTe paso mi status para nuestro 1:1, por favor comentame si hay algún punto que tenés en mente y no esta acá.`
  const header = `RESUMEN ${tag.toUpperCase()} — ${fmtLargo(todayISO)}`
  const rows = tasks
    .filter((t) => ecoTags(t, todayISO).includes(tag))
    // nombre = tema, y la accion a tomar; nada mas.
    .map((t) => ({ status: t.status, sort_order: t.sort_order, deadline: t.deadline, checklist: t.checklist,
      fields: [oneLine(t.topic), oneLine(t.action)].filter(Boolean) }))
    .filter((t) => t.fields.length > 0)
    .sort(ecoOrder)

  const parts = [greeting, '']
  if (rows.length === 0) {
    parts.push(`${header}\n\nSin tareas con contenido para el tag "${tag}".`)
  } else {
    parts.push(header)
    rows.forEach((t, i) => {
      parts.push(`${i + 1}. ${t.fields[0]}`)
      for (const f of t.fields.slice(1)) parts.push(`   ${f}`)
    })
  }

  // Status de proyectos: una linea por marca (deduplicada), activos, para llenar a mano.
  const brands = []
  for (const p of projects) {
    if (p.archived) continue
    const b = (p.brand || p.name || '').trim()
    if (b && !brands.includes(b)) brands.push(b)
  }
  if (brands.length) {
    parts.push('\nSTATUS DE PROYECTOS')
    for (const b of brands) parts.push(`- ${b}: `)
  }

  // Cierre. La firma de Outlook va despues, a mano.
  parts.push('\nSaludos,')

  return parts.join('\n')
}

// Color fijo por topic (la lista es cerrada). Si aparece uno viejo/desconocido, cae a
// una paleta ciclica estable por nombre para que igual se distinga.
const TOPIC_COLORS = { Web: '#2e6fd0', CIAM: '#7c3aed', 'Buy Now': '#0f766e', CRM: '#c2410c', Proceso: '#b45309' }
const TOPIC_PALETTE = ['#2e6fd0', '#0f766e', '#b45309', '#7c3aed', '#be123c', '#0369a1', '#4d7c0f', '#9333ea', '#0891b2', '#c2410c']
function topicColor(name) {
  if (!name) return '#64748b'
  if (TOPIC_COLORS[name]) return TOPIC_COLORS[name]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return TOPIC_PALETTE[h % TOPIC_PALETTE.length]
}

// Color por mercado (para el badge de la tarjeta cuando se ven todos juntos).
const MARKET_COLORS = { MX: '#0f766e', BR: '#15803d', CAM: '#0369a1', General: '#64748b' }
function marketColor(m) { return MARKET_COLORS[m] || '#64748b' }

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
// Las 'Done' nunca se pintan. Amarillo tambien cuando toca hacer follow-up (mitad
// del camino hacia el deadline), aunque falten mas de 3 dias.
function cardTone(t, today) {
  if (t.status === 'Done') return null
  return dateTone(effectiveDeadline(t), today) || (isFollowUp(t, today) ? 'soon' : null)
}

const COLUMN_HINT = {
  Open: 'Por hacer',
  'In Progress': 'En curso',
  'On Hold': 'Frenado / esperando',
  Done: 'Hecho',
}

export default function Tareas() {
  const { projects } = useData()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tableMissing, setTableMissing] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [copied, setCopied] = useState(false)
  const [market, setMarket] = useState(() => localStorage.getItem('wmh_eco_market') || '__all__')
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

  // Mercados: la lista fija + cualquier valor viejo que todavia viva en la DB.
  const markets = useMemo(
    () => [...ECO_MARKETS, ...new Set(tasks.map((t) => t.market).filter((m) => m && !ECO_MARKETS.includes(m)))],
    [tasks]
  )
  // Topics: la lista cerrada + los que sigan en uso aunque no esten en la lista.
  const topics = useMemo(
    () => [...ECO_TOPICS, ...new Set(tasks.map((t) => t.section).filter((s) => s && !ECO_TOPICS.includes(s)))],
    [tasks]
  )
  const owners = useMemo(
    () => [...new Set(tasks.map((t) => t.owner).filter(Boolean))].sort(),
    [tasks]
  )
  // Tags en uso (incluye el virtual Follow-up) + los sugeridos por defecto (ej. Helo).
  const allTags = useMemo(
    () => [...new Set([...DEFAULT_TAGS, ...tasks.flatMap((t) => ecoTags(t, today))])].sort(),
    [tasks, today]
  )
  useEffect(() => { localStorage.setItem('wmh_eco_market', market) }, [market])
  useEffect(() => { localStorage.setItem('wmh_eco_filter', filter) }, [filter])
  useEffect(() => { localStorage.setItem('wmh_eco_tag', tagFilter) }, [tagFilter])
  // Si el mercado/topic/tag guardado ya no existe, caemos a "Todos".
  const activeMarket = market !== '__all__' && !markets.includes(market) ? '__all__' : market
  const activeFilter = filter !== '__all__' && !topics.includes(filter) ? '__all__' : filter
  const activeTag = tagFilter !== '__all__' && !allTags.includes(tagFilter) ? '__all__' : tagFilter
  // El mercado manda: los contadores de topic y los tags se leen dentro del mercado activo.
  const inMarket = useMemo(
    () => tasks.filter((t) => activeMarket === '__all__' || (t.market || DEFAULT_MARKET) === activeMarket),
    [tasks, activeMarket]
  )
  const visible = useMemo(
    () => inMarket.filter((t) =>
      (activeFilter === '__all__' || t.section === activeFilter) &&
      (activeTag === '__all__' || ecoTags(t, today).includes(activeTag))
    ),
    [inMarket, activeFilter, activeTag, today]
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
          <h1>Tareas</h1>
          <div className="sub">Tablero Kanban de coordinacion — incluye tareas de Ecosystem 2.0</div>
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

            {/* Eje 1: MERCADO. Es el filtro principal del tablero. */}
            <div className="eco-markets">
              <button className={`eco-mk${activeMarket === '__all__' ? ' active' : ''}`} onClick={() => setMarket('__all__')}>
                Todos <span className="chip-count">{tasks.length}</span>
              </button>
              {markets.map((m) => (
                <button
                  key={m}
                  className={`eco-mk${activeMarket === m ? ' active' : ''}`}
                  style={activeMarket === m ? { background: marketColor(m), borderColor: marketColor(m) } : null}
                  onClick={() => setMarket(m)}
                >
                  {ECO_MARKET_LABEL[m] || m}
                  <span className="chip-count">{tasks.filter((t) => (t.market || DEFAULT_MARKET) === m).length}</span>
                </button>
              ))}
            </div>

            {/* Eje 2: TOPIC, dentro del mercado activo. */}
            <div className="eco-toolbar">
              <div className="eco-filter">
                <button className={`chip${activeFilter === '__all__' ? ' active' : ''}`} onClick={() => setFilter('__all__')}>
                  Todos <span className="chip-count">{inMarket.length}</span>
                </button>
                {topics.map((s) => (
                  <button
                    key={s}
                    className={`chip${activeFilter === s ? ' active' : ''}`}
                    style={activeFilter === s ? { background: topicColor(s), borderColor: topicColor(s), color: '#fff' } : { borderColor: topicColor(s) }}
                    onClick={() => setFilter(s)}
                  >
                    <span className="chip-dot" style={{ background: topicColor(s) }} />
                    {s} <span className="chip-count">{inMarket.filter((t) => t.section === s).length}</span>
                  </button>
                ))}
              </div>
              <div className="eco-legend">
                <span className="eco-lg"><span className="eco-lg-sw overdue" /> Vencida</span>
                <span className="eco-lg"><span className="eco-lg-sw soon" /> Se acerca / follow-up</span>
              </div>
            </div>

            {inMarket.some((t) => ecoTags(t, today).length > 0) && (
              <div className="eco-tagbar">
                <span className="eco-tagbar-lbl"><Tag size={13} /> Tags:</span>
                <button className={`chip${activeTag === '__all__' ? ' active' : ''}`} onClick={() => setTagFilter('__all__')}>Todos</button>
                {[...new Set(inMarket.flatMap((t) => ecoTags(t, today)))].sort().map((tg) => (
                  <button key={tg} className={`chip${activeTag === tg ? ' active' : ''}`} onClick={() => setTagFilter(tg)}>
                    {tg} <span className="chip-count">{inMarket.filter((t) => ecoTags(t, today).includes(tg)).length}</span>
                  </button>
                ))}
                {(() => {
                  const target = activeTag === '__all__' ? 'Helo' : activeTag
                  return (
                    <button className="btn btn-sm" style={{ marginLeft: 4 }}
                      onClick={() => { setSumCopied(false); setSummary({ tag: target, text: buildTagSummary(tasks, target, today, projects) }) }}>
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
                        const cardTags = ecoTags(t, today)
                        return (
                          <div
                            key={t.id}
                            className={`eco-card${tone ? ' ' + tone : ''}${dragId === t.id ? ' dragging' : ''}`}
                            draggable
                            onDragStart={() => setDragId(t.id)}
                            onDragEnd={() => { setDragId(null); setOverCol(null) }}
                            onClick={() => setModal({ task: t })}
                          >
                            <div className="eco-card-badges">
                              {/* El mercado solo hace falta cuando se ven todos juntos. */}
                              {activeMarket === '__all__' && (
                                <span className="eco-card-mk" style={{ background: marketColor(t.market || DEFAULT_MARKET) }}>
                                  {t.market || DEFAULT_MARKET}
                                </span>
                              )}
                              {t.section && (
                                <span className="eco-card-sec" style={{ background: topicColor(t.section) }}>{t.section}</span>
                              )}
                            </div>
                            {t.topic && <div className="eco-card-topic">{t.topic}</div>}
                            {t.issue && <div className="eco-card-issue">{t.issue}</div>}
                            {cardTags.length > 0 && (
                              <div className="eco-card-tags">
                                {cardTags.map((tg) => (
                                  <span key={tg} className={`eco-tag sm${tg === FOLLOW_UP_TAG ? ' fu' : ''}`}><Tag size={9} /> {tg}</span>
                                ))}
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
          defaultMarket={activeMarket === '__all__' ? DEFAULT_MARKET : activeMarket}
          topics={topics}
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
                href={`mailto:?subject=${encodeURIComponent(`1:1 Status Websites — ${fmtLargo(today)}`)}&body=${encodeURIComponent(summary.text)}`}
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
