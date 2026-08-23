import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Plus, ChevronUp, ChevronDown, Trash2, FileSpreadsheet, Save, Check, X, LayoutGrid, Pencil,
} from 'lucide-react'
import { PALETTE, getComponent, slotsOf, paletteGroups } from '../../data/components'
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
  const [activeTab, setActiveTab] = useState({}) // { [id del bloque de pestañas]: pestaña abierta }
  const [picker, setPicker] = useState(null)     // { parent_id, tab_index } con la paleta abierta adentro
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

  // Contexto de marca de la pagina: nombre + tokens de color (los tokens pueden faltar
  // si la marca no tiene tema definido; el nombre igual sirve, ej. para el menu de marca).
  const theme = useMemo(() => {
    const t = brandTheme(page.brand)
    if (!t && !page.brand) return null
    return { ...(t || {}), name: page.brand || null }
  }, [page.brand])
  // La pagina es un ARBOL de un nivel: bloques sueltos (parent_id null) y, dentro de un
  // contenedor (bloque de pestañas), sus hijos agrupados por pestaña (tab_index).
  const roots = useMemo(() => comps.filter((c) => !c.parent_id), [comps])
  // Hijos de una pestaña. En la ULTIMA pestaña caen ademas los hijos que quedaron
  // apuntando a una pestaña que ya no existe (si se borraron pestañas), asi no se
  // pierden en el limbo: se ven y se pueden mover o borrar.
  const kidsOf = (id, ti, isLast = false) => comps.filter((c) => c.parent_id === id
    && (isLast ? (c.tab_index ?? 0) >= ti : (c.tab_index ?? 0) === ti))
  // El orden es por GRUPO: el sort_order de los hijos de una pestaña es independiente
  // del de los bloques sueltos.
  const nextSortIn = (parent_id, tab_index) => {
    const group = parent_id ? kidsOf(parent_id, tab_index) : roots
    return group.reduce((m, c) => Math.max(m, c.sort_order || 0), 0) + 1
  }
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

  // `p` = item de la PALETA (un componente o un atajo con contenido inicial).
  // `at` = { parent_id, tab_index } para que caiga DENTRO de una pestaña; sin `at`
  // queda suelto al final de la pagina.
  async function add(p, at = {}) {
    setBusy(true)
    try {
      await flushSave() // no perder lo del componente actual al agregar otro
      const created = await addPageComponent(
        page.id, p.component_key, nextSortIn(at.parent_id || null, at.tab_index ?? 0), at, p.content,
      )
      setPicker(null)
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

  // Reordena DENTRO de un grupo (los sueltos de la pagina, o los hijos de una pestaña):
  // se reescribe el sort_order de ese grupo y el resto queda igual.
  async function move(group, i, dir) {
    const j = i + dir
    if (j < 0 || j >= group.length) return
    const next = group.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    const order = new Map(next.map((c, k) => [c.id, k]))
    setComps((cs) => cs
      .map((c) => (order.has(c.id) ? { ...c, sort_order: order.get(c.id) } : c))
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
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
      }, {
        // Header y footer globales: entran solo en la imagen de la pagina entera
        // (no son componentes editables por pagina).
        chrome: { header: headerRef.current, footer: footerRef.current },
        pageBg: brandPageBg(page.brand) || undefined,
      })
    } catch (e) { setErrMsg(e.message) } finally { setExporting(false) }
  }

  const setDraftField = (next) => { setDraft(next); setDirty(true) }
  const contentFor = (c) => (c.id === selId ? draft : c.content || {})

  // ---- Render de un bloque (recursivo: un contenedor renderiza sus hijos adentro) ----
  // El contenido de un CONTENEDOR son otros componentes: se le pasan al preview ya
  // renderizados, un nodo por SLOT. Hay dos clases de contenedor y la diferencia es
  // solo esta: en las pestañas se ve un slot por vez (los demas se montan fuera de
  // pantalla para que el export capture tambien lo que esta en las pestañas cerradas),
  // y en las columnas se ven todos a la vez.
  function slotNodes(c, def) {
    const slots = slotsOf(def, contentFor(c))
    const isTabs = !def.slots // slots variables (uno por pestaña cargada)
    const active = Math.min(activeTab[c.id] || 0, slots.length - 1)
    return slots.map((s, si) => {
      const kids = kidsOf(c.id, si, si === slots.length - 1)
      const off = isTabs && si !== active
      const open = picker && picker.parent_id === c.id && picker.tab_index === si
      return (
        <div key={si} className={`pb-slot${isTabs ? ' pb-tabpanel' : ''}${off ? ' pb-tabpanel--off' : ''}`}>
          {kids.map((k, i) => renderBlock(k, i, kids))}
          {editMode && !off && (
            <div className="pb-addhere" onClick={(e) => e.stopPropagation()}>
              <button className="btn btn-sm" disabled={busy} onClick={() => setPicker(open ? null : { parent_id: c.id, tab_index: si })}>
                <Plus size={13} /> {isTabs ? 'Agregar componente acá' : `Agregar en ${s.label}`}
              </button>
              {open && (
                <div className="pb-picker">
                  {/* Sin contenedores: el arbol es de UN nivel, no se anidan. */}
                  {PALETTE.filter((d) => !d.container).map((d) => (
                    <button key={d.key} className="pb-pal-item" disabled={busy} title={d.help}
                      onClick={() => add(d, { parent_id: c.id, tab_index: si })}>
                      <Plus size={13} /> <span>{d.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )
    })
  }

  function renderBlock(c, i, group) {
    const def = getComponent(c.component_key)
    const isContainer = !!def?.container
    const slots = isContainer ? slotsOf(def, contentFor(c)) : []
    const active = isContainer ? Math.min(activeTab[c.id] || 0, slots.length - 1) : 0
    return (
      <div
        key={c.id}
        className={`pb-block pb-block--${c.component_key}${selId === c.id ? ' sel' : ''}${c.parent_id ? ' pb-block--kid' : ''}`}
        ref={(el) => { if (el) nodes.current.set(c.id, el); else nodes.current.delete(c.id) }}
        onClick={(e) => { if (!editMode) return; e.stopPropagation(); select(c) }}
      >
        <div className="pb-block-bar">
          <span className="pb-block-name">{def?.name || c.component_key}</span>
          <div className="pb-block-actions">
            <button className="ic-btn" disabled={i === 0} onClick={(e) => { e.stopPropagation(); move(group, i, -1) }} title="Subir"><ChevronUp size={14} /></button>
            <button className="ic-btn" disabled={i === group.length - 1} onClick={(e) => { e.stopPropagation(); move(group, i, 1) }} title="Bajar"><ChevronDown size={14} /></button>
            <button className="ic-btn danger" onClick={(e) => { e.stopPropagation(); remove(c) }} title="Quitar"><Trash2 size={13} /></button>
          </div>
        </div>
        <ComponentPreview
          componentKey={c.component_key}
          content={contentFor(c)}
          theme={theme}
          slots={isContainer ? slotNodes(c, def) : null}
          activeTab={active}
          onTab={isContainer ? ((ti) => setActiveTab((m) => ({ ...m, [c.id]: ti }))) : null}
        />
      </div>
    )
  }

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
          {/* Agrupada por familia: con los layouts adentro, una lista plana no se lee. */}
          {paletteGroups().map((g) => (
            <div key={g.category} className="pb-pal-group">
              <div className="pb-pal-cat">{g.category}</div>
              {g.items.map((c) => (
                <button key={c.key} className="pb-pal-item" disabled={busy} onClick={() => add(c)} title={c.help}>
                  <Plus size={13} /> <span>{c.name}</span>
                </button>
              ))}
            </div>
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
            className={`pb-page${brandPageBg(page.brand) ? ' pb-page--brand' : ''}${pageIsDark(page.brand) ? ' pb-page--dark' : ''}`}
            style={brandPageBg(page.brand) ? { background: brandPageBg(page.brand) } : undefined}
          >
            {loading ? (
              <div className="center-state"><div className="spinner" /></div>
            ) : roots.length === 0 ? (
              <div className="pb-empty">
                <LayoutGrid size={26} />
                <div className="dir-empty-t">Pagina vacia</div>
                <p>Agregá componentes desde la paleta de la izquierda. Se van apilando acá y podés cargar su contenido.</p>
              </div>
            ) : (
              roots.map((c, i) => renderBlock(c, i, roots))
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
              <ContentForm component={selectedDef} draft={draft} onChange={setDraftField} brandSecondary={theme?.secondary || null} />
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
