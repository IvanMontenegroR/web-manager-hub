import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Plus, ChevronUp, ChevronDown, Trash2, FileSpreadsheet, Save, Check, X, LayoutGrid, Pencil,
} from 'lucide-react'
import { COMPONENTS, getComponent } from '../../data/components'
import {
  fetchPageComponents, addPageComponent, updatePageComponentContent, deletePageComponent, persistComponentOrder, pageIsDark, brandTheme, brandPageBg,
} from '../../lib/pagesDb'
import { exportPageMatrix } from '../../lib/exportPage'
import ComponentPreview from './preview/ComponentPreview.jsx'
import SiteHeader from './preview/SiteHeader.jsx'
import SiteFooter from './preview/SiteFooter.jsx'
import ContentForm from './ContentForm.jsx'

export default function PageBuilder({ page, onBack }) {
  const [comps, setComps] = useState([])
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState(null)
  const [selId, setSelId] = useState(null)
  const [draft, setDraft] = useState({})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [editMode, setEditMode] = useState(true) // false = vista previa (pagina real, sin toolbars)
  const nodes = useRef(new Map())
  const headerRef = useRef(null)
  const footerRef = useRef(null)

  async function load() {
    setLoading(true)
    const { data, error } = await fetchPageComponents(page.id)
    if (error) setErrMsg(error.message)
    setComps(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [page.id])

  // Tokens de color de la marca de la pagina (null si no tiene marca con tema).
  const theme = useMemo(() => brandTheme(page.brand), [page.brand])
  const nextSort = useMemo(() => comps.reduce((m, c) => Math.max(m, c.sort_order || 0), 0) + 1, [comps])
  const selected = comps.find((c) => c.id === selId) || null
  const selectedDef = selected ? getComponent(selected.component_key) : null

  // Refs con el ultimo valor, para que los timers / beforeunload / flush no dependan
  // de closures viejas.
  const draftRef = useRef(draft); draftRef.current = draft
  const selRef = useRef(selId); selRef.current = selId
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty

  // Persiste el borrador vigente en la DB SIN bloquear la UI. Idempotente y seguro
  // de llamar en cualquier momento (al cambiar de componente, salir, autosave...).
  async function flushSave() {
    const id = selRef.current
    if (!id || !dirtyRef.current) return
    const data = draftRef.current
    setSaving(true)
    try {
      await updatePageComponentContent(id, data)
      setComps((cs) => cs.map((c) => (c.id === id ? { ...c, content: data } : c)))
      // Solo marcar "guardado" si no hubo cambios nuevos mientras se guardaba.
      if (draftRef.current === data) setDirty(false)
    } catch (e) { setErrMsg(e.message) } finally { setSaving(false) }
  }

  // AUTOGUARDADO: cada cambio del borrador se persiste solo ~700ms despues de que
  // dejas de tocar. Asi, aunque no le des a "Guardar", no se pierde el progreso.
  useEffect(() => {
    if (!dirty || !selId) return
    const t = setTimeout(() => { flushSave() }, 700)
    return () => clearTimeout(t)
  }, [draft, dirty, selId])

  // Backstop: si intentas cerrar/recargar la pestana con cambios sin guardar, avisa.
  useEffect(() => {
    const h = (e) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [])

  async function select(comp) {
    if (comp.id === selRef.current) return
    await flushSave() // guarda lo del componente anterior antes de cambiar
    setSelId(comp.id)
    setDraft(comp.content || {})
    setDirty(false)
  }

  async function closeEditor() {
    await flushSave()
    setSelId(null)
    setDirty(false)
  }

  async function add(key) {
    setBusy(true)
    try {
      await flushSave() // no perder lo del componente actual al agregar otro
      const created = await addPageComponent(page.id, key, nextSort)
      await load()
      await select(created)
    } catch (e) { setErrMsg(e.message) } finally { setBusy(false) }
  }

  async function remove(comp) {
    if (!confirm(`Quitar "${getComponent(comp.component_key)?.name || comp.component_key}" de la pagina?`)) return
    setBusy(true)
    try {
      if (comp.id !== selId) await flushSave() // preservar edits de otro componente
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
      await flushSave()
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
        <button className="btn btn-sm" onClick={async () => { await flushSave(); onBack() }}><ArrowLeft size={14} /> Paginas</button>
        <div className="pb-title">{page.name}</div>
        <button
          className={`btn btn-sm${editMode ? ' active' : ''}`}
          style={{ marginLeft: 'auto' }}
          title={editMode ? 'Modo edicion (click para ver la pagina)' : 'Vista previa (click para editar)'}
          onClick={async () => { if (editMode) await flushSave(); setEditMode((v) => !v); if (editMode) setSelId(null) }}
        >
          <Pencil size={14} /> {editMode ? 'Editando' : 'Vista previa'}
        </button>
        <button className="btn btn-primary btn-sm" onClick={exportExcel} disabled={exporting || !comps.length}>
          <FileSpreadsheet size={15} /> {exporting ? 'Generando...' : 'Exportar a Excel'}
        </button>
      </div>

      {errMsg && <div className="form-error" style={{ margin: '0 0 10px' }}>{errMsg}</div>}

      <div className={`pb-main${editMode ? '' : ' preview'}`}>
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
        <div className={`pb-canvas${editMode ? '' : ' preview'}`}>
          {/* Header global — presente en todas las paginas (no editable, va en el export). */}
          <div className="pb-globaltag">Header — global (en todas las paginas)</div>
          <div ref={headerRef} className="pb-header-host"><SiteHeader /></div>

          {/* Container: replica el gutter lateral de la pagina real. El fondo sale del
              color PRIMARIO de la marca (Pro Plan negro, Fancy Feast blanco). */}
          <div
            className={`pb-page${theme ? ' pb-page--brand' : ''}${pageIsDark(page.brand) ? ' pb-page--dark' : ''}`}
            style={brandPageBg(page.brand) ? { background: brandPageBg(page.brand) } : undefined}
          >
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
                  className={`pb-block pb-block--${c.component_key}${selId === c.id ? ' sel' : ''}`}
                  ref={(el) => { if (el) nodes.current.set(c.id, el); else nodes.current.delete(c.id) }}
                  onClick={() => editMode && select(c)}
                >
                  <div className="pb-block-bar">
                    <span className="pb-block-name">{getComponent(c.component_key)?.name || c.component_key}</span>
                    <div className="pb-block-actions">
                      <button className="ic-btn" disabled={i === 0} onClick={(e) => { e.stopPropagation(); move(i, -1) }} title="Subir"><ChevronUp size={14} /></button>
                      <button className="ic-btn" disabled={i === comps.length - 1} onClick={(e) => { e.stopPropagation(); move(i, 1) }} title="Bajar"><ChevronDown size={14} /></button>
                      <button className="ic-btn danger" onClick={(e) => { e.stopPropagation(); remove(c) }} title="Quitar"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <ComponentPreview componentKey={c.component_key} content={contentFor(c)} theme={theme} />
                </div>
              ))
            )}
          </div>

          {/* Footer global — presente en todas las paginas (no editable, va en el export). */}
          <div className="pb-globaltag">Footer — global (en todas las paginas)</div>
          <div ref={footerRef} className="pb-footer-host"><SiteFooter /></div>
        </div>

        {/* Editor de contenido */}
        <div className="pb-editor">
          {selected && selectedDef ? (
            <>
              <div className="pb-editor-h">
                <span>{selectedDef.name}</span>
                <button className="ic-btn" onClick={closeEditor} title="Cerrar"><X size={15} /></button>
              </div>
              {selectedDef.help && <div className="pb-editor-help">{selectedDef.help}</div>}
              <ContentForm component={selectedDef} draft={draft} onChange={setDraftField} brandSecondary={brandSecondaryColor(page.brand)} />
              <div className="pb-editor-foot">
                <button className="btn btn-primary btn-sm" onClick={flushSave} disabled={busy || saving || !dirty}>
                  {saving ? <><Save size={14} /> Guardando…</> : dirty ? <><Save size={14} /> Guardar</> : <><Check size={14} /> Guardado</>}
                </button>
                <span className="pb-autosave">Se guarda solo</span>
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
