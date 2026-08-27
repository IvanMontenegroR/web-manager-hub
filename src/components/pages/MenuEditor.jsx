import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Database, Copy, Check,
  FileSpreadsheet, RotateCw,
} from 'lucide-react'
import { CMS_ICONS } from '../../data/components'
import { DEFAULT_MENU, MENU_LAYOUTS, menuIconFor } from '../../data/siteMenu'
import { fetchSiteMenu, saveSiteMenu, SETUP_SQL } from '../../lib/menuDb'
import { PAGE_MARKETS, PAGE_MARKET_LABEL } from '../../lib/pagesDb'
import SiteHeader from './preview/SiteHeader.jsx'
import { exportSiteMenu } from '../../lib/exportMenu'

// Editor del MENU del sitio, por mercado. El menu es config global (el mismo en todas
// las paginas del mercado), asi que no vive adentro del builder de una pagina: tiene
// su propia pantalla, con el header de verdad arriba para probar el hover mientras se
// edita.

// --- helpers de lista: mover, borrar y reemplazar sin mutar ---
const move = (arr, i, d) => {
  const j = i + d
  if (j < 0 || j >= arr.length) return arr
  const out = [...arr]
  const [x] = out.splice(i, 1)
  out.splice(j, 0, x)
  return out
}
const put = (arr, i, v) => arr.map((x, k) => (k === i ? v : x))
const cut = (arr, i) => arr.filter((_, k) => k !== i)

function RowTools({ i, n, on }) {
  return (
    <span className="mn-tools">
      <button className="ic-btn" title="Subir" disabled={i === 0} onClick={() => on('up')}><ChevronUp size={13} /></button>
      <button className="ic-btn" title="Bajar" disabled={i === n - 1} onClick={() => on('down')}><ChevronDown size={13} /></button>
      <button className="ic-btn danger" title="Quitar" onClick={() => on('del')}><Trash2 size={13} /></button>
    </span>
  )
}

