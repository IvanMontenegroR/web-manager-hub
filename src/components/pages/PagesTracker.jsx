import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, Plus, Database, FileStack, ChevronUp, ChevronDown, ChevronRight, Pencil, Copy, Check, Layers, FolderOpen,
} from 'lucide-react'
import {
  fetchPages, seedPages, setPageStatus, persistPageOrder, clonePage, pageSubcategory,
  PAGE_STATUSES, PAGE_STATUS_LABEL, PAGE_MARKETS, PAGE_MARKET_LABEL, SETUP_SQL,
} from '../../lib/pagesDb'
import PageModal from './PageModal.jsx'

// Grupos plegados del tracker (categorias y subcategorias), persistidos.
const COLLAPSE_KEY = 'wmh_pages_collapsed'
function readCollapsed() {
  try { return new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '[]')) } catch { return new Set() }
}

// Clase de color por estado (para el pill).
const STATUS_CLASS = {
  'Not started': 'ns', 'Filling Matrix': 'fm', 'Complete (outliers)': 'co',
  'In progress': 'ip', 'On hold': 'oh', Done: 'dn',
}

function SetupBlock() {
  const [copied, setCopied] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(SETUP_SQL); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {} }
  return (
    <div className="dir-setup">
      <div className="dir-setup-head">
        <Database size={18} color="var(--purina)" />
        <div>
          <h3>Falta crear las tablas de paginas</h3>
          <p>Corré este SQL una vez en el editor de Supabase (proyecto Purina-Hub) y recargá.</p>
        </div>
        <button className="btn btn-sm" onClick={copy} style={{ marginLeft: 'auto' }}>
          {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
        </button>
      </div>
      <pre className="dir-setup-sql">{SETUP_SQL}</pre>
    </div>
  )
}

