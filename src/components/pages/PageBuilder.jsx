import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Plus, ChevronUp, ChevronDown, Trash2, FileSpreadsheet, Save, Check, X, LayoutGrid,
} from 'lucide-react'
import { COMPONENTS, getComponent } from '../../data/components'
import {
  fetchPageComponents, addPageComponent, updatePageComponentContent, deletePageComponent, persistComponentOrder,
} from '../../lib/pagesDb'
import { exportPageMatrix } from '../../lib/exportPage'
import ComponentPreview from './preview/ComponentPreview.jsx'
import ContentForm from './ContentForm.jsx'

export default function PageBuilder({ page, onBack }) {
  const [comps, setComps] = useState([])
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState(null)
  const [selId, setSelId] = useState(null)
  const [draft, setDraft] = useState({})
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState(false)
  const nodes = useRef(new Map())

  async function load() {
    setLoading(true)
    const { data, error } = await fetchPageComponents(page.id)
    if (error) setErrMsg(error.message)
    setComps(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [page.id])

  const nextSort = useMemo(() => comps.reduce((m, c) => Math.max(m, c.sort_order || 0), 0) + 1, [comps])
  const selected = comps.find((c) => c.id === selId) || null
  const selectedDef = selected ? getComponent(selected.component_key) : null

  function select(comp) {
    setSelId(comp.id)
    setDraft(comp.content || {})
    setDirty(false)
  }

  async function add(key) {
    setBusy(true)
    try {
      const created = await addPageComponent(page.id, key, nextSort)
      await load()
      select(created)
    } catch (e) { setErrMsg(e.message) } finally { setBusy(false) }
  }

  async function save() {
    if (!selected) return
    setBusy(true)
    try {
      await updatePageComponentContent(selected.id, draft)
      setComps((cs) => cs.map((c) => (c.id === selected.id ? { ...c, content: draft } : c)))
      setDirty(false)
    } catch (e) { setErrMsg(e.message) } finally { setBusy(false) }
  }

  async function remove(comp) {
    if (!confirm(`Quitar "${getComponent(comp.component_key)?.name || comp.component_key}" de la pagina?`)) return
    setBusy(true)
    try {
      await deletePageComponent(comp.id)
      if (selId === comp.id) { setSelId(null); setDirty(false) }
      await load()
    } catch (e) { setErrMsg(e.message) } finally { setBusy(false) }
  }

  async function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= comps.length) return
    const next = comps.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    setComps(next)
    try { await persistComponentOrder(next) } catch (e) { setErrMsg(e.message); load() }
  }

  async function exportExcel() {
    setExporting(true)
    try {
      if (dirty && selected) await save()
      // usar el contenido vigente (incluye lo recien guardado)
      const current = comps.map((c) => (c.id === selId ? { ...c, content: draft } : c))
      await exportPageMatrix(page, current, (id) => {
        const wrap = nodes.current.get(id)
        return wrap ? wrap.querySelector('.cp-render') : null
      })
    } catch (e) { setErrMsg(e.message) } finally { setExporting(false) }
  }

  const setDraftField = (next) => { setDraft(next); setDirty(true) }
  const contentFor = (c) => (c.id === selId ? draft : c.content || {})

  return (
    <div className="content pb-content">
      <div className="pb-bar">
        <button className="btn btn-sm" onClick={onBack}><ArrowLeft size={14} /> Paginas</button>
        <div className="pb-title">{page.name}</div>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={exportExcel} disabled={exporting || !comps.length}>
          <FileSpreadsheet size={15} /> {exporting ? 'Generando...' : 'Exportar a Excel'}
        </button>
      </div>

      {errMsg && <div className="form-error" style={{ margin: '0 0 10px' }}>{errMsg}</div>}

      <div className="pb-main">
        {/* Paleta */}
        <div className="pb-palette">
          <div className="pb-palette-h">Componentes</div>
          {COMPONENTS.map((c) => (
            <button key={c.key} className="pb-pal-item" disabled={busy} onClick={() => add(c.key)} title={c.help}>
              <Plus size={13} /> <span>{c.name}</span>
            </button>
          ))}
        </div>

        {/* Canvas / preview */}
        <div className="pb-canvas">
          {loading ? (
            <div className="center-state"><div className="spinner" /></div>
          ) : comps.length === 0 ? (
            <div className="pb-empty">
              <LayoutGrid size={26} />
              <div className="dir-empty-t">Pagina vacia</div>
              <p>Agregá componentes desde la paleta de la izquierda. Se van apilando acá y podés cargar su contenido.</p>
            </div>
          ) : (
            comps.map((c, i) => (
              <div
                key={c.id}
                className={`pb-block${selId === c.id ? ' sel' : ''}`}
                ref={(el) => { if (el) nodes.current.set(c.id, el); else nodes.current.delete(c.id) }}
                onClick={() => select(c)}
              >
                <div className="pb-block-bar">
                  <span className="pb-block-name">{getComponent(c.component_key)?.name || c.component_key}</span>
                  <div className="pb-block-actions">
                    <button className="ic-btn" disabled={i === 0} onClick={(e) => { e.stopPropagation(); move(i, -1) }} title="Subir"><ChevronUp size={14} /></button>
                    <button className="ic-btn" disabled={i === comps.length - 1} onClick={(e) => { e.stopPropagation(); move(i, 1) }} title="Bajar"><ChevronDown size={14} /></button>
                    <button className="ic-btn danger" onClick={(e) => { e.stopPropagation(); remove(c) }} title="Quitar"><Trash2 size={13} /></button>
                  </div>
                </div>
                <ComponentPreview componentKey={c.component_key} content={contentFor(c)} />
              </div>
            ))
          )}
        </div>

        {/* Editor de contenido */}
        <div className="pb-editor">
          {selected && selectedDef ? (
            <>
              <div className="pb-editor-h">
                <span>{selectedDef.name}</span>
                <button className="ic-btn" onClick={() => setSelId(null)} title="Cerrar"><X size={15} /></button>
              </div>
              {selectedDef.help && <div className="pb-editor-help">{selectedDef.help}</div>}
              <ContentForm component={selectedDef} draft={draft} onChange={setDraftField} />
              <div className="pb-editor-foot">
                <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !dirty}>
                  {dirty ? <><Save size={14} /> Guardar</> : <><Check size={14} /> Guardado</>}
                </button>
              </div>
            </>
          ) : (
            <div className="pb-editor-empty">Elegí un componente del centro para cargar su contenido.</div>
          )}
        </div>
      </div>
    </div>
  )
}
