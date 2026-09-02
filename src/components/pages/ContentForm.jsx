import { useRef, useState } from 'react'
import { Plus, X, Image as ImageIcon, Ruler, Upload, Link2, Bold, Italic, List, ListOrdered } from 'lucide-react'
import { getSpecs, visibleFields, visibleSubFields, optValue, optLabel, maxLengthOf } from '../../data/components'
import { uploadMedia, isVideoUrl } from '../../lib/storageDb'
import { wrapLink, wrapMark, toggleList } from '../../lib/richText'

// Cuerpo de un componente: es RICH TEXT en el CMS (negritas, saltos, listas). Por
// debajo el formato se guarda con una notacion tipo markdown, para que el dato viaje
// entero en un solo campo, pero esa notacion NO se muestra: estos botones la insertan
// solos sobre lo que tengas seleccionado, el mockup lo renderiza y el Excel baja con el
// formato de verdad (ver src/lib/richText.js).
//
// La tecla de los atajos: ⌘ en Mac, Ctrl en el resto. Solo para MOSTRARLA en los
// tooltips — al escuchar el teclado se aceptan las dos.
const MOD = typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.platform || navigator.userAgent || '') ? '⌘' : 'Ctrl+'

function TextAreaField({ f, value, onChange, max }) {
  const ref = useRef(null)
  // Aplica una transformacion sobre la SELECCION y devuelve el foco donde corresponde,
  // para poder seguir escribiendo sin volver a hacer click.
  function apply(fn) {
    const el = ref.current
    if (!el) return
    const res = fn(value || '', el.selectionStart, el.selectionEnd)
    if (!res) return
    onChange(res.value)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(res.selection[0], res.selection[1]) })
  }
  const addLink = () => apply((v, a, b) => {
    const url = prompt('Link de destino (https://...)')
    return url && url.trim() ? wrapLink(v, a, b, url.trim()) : null
  })
  const bold = () => apply((v, a, b) => wrapMark(v, a, b, '**'))
  const italic = () => apply((v, a, b) => wrapMark(v, a, b, '_'))
  const bullets = () => apply((v, a, b) => toggleList(v, a, b, 'ul'))
  const numbers = () => apply((v, a, b) => toggleList(v, a, b, 'ol'))

  // Los atajos de siempre (los mismos que Word y Google Docs), para no tener que
  // soltar el teclado: negrita, cursiva, enlace y las dos listas.
  function onKeyDown(e) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return
    const k = e.key.toLowerCase()
    const fn = k === 'b' ? bold
      : k === 'i' ? italic
      : k === 'k' ? addLink
      // Las listas van con Shift, igual que en Word: Ctrl+Shift+8 y Ctrl+Shift+7.
      : (e.shiftKey && (k === '8' || k === '*')) ? bullets
      : (e.shiftKey && (k === '7' || k === '&')) ? numbers
      : null
    if (!fn) return
    e.preventDefault()
    fn()
  }

  return (
    <div className="cf-rt">
      <textarea ref={ref} className="control" rows={3} value={value || ''}
        onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} placeholder={f.placeholder} />
      <div className="cf-rt-bar">
        <button type="button" className="ic-btn" title={`Negrita (${MOD}B)`}
          onClick={bold}><Bold size={13} /></button>
        <button type="button" className="ic-btn" title={`Cursiva (${MOD}I)`}
          onClick={italic}><Italic size={13} /></button>
        <button type="button" className="ic-btn" title={`Lista con viñetas (${MOD}⇧8)`}
          onClick={bullets}><List size={13} /></button>
        <button type="button" className="ic-btn" title={`Lista numerada (${MOD}⇧7)`}
          onClick={numbers}><ListOrdered size={13} /></button>
        <button type="button" className="ic-btn" title={`Marcar el texto seleccionado como enlace (${MOD}K)`}
          onClick={addLink}><Link2 size={13} /></button>
        {/* Campo con largo acotado por el DISEÑO (ej. la descripcion de una card
            apaisada). Se avisa, no se recorta: un texto ya cargado que se pasa se tiene
            que poder ver entero para acortarlo a mano. */}
        {max && <span className={`cf-count${(value || '').length > max ? ' over' : ''}`}>
          {(value || '').length} / {max}
        </span>}
      </div>
    </div>
  )
}