export default function PagesTracker({ onBack, onOpenBuilder }) {
  const [rows, setRows] = useState([])
  const [state, setState] = useState('loading') // loading | ok | missing | error
  const [errMsg, setErrMsg] = useState(null)
  const [modal, setModal] = useState(null)
  const [busyId, setBusyId] = useState(null) // pagina clonandose
  // Mercado activo (pestaña). Se recuerda entre sesiones.
  const [market, setMarket] = useState(() => localStorage.getItem('wmh_pages_market') || PAGE_MARKETS[0].code)
  useEffect(() => { localStorage.setItem('wmh_pages_market', market) }, [market])

  // Grupos plegados. Se guarda lo COLAPSADO (no lo abierto): asi una categoria nueva
  // aparece siempre desplegada. La key lleva el mercado, para que plegar en MX no
  // pliegue lo mismo en BR.
  const [collapsed, setCollapsed] = useState(readCollapsed)
  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...collapsed])) } catch {}
  }, [collapsed])
  const toggle = (key) => setCollapsed((s) => {
    const next = new Set(s)
    if (next.has(key)) next.delete(key); else next.add(key)
    return next
  })

  async function load() {
    setState('loading')
    const { data, error, tableMissing } = await fetchPages()
    if (tableMissing) return setState('missing')
    if (error) { setErrMsg(error.message); return setState('error') }
    setRows(data); setState('ok')
  }
  useEffect(() => { load() }, [])

  const nextSort = useMemo(() => rows.reduce((m, r) => Math.max(m, r.sort_order || 0), 0) + 1, [rows])
  // Paginas del mercado activo. Las que no tienen mercado caen en el primero, para que
  // nunca queden invisibles si les falta el dato.
  const marketOf = (p) => p.market || PAGE_MARKETS[0].code
  const visible = useMemo(() => rows.filter((r) => marketOf(r) === market), [rows, market])
  // Cantidad de paginas por mercado (para el badge de cada pestaña).
  const byMarket = useMemo(() => {
    const m = {}
    for (const r of rows) { const k = marketOf(r); m[k] = (m[k] || 0) + 1 }
    return m
  }, [rows])
  const counts = useMemo(() => {
    const c = Object.fromEntries(PAGE_STATUSES.map((s) => [s, 0]))
    for (const r of visible) if (c[r.status] != null) c[r.status]++
    return c
  }, [visible])

  // Agrupado por categoria y, dentro de "Marca", por marca (la subcategoria). Las
  // paginas SIN categoria (ej. la Home) van sueltas arriba de todo. Cada grupo aparece
  // en el orden en que aparece su primera pagina, asi el orden manual sigue mandando.
  const groups = useMemo(() => {
    const out = []
    const byCat = new Map()
    for (const p of visible) {
      const cat = p.category || null
      if (!byCat.has(cat)) { const g = { cat, subs: [], bySub: new Map() }; byCat.set(cat, g); out.push(g) }
      const g = byCat.get(cat)
      const sub = pageSubcategory(p)
      if (!g.bySub.has(sub)) { const s = { sub, items: [] }; g.bySub.set(sub, s); g.subs.push(s) }
      g.bySub.get(sub).items.push(p)
    }
    return out
  }, [visible])

  // Reordenar (optimista): mueve la pagina dentro de SU grupo (la prioridad se lee por
  // grupo). El swap se hace sobre la lista completa para no alterar el orden de los
  // otros mercados ni de las otras categorias, y despues se persiste todo.
  async function move(items, i, dir) {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const a = rows.findIndex((r) => r.id === items[i].id)
    const b = rows.findIndex((r) => r.id === items[j].id)
    if (a < 0 || b < 0) return
    const next = rows.slice()
    ;[next[a], next[b]] = [next[b], next[a]]
    setRows(next)
    try { await persistPageOrder(next) } catch (e) { setErrMsg(e.message); load() }
  }

  async function changeStatus(id, status) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))
    try { await setPageStatus(id, status) } catch (e) { setErrMsg(e.message); load() }
  }

  // Clona una pagina (metadata + todos sus componentes) y recarga la lista.
  async function clone(p) {
    setBusyId(p.id); setErrMsg(null)
    try { await clonePage(p, nextSort); await load() }
    catch (e) { setErrMsg(e.message) }
    finally { setBusyId(null) }
  }

  if (state === 'loading') return <div className="content"><div className="center-state"><div className="spinner" /><div>Cargando...</div></div></div>
  if (state === 'missing') return <div className="content"><TrackerHead onBack={onBack} /><SetupBlock /></div>
  if (state === 'error') return <div className="content"><TrackerHead onBack={onBack} /><div className="center-state"><div style={{ color: 'var(--danger)', fontWeight: 600 }}>No se pudo cargar</div><div style={{ fontSize: 13 }}>{errMsg}</div><button className="btn" onClick={load}>Reintentar</button></div></div>

  return (
    <div className="content">
      <div className="pages-top">
        <button className="btn btn-sm" onClick={onBack}><ArrowLeft size={14} /> Ecosystem 2.0</button>
        <div className="pages-counts">
          {PAGE_STATUSES.map((s) => (
            <span key={s} className={`pg-count ${STATUS_CLASS[s]}`}>{PAGE_STATUS_LABEL[s]} <b>{counts[s]}</b></span>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setModal({})}>
          <Plus size={15} /> Nueva pagina
        </button>
      </div>

      {/* Una pestaña por mercado: las paginas se arman y se listan por separado. */}
      <div className="pages-markets">
        {PAGE_MARKETS.map((m) => (
          <button
            key={m.code}
            className={`pages-market${market === m.code ? ' active' : ''}`}
            onClick={() => setMarket(m.code)}
          >
            {m.label} <span className="pages-market-n">{byMarket[m.code] || 0}</span>
          </button>
        ))}
      </div>

      {errMsg && <div className="form-error" style={{ margin: '0 0 10px' }}>{errMsg}</div>}

      {visible.length === 0 ? (
        <div className="dir-empty">
          <FileStack size={26} />
          <div className="dir-empty-t">Sin paginas en {PAGE_MARKET_LABEL[market] || market}</div>
          <p>Cargá la Homepage para arrancar (el resto de la lista la sumás cuando la tengas), o creá a mano.</p>
          <div className="dir-empty-actions">
            <button className="btn btn-primary" onClick={async () => { await seedPages(market); load() }}><Database size={15} /> Cargar Homepage</button>
            <button className="btn" onClick={() => setModal({})}><Plus size={15} /> Crear a mano</button>
          </div>
        </div>
      ) : (
        <div className="pages-list">
          {groups.map((g) => {
            const catKey = `${market}|${g.cat}`
            const catOpen = !g.cat || !collapsed.has(catKey)
            return (
            <div key={g.cat || '__none__'} className="pages-group">
              {g.cat && (
                <button className={`pages-cat${catOpen ? '' : ' closed'}`} onClick={() => toggle(catKey)} title={catOpen ? 'Plegar' : 'Desplegar'}>
                  {catOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <FolderOpen size={14} /> {g.cat}
                  <span className="pages-cat-n">{g.subs.reduce((n, s) => n + s.items.length, 0)}</span>
                </button>
              )}
              {catOpen && g.subs.map((s) => {
                const subKey = `${market}|${g.cat}|${s.sub}`
                const subOpen = !s.sub || !collapsed.has(subKey)
                return (
                <div key={s.sub || '__nosub__'} className="pages-sub">
                  {/* La subcategoria hoy existe solo en "Marca" y es la marca de la pagina. */}
                  {s.sub && (
                    <button className={`pages-subcat${subOpen ? '' : ' closed'}`} onClick={() => toggle(subKey)} title={subOpen ? 'Plegar' : 'Desplegar'}>
                      {subOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      {s.sub} <span className="pages-cat-n">{s.items.length}</span>
                    </button>
                  )}
                  {subOpen && s.items.map((p, i) => (
                    <div key={p.id} className="page-row">
                      <div className="page-reorder">
                        <button className="ic-btn" disabled={i === 0} onClick={() => move(s.items, i, -1)} title="Subir"><ChevronUp size={15} /></button>
                        <button className="ic-btn" disabled={i === s.items.length - 1} onClick={() => move(s.items, i, 1)} title="Bajar"><ChevronDown size={15} /></button>
                      </div>
                      <div className="page-idx">{i + 1}</div>
                      <div className="page-main" onClick={() => onOpenBuilder?.(p)} title="Abrir el builder">
                        <div className="page-name">{p.name}</div>
                        {p.path && <div className="page-path">{p.path}</div>}
                        {p.notes && <div className="page-notes">{p.notes}</div>}
                      </div>
                      <button className="btn btn-sm page-build" onClick={() => onOpenBuilder?.(p)}><Layers size={13} /> Armar</button>
                      <select
                        className={`page-status ${STATUS_CLASS[p.status]}`}
                        value={p.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => changeStatus(p.id, e.target.value)}
                      >
                        {PAGE_STATUSES.map((st) => <option key={st} value={st}>{PAGE_STATUS_LABEL[st]}</option>)}
                      </select>
                      <button className="ic-btn page-clone" disabled={busyId === p.id} onClick={() => clone(p)} title="Clonar pagina (copia con sus componentes)"><Copy size={14} /></button>
                      <button className="ic-btn page-edit" onClick={() => setModal(p)} title="Editar"><Pencil size={14} /></button>
                    </div>
                  ))}
                </div>
                )
              })}
            </div>
            )
          })}
        </div>
      )}

      {modal && (
        <PageModal item={modal.id ? modal : undefined} nextSort={nextSort} defaultMarket={market} onClose={() => setModal(null)} onSaved={load} />
      )}
    </div>
  )
}

function TrackerHead({ onBack }) {
  return (
    <div className="pages-top">
      <button className="btn btn-sm" onClick={onBack}><ArrowLeft size={14} /> Ecosystem 2.0</button>
    </div>
  )
}