// Select de icono del CMS, con el dibujo al lado para no elegir a ciegas.
function IconPick({ value, onChange }) {
  const C = menuIconFor(value)
  return (
    <span className="mn-icon">
      <span className="mn-icon-pv"><C size={16} strokeWidth={2} /></span>
      <select className="control" value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">- Sin icono -</option>
        {CMS_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
      </select>
    </span>
  )
}

// Un link (label + url), que es la hoja del arbol en los dos layouts.
function LinkRow({ link, i, n, withIcon, onChange, onTool }) {
  return (
    <div className="mn-link">
      <input className="control" placeholder="Texto" value={link.label || ''}
        onChange={(e) => onChange({ ...link, label: e.target.value })} />
      <input className="control" placeholder="URL" value={link.url || ''}
        onChange={(e) => onChange({ ...link, url: e.target.value })} />
      {withIcon && <IconPick value={link.icon} onChange={(icon) => onChange({ ...link, icon })} />}
      <RowTools i={i} n={n} on={onTool} />
    </div>
  )
}

export default function MenuEditor({ market: market0, onBack }) {
  const [market, setMarket] = useState(market0 || PAGE_MARKETS[0].code)
  const [items, setItems] = useState([])
  const [missing, setMissing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  // Nodos del rig de captura: 'bar' = la barra sola (para el indice) y un
  // indice por menu = ese megamenu abierto.
  const rigs = useRef(new Map())

  const load = async (m) => {
    setLoading(true); setErrMsg('')
    try {
      const d = await fetchSiteMenu(m)
      setMissing(!!d.missing)
      setItems(d.items || [])
      setDirty(false)
    } catch (e) { setErrMsg(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load(market) }, [market])

  const set = (fn) => { fn(); setDirty(true) }
  const setI = (next) => set(() => setItems(next))

  async function save() {
    setSaving(true); setErrMsg('')
    try { await saveSiteMenu(market, { items }); setDirty(false) }
    catch (e) { setErrMsg(e.message) } finally { setSaving(false) }
  }

  async function runExport() {
    setExporting(true); setErrMsg('')
    try {
      await exportSiteMenu(market, marketLabel, items, (k) => rigs.current.get(k) || null)
    } catch (e) { setErrMsg(e.message) } finally { setExporting(false) }
  }

  const copySql = async () => {
    try { await navigator.clipboard.writeText(SETUP_SQL); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }

  const empty = !loading && !items.length
  const marketLabel = PAGE_MARKET_LABEL[market] || market
  const preview = useMemo(() => ({ items }), [items])

  return (
    <div className="content">
      <div className="pages-top">
        <button className="btn btn-sm" onClick={onBack}><ArrowLeft size={14} /> Paginas</button>
        <b style={{ marginLeft: 4 }}>Menú del sitio</b>
        <span className="hint" style={{ marginLeft: 6 }}>
          Config global — el mismo menú en todas las páginas de {marketLabel}
        </span>
        <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => load(market)}>
          <RotateCw size={14} /> Recargar
        </button>
        <button className="btn btn-sm" disabled={!items.length || exporting} onClick={runExport}>
          <FileSpreadsheet size={14} /> {exporting ? 'Generando...' : 'Exportar a Excel'}
        </button>
        <button className="btn btn-primary btn-sm" disabled={!dirty || saving} onClick={save}>
          <Save size={14} /> {saving ? 'Guardando...' : dirty ? 'Guardar' : 'Guardado'}
        </button>
      </div>

      <div className="pages-markets">
        {PAGE_MARKETS.map((m) => (
          <button key={m.code} className={`pages-market${market === m.code ? ' active' : ''}`}
            onClick={() => { if (!dirty || confirm('Hay cambios sin guardar. ¿Cambiar de mercado igual?')) setMarket(m.code) }}>
            {m.label}
          </button>
        ))}
      </div>

      {missing && (
        <div className="dir-setup">
          <div className="dir-setup-head">
            <Database size={18} color="var(--purina)" />
            <div>
              <h3>Falta crear la tabla del menú</h3>
              <p>Corré este SQL una vez en el editor de Supabase (proyecto Purina-Hub) y recargá.</p>
            </div>
            <button className="btn btn-sm" onClick={copySql} style={{ marginLeft: 'auto' }}>
              {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
            </button>
          </div>
          <pre className="dir-setup-sql">{SETUP_SQL}</pre>
        </div>
      )}

      {errMsg && <div className="form-error" style={{ margin: '0 0 10px' }}>{errMsg}</div>}

      {/* El header de verdad: se edita abajo y se prueba el hover acá arriba. */}
      <div className="pb-globaltag">Vista previa — pasá el mouse por un menú</div>
      <div className="pb-header-host mn-preview"><SiteHeader items={preview.items} /></div>

      {/* Rig de captura: el header con CADA megamenu abierto, uno por menu, montado
          fuera de pantalla a ancho desktop. html2canvas no puede pasar el mouse por
          arriba, asi que la unica forma de capturar un megamenu abierto es dibujarlo
          abierto. `aria-hidden` porque no es contenido, es material para el Excel. */}
      <div className="mn-rig" aria-hidden>
        <div ref={(el) => { rigs.current.set('bar', el) }}>
          <SiteHeader items={preview.items} />
        </div>
        {items.map((_, i) => (
          <div key={i} ref={(el) => { rigs.current.set(i, el) }}>
            <SiteHeader items={preview.items} forceOpen={i} />
          </div>
        ))}
      </div>

      {loading ? (
        <div className="center-state"><div className="spinner" /></div>
      ) : empty ? (
        <div className="dir-empty">
          <div className="dir-empty-t">Sin menú cargado en {marketLabel}</div>
          <p>Cargá el menú de referencia (el real de México) y editalo, o armalo desde cero.</p>
          <div className="dir-empty-actions">
            <button className="btn btn-primary" onClick={() => setI(DEFAULT_MENU)}>
              <Database size={15} /> Cargar menú de referencia
            </button>
            <button className="btn" onClick={() => setI([{ label: 'Nuevo menú', layout: 'links', links: [] }])}>
              <Plus size={15} /> Empezar vacío
            </button>
          </div>
        </div>
      ) : (
        <div className="mn-list">
          {items.map((it, i) => {
            const upd = (patch) => setI(put(items, i, { ...it, ...patch }))
            const tool = (a) => setI(a === 'del' ? cut(items, i) : move(items, i, a === 'up' ? -1 : 1))
            return (
              <section key={i} className="mn-item">
                <header className="mn-item-head">
                  <span className="mn-n">{i + 1}</span>
                  <input className="control mn-label" placeholder="Nombre del menú"
                    value={it.label || ''} onChange={(e) => upd({ label: e.target.value })} />
                  <select className="control mn-layout" value={it.layout || 'links'}
                    onChange={(e) => upd({ layout: e.target.value })}>
                    {MENU_LAYOUTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                  <RowTools i={i} n={items.length} on={tool} />
                </header>

                {it.layout === 'boxes' ? (
                  <>
                    <label className="mn-check">
                      <input type="checkbox" checked={!!it.search}
                        onChange={(e) => upd({ search: e.target.checked ? { label: 'Buscar', placeholder: '' } : undefined })} />
                      Buscador arriba del menú
                    </label>
                    {it.search && (
                      <div className="mn-link">
                        <input className="control" placeholder="Título del buscador" value={it.search.label || ''}
                          onChange={(e) => upd({ search: { ...it.search, label: e.target.value } })} />
                        <input className="control" placeholder="Texto de ejemplo dentro del campo"
                          value={it.search.placeholder || ''}
                          onChange={(e) => upd({ search: { ...it.search, placeholder: e.target.value } })} />
                      </div>
                    )}
                    {(it.groups || []).map((g, gi) => {
                      const groups = it.groups || []
                      const updG = (patch) => upd({ groups: put(groups, gi, { ...g, ...patch }) })
                      const toolG = (a) => upd({ groups: a === 'del' ? cut(groups, gi) : move(groups, gi, a === 'up' ? -1 : 1) })
                      const links = g.links || []
                      return (
                        <div key={gi} className="mn-group">
                          <div className="mn-group-head">
                            <input className="control" placeholder="Título del grupo" value={g.title || ''}
                              onChange={(e) => updG({ title: e.target.value })} />
                            <IconPick value={g.icon} onChange={(icon) => updG({ icon })} />
                            <RowTools i={gi} n={groups.length} on={toolG} />
                          </div>
                          {links.map((l, li) => (
                            <LinkRow key={li} link={l} i={li} n={links.length} withIcon={false}
                              onChange={(v) => updG({ links: put(links, li, v) })}
                              onTool={(a) => updG({ links: a === 'del' ? cut(links, li) : move(links, li, a === 'up' ? -1 : 1) })} />
                          ))}
                          <button className="btn btn-sm" onClick={() => updG({ links: [...links, { label: '', url: '' }] })}>
                            <Plus size={13} /> Link
                          </button>
                        </div>
                      )
                    })}
                    <button className="btn btn-sm" onClick={() => upd({ groups: [...(it.groups || []), { title: '', icon: '', links: [] }] })}>
                      <Plus size={13} /> Grupo
                    </button>
                  </>
                ) : (
                  <div className="mn-group">
                    {(it.links || []).map((l, li) => {
                      const links = it.links || []
                      return (
                        <LinkRow key={li} link={l} i={li} n={links.length} withIcon
                          onChange={(v) => upd({ links: put(links, li, v) })}
                          onTool={(a) => upd({ links: a === 'del' ? cut(links, li) : move(links, li, a === 'up' ? -1 : 1) })} />
                      )
                    })}
                    <button className="btn btn-sm" onClick={() => upd({ links: [...(it.links || []), { label: '', url: '', icon: '' }] })}>
                      <Plus size={13} /> Link
                    </button>
                    <div className="hint">Se ven en dos columnas, por filas: el 1 y el 2 son la primera fila.</div>
                  </div>
                )}

                <div className="mn-link">
                  <input className="control" placeholder='Link del pie (ej. "Ver todas") — vacío = no se muestra'
                    value={it.more?.label || ''}
                    onChange={(e) => upd({ more: e.target.value ? { ...(it.more || {}), label: e.target.value } : undefined })} />
                  <input className="control" placeholder="URL del pie" value={it.more?.url || ''}
                    onChange={(e) => upd({ more: { ...(it.more || {}), url: e.target.value } })} />
                </div>

                {/* Las tarjetas son de ESTE menú: cambiarlas acá no toca las de los
                    otros. Pueden ser 0, 1 o 2; sin ninguna, el menú ocupa todo el ancho. */}
                {(() => {
                  const cards = it.promos || []
                  const updC = (next) => upd({ promos: next })
                  return (
                    <div className="mn-cards">
                      <div className="mn-cards-t">
                        Tarjetas de la derecha
                        <span className="hint" style={{ marginLeft: 8 }}>
                          Solo de este menú. Podés dejar una sola o ninguna.
                        </span>
                      </div>
                      {cards.map((p, ci) => (
                        <div key={ci} className="mn-group">
                          <div className="mn-group-head">
                            <input className="control" placeholder="Título" value={p.title || ''}
                              onChange={(e) => updC(put(cards, ci, { ...p, title: e.target.value }))} />
                            <RowTools i={ci} n={cards.length}
                              on={(a) => updC(a === 'del' ? cut(cards, ci) : move(cards, ci, a === 'up' ? -1 : 1))} />
                          </div>
                          <div className="mn-link">
                            <input className="control" placeholder="Bajada" value={p.text || ''}
                              onChange={(e) => updC(put(cards, ci, { ...p, text: e.target.value }))} />
                            <input className="control" placeholder="URL" value={p.url || ''}
                              onChange={(e) => updC(put(cards, ci, { ...p, url: e.target.value }))} />
                          </div>
                          <div className="mn-link">
                            <input className="control" placeholder="Link de la imagen (la entrega el mercado)"
                              value={p.image || ''}
                              onChange={(e) => updC(put(cards, ci, { ...p, image: e.target.value }))} />
                          </div>
                        </div>
                      ))}
                      {cards.length < 2 && (
                        <button className="btn btn-sm" onClick={() => updC([...cards, { title: '', text: '', image: '', url: '' }])}>
                          <Plus size={13} /> Tarjeta
                        </button>
                      )}
                    </div>
                  )
                })()}
              </section>
            )
          })}

          <button className="btn" onClick={() => setI([...items, { label: 'Nuevo menú', layout: 'links', links: [], promos: [] }])}>
            <Plus size={14} /> Menú principal
          </button>
        </div>
      )}
    </div>
  )
}
