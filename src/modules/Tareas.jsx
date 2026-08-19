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

// Resumen de las tarjetas con un tag, listo para PEGAR EN EL EMAIL YA FORMATEADO:
// se genera en HTML (lista numerada, tema en negrita, la nota en cursiva) y se copia
// al portapapeles como text/html + text/plain, asi Outlook pega el formato y cualquier
// otro lugar recibe el texto plano. Arranca con el saludo del 1:1 (usa el nombre del
// tag) y al pie agrega "STATUS DE PROYECTOS" con una linea por marca (deduplicada,
// solo activos) para completar a mano.
// Devuelve { html, text }.
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
}

function buildTagSummary(tasks, tag, todayISO, projects = []) {
  const oneLine = (s) => String(s || '').replace(/\s*\n\s*/g, ' ').trim()
  const intro = 'Te paso mi status para nuestro 1:1, por favor comentame si hay algún punto que tenés en mente y no esta acá.'
  const header = `RESUMEN ${tag.toUpperCase()} — ${fmtLargo(todayISO)}`
  const rows = tasks
    .filter((t) => ecoTags(t, todayISO).includes(tag))
    // Una tarjeta es TEMA (titulo) + NOTA. La nota puede tener varias lineas: cada una
    // baja como un renglon propio, asi un tema con varios puntos se lee.
    .map((t) => ({
      status: t.status, sort_order: t.sort_order, deadline: t.deadline, checklist: t.checklist,
      topic: oneLine(t.topic),
      note: String(t.notes || '').split('\n').map((l) => l.trim()).filter(Boolean),
    }))
    .filter((t) => t.topic || t.note.length)
    .sort(ecoOrder)

  // Status de proyectos: una linea por marca (deduplicada), activos, para llenar a mano.
  const brands = []
  for (const p of projects) {
    if (p.archived) continue
    const b = (p.brand || p.name || '').trim()
    if (b && !brands.includes(b)) brands.push(b)
  }

  // ---- Texto plano (fallback y mailto, que no acepta HTML) ----
  const parts = [`Hola ${tag}!!`, '', intro, '']
  if (rows.length === 0) {
    parts.push(`${header}`, '', `Sin tareas con contenido para el tag "${tag}".`)
  } else {
    parts.push(header)
    rows.forEach((t, i) => {
      const lines = t.topic ? t.note : t.note.slice(1)
      parts.push(`${i + 1}. ${t.topic || t.note[0]}`)
      for (const l of lines) parts.push(`   ${l}`)
    })
  }
  if (brands.length) {
    parts.push('', 'STATUS DE PROYECTOS')
    for (const b of brands) parts.push(`- ${b}: `)
  }
  parts.push('', 'Saludos,') // la firma de Outlook va despues, a mano
  const text = parts.join('\n')

  // ---- HTML (lo que se pega en el mail) ----
  // Estilos INLINE y etiquetas simples: es lo unico que respetan los clientes de mail.
  const P = 'margin:0 0 10px;'
  const LIST = 'margin:0 0 14px;padding-left:22px;'
  const body = rows.length === 0
    ? `<p style="${P}">Sin tareas con contenido para el tag "${esc(tag)}".</p>`
    : `<ol style="${LIST}">${rows.map((t) => {
      // Sin tema, la primera linea de la nota hace de titulo.
      const title = t.topic || t.note[0]
      const lines = t.topic ? t.note : t.note.slice(1)
      return `<li style="margin:0 0 9px;"><b>${esc(title)}</b>${
        lines.length ? '<br>' + lines.map((l) => esc(l)).join('<br>') : ''}</li>`
    }).join('')}</ol>`
  const projectsBlock = brands.length
    ? `<p style="${P}"><b>STATUS DE PROYECTOS</b></p><ul style="${LIST}">${
      brands.map((b) => `<li style="margin:0 0 4px;"><b>${esc(b)}:</b> </li>`).join('')}</ul>`
    : ''
  const html =
    `<div style="font-family:Aptos,Calibri,Arial,sans-serif;font-size:11pt;color:#000000;">` +
    `<p style="${P}">Hola ${esc(tag)}!!</p>` +
    `<p style="${P}">${esc(intro)}</p>` +
    `<p style="${P}"><b>${esc(header)}</b></p>` +
    body + projectsBlock +
    `<p style="${P}">Saludos,</p></div>`

  return { html, text }
}

// Copia el resumen con FORMATO: text/html para el mail y text/plain de respaldo.
// Si el navegador no soporta ClipboardItem, cae al texto plano.
async function copyRich({ html, text }) {
  try {
    if (window.ClipboardItem && navigator.clipboard?.write) {
      await navigator.clipboard.write([new window.ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      })])
      return true
    }
  } catch { /* sigue al fallback */ }
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
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
    if (!confirm(`Borrar la tarjeta "${t.topic || t.notes || ''}"?`)) return
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
                      onClick={() => { setSumCopied(false); setSummary({ tag: target, ...buildTagSummary(tasks, target, today, projects) }) }}>
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
                            {t.notes && <div className="eco-card-issue">{t.notes}</div>}
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
              <button className="btn btn-primary" onClick={async () => { if (await copyRich(summary)) setSumCopied(true) }}>
                {sumCopied ? <><Check size={15} /> Copiado</> : <><Copy size={15} /> Copiar con formato</>}
              </button>
            </>
          }
        >
          <p className="hint" style={{ marginTop: 0 }}>
            Así se va a ver en el mail. <b>Copiar con formato</b> se pega tal cual en Outlook (negritas y lista incluidas).
            El botón de email abre el borrador en texto plano — el formato solo viaja por el portapapeles.
          </p>
          {/* Contenido generado por nosotros; el texto de las tarjetas va escapado (ver esc). */}
          <div className="eco-summary-html" dangerouslySetInnerHTML={{ __html: summary.html }} />
        </Modal>
      )}
    </>
  )
}