// Campo de imagen/video: se puede pegar una URL o subir un archivo (se sube a
// Supabase Storage y se guarda la URL publica). Preview con <video> si es video.
function ImageField({ value, onChange }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const inputRef = useRef(null)

  async function onFile(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setBusy(true); setErr(null)
    try {
      const url = await uploadMedia(file)
      onChange(url)
    } catch (e2) {
      setErr(e2.message || 'No se pudo subir el archivo.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const vid = isVideoUrl(value)
  return (
    <div className="cf-img">
      <div className="cf-img-row">
        <input className="control" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="Link o subí un archivo…" />
        <button type="button" className="btn btn-sm cf-upload" disabled={busy} onClick={() => inputRef.current && inputRef.current.click()}>
          <Upload size={13} /> {busy ? 'Subiendo…' : 'Subir'}
        </button>
        <input ref={inputRef} type="file" accept="image/*,video/*" hidden onChange={onFile} />
      </div>
      {err && <div className="cf-img-err">{err}</div>}
      {value
        ? (vid
          ? <video className="cf-img-thumb" src={value} muted loop playsInline />
          : <img className="cf-img-thumb" src={value} alt="" />)
        : <div className="cf-img-thumb ph"><ImageIcon size={14} /></div>}
    </div>
  )
}

// Formulario de contenido de un componente: renderiza un input por campo del
// catalogo (incluye campos 'list' repetibles). Es controlado: draft + onChange(key,val).
function Field({ f, value, onChange, brandSecondary, max }) {
  if (f.type === 'textarea') {
    return <TextAreaField f={f} value={value} onChange={onChange} max={max} />
  }
  if (f.type === 'select') {
    // Las opciones pueden ser strings o { value, label } (se guarda el valor de maquina
    // del CMS y se muestra la etiqueta del desplegable de Drupal).
    // Con `default` (un string), vacio NO es "sin elegir": es ese valor. Se muestra
    // seleccionado y no se ofrece la opcion vacia, porque no habria a que volver.
    const def = typeof f.default === 'string' ? f.default : null
    return (
      <select className="control" value={value || def || ''} onChange={(e) => onChange(e.target.value)}>
        {!def && <option value="">—</option>}
        {f.options.map((o) => <option key={optValue(o)} value={optValue(o)}>{optLabel(o)}</option>)}
      </select>
    )
  }
  if (f.type === 'image') {
    return <ImageField value={value} onChange={onChange} />
  }
  if (f.type === 'checkbox') {
    // Sin valor cargado = default del campo (por defecto true; f.default:false = off).
    const checked = typeof value === 'boolean' ? value : (f.default !== false)
    return <input type="checkbox" className="cf-check" checked={checked} onChange={(e) => onChange(e.target.checked)} />
  }
  if (f.type === 'color') {
    // Color de acento: swatch (input color) + hex editable.
    // Si el campo hereda de la marca (brandDefault) y no hay valor propio cargado, se
    // muestra/aplica el color de la marca (ej. Pro Plan #d7bb77) como "heredado", con un
    // boton para volver a heredarlo si se sobreescribio.
    // Color heredado de la marca (solo si la pagina tiene marca); si no, cae al rojo,
    // igual que el mosaico (acc2 = brandSecondary || primario).
    const inheritColor = f.brandDefault ? (brandSecondary || null) : null
    const explicit = value != null && value !== ''
    // `clearable` = campo OPCIONAL cuyo vacio significa "sin color" (ej. el fondo del
    // bloque). Vacio no puede mostrarse como rojo: pareceria que ya hay un color puesto.
    const none = !!f.clearable && !explicit
    const shown = explicit ? value : (inheritColor || (f.clearable ? '#FFFFFF' : '#ED1C24'))
    return (
      <div className="cf-color">
        <input type="color" className="cf-color-sw" value={shown} onChange={(e) => onChange(e.target.value)} />
        <input className="control cf-color-hex" value={none ? '' : shown} placeholder={none ? 'Sin color' : undefined} onChange={(e) => onChange(e.target.value)} />
        {f.brandDefault && !explicit && inheritColor && <span className="cf-color-inherit">de la marca</span>}
        {f.brandDefault && explicit && <button type="button" className="btn btn-sm cf-color-reset" title="Volver al color de la marca" onClick={() => onChange('')}>↺ marca</button>}
        {f.clearable && explicit && <button type="button" className="btn btn-sm cf-color-reset" title="Quitar el color" onClick={() => onChange('')}>✕ quitar</button>}
      </div>
    )
  }
  // text / url
  return <input className="control" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={f.type === 'url' ? 'https://...' : f.placeholder} />
}

function ListField({ f, value, onChange, content }) {
  const stored = Array.isArray(value) ? value : []
  // Lista de tamaño FIJO (ej. mosaico = 6 bloques): se rellena a `fixed` y no se puede
  // agregar/quitar. Con `roles`, cada item muestra solo los subcampos de su rol.
  const fixed = f.fixed || 0
  const items = fixed ? Array.from({ length: fixed }, (_, i) => stored[i] || {}) : stored
  const setItem = (i, k, v) => onChange(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)))
  const add = () => onChange([...items, {}])
  const del = (i) => onChange(items.filter((_, j) => j !== i))
  const one = f.itemLabel || f.label
  return (
    <div className="cf-list">
      {items.map((it, i) => {
        const role = f.roles ? f.roles[i] : null
        const subs = visibleSubFields(f, role, content)
        return (
          <div key={i} className="cf-list-item">
            <div className="cf-list-head">
              <span>{one} {i + 1}{role ? ` — ${role}` : ''}</span>
              {!fixed && <button className="ic-btn" onClick={() => del(i)} title="Quitar"><X size={13} /></button>}
            </div>
            {subs.map((sf) => (
              <div key={sf.key} className="field cf-sub">
                <label>{sf.label}</label>
                <Field f={sf} value={it[sf.key]} onChange={(v) => setItem(i, sf.key, v)}
                  max={maxLengthOf(sf, content)} />
              </div>
            ))}
          </div>
        )
      })}
      {!fixed && <button className="btn btn-sm" onClick={add}><Plus size={13} /> Agregar {f.label.toLowerCase()}</button>}
    </div>
  )
}

// Panel de tamanos de imagen recomendados (Design Guidelines). Se muestra arriba
// del form; si el componente resuelve sus specs por tipo (banner, product cards),
// se actualiza al cambiar ese campo.
function SpecsPanel({ specs }) {
  if (!specs.length) return null
  return (
    <div className="cf-specs">
      <div className="cf-specs-h"><Ruler size={13} /> Tamaños de imagen recomendados</div>
      {specs.map((s, i) => (
        <div key={i} className="cf-spec">
          {s.label && <div className="cf-spec-label">{s.label}</div>}
          {s.ratio && <div className="cf-spec-ratio">{s.ratio}</div>}
          <div className="cf-spec-grid">
            {s.desktop && <div><span>Desktop</span> {s.desktop}</div>}
            {s.mobile && <div><span>Mobile</span> {s.mobile}</div>}
            {s.max && <div><span>Max</span> {s.max}</div>}
            {s.format && <div><span>Formato</span> {s.format}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ContentForm({ component, draft, onChange, brandSecondary }) {
  const set = (key) => (val) => onChange({ ...draft, [key]: val })
  const one = (f) => (
    <div key={f.key} className="field">
      <label>{f.label}</label>
      {f.type === 'list'
        ? <ListField f={f} value={draft[f.key]} onChange={set(f.key)} content={draft} />
        : <Field f={f} value={draft[f.key]} onChange={set(f.key)} brandSecondary={brandSecondary}
            max={maxLengthOf(f, draft)} />}
      {/* Aclaracion del catalogo (ej. que un token no se pinta en el mockup). */}
      {f.hint && <div className="hint">{f.hint}</div>}
    </div>
  )
  // El form replica los DESPLEGABLES del formulario de Drupal, que son de dos clases:
  //   - `group` ("Avanzado (CMS)", "Classy"): config tecnica, va CERRADA para que no
  //     tape los campos de contenido.
  //   - `cmsGroup` ("Optional fields"): ahi adentro estan el titulo, el subtitulo, sus
  //     HTML tag y sus Title/SubTitle Size, y el CTA. Va ABIERTA: son campos de
  //     contenido que se cargan todo el tiempo, la seccion esta para que se vea DONDE
  //     hay que buscarlos en el CMS, no para esconderlos.
  // Los grupos se dibujan EN EL LUGAR de su primer campo, no al final: hay componentes
  // (el Card Grid) que tienen campos sueltos despues del desplegable.
  const fields = visibleFields(component, draft)
  const nameOf = (f) => f.group || f.cmsGroup || null
  const blocks = []
  const seen = new Set()
  for (const f of fields) {
    const g = nameOf(f)
    if (!g) { blocks.push({ field: f }); continue }
    if (seen.has(g)) continue
    seen.add(g)
    blocks.push({ name: g, open: !f.group, fields: fields.filter((x) => nameOf(x) === g) })
  }
  return (
    <div className="cf">
      <SpecsPanel specs={getSpecs(component, draft)} />
      {/* Campos filtrados por tipo (ej. Banner Type oculta/muestra campos). */}
      {blocks.map((b) => {
        if (b.field) return one(b.field)
        const cargados = b.fields.filter((f) => draft[f.key] !== undefined && draft[f.key] !== '' && draft[f.key] !== false).length
        return (
          <details key={b.name} className="cf-group" open={b.open}>
            <summary>{b.name}{cargados > 0 && <span className="cf-group-n">{cargados}</span>}</summary>
            {b.fields.map(one)}
          </details>
        )
      })}
    </div>
  )
}
