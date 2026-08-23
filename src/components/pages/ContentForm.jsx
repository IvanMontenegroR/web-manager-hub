import { useRef, useState } from 'react'
import { Plus, X, Image as ImageIcon, Ruler, Upload, Link2 } from 'lucide-react'
import { getSpecs, visibleFields, visibleSubFields } from '../../data/components'
import { uploadMedia, isVideoUrl } from '../../lib/storageDb'
import { wrapLink, hasLinks } from '../../lib/richText'

// Cuerpo de texto con enlaces: seleccionas un pedazo y "Enlace" lo marca como
// [texto](url). Esa notacion viaja tal cual al Excel, asi que el enlace queda dentro
// de la misma celda del parrafo (ver src/lib/richText.js).
function TextAreaField({ f, value, onChange }) {
  const ref = useRef(null)
  function addLink() {
    const el = ref.current
    if (!el) return
    const url = prompt('Link de destino (https://...)')
    if (!url || !url.trim()) return
    const { value: next, selection } = wrapLink(value || '', el.selectionStart, el.selectionEnd, url.trim())
    onChange(next)
    // Devolver el foco con el texto del enlace seleccionado, para poder reescribirlo.
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(selection[0], selection[1]) })
  }
  return (
    <div className="cf-rt">
      <textarea ref={ref} className="control" rows={3} value={value || ''}
        onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} />
      <div className="cf-rt-bar">
        <button type="button" className="btn btn-sm" onClick={addLink} title="Marcar el texto seleccionado como enlace">
          <Link2 size={13} /> Enlace
        </button>
        {hasLinks(value) && <span className="cf-rt-hint">Los enlaces se marcan [texto](link)</span>}
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
function Field({ f, value, onChange, brandSecondary }) {
  if (f.type === 'textarea') {
    return <TextAreaField f={f} value={value} onChange={onChange} />
  }
  if (f.type === 'select') {
    return (
      <select className="control" value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
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
                <Field f={sf} value={it[sf.key]} onChange={(v) => setItem(i, sf.key, v)} />
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
        : <Field f={f} value={draft[f.key]} onChange={set(f.key)} brandSecondary={brandSecondary} />}
      {/* Aclaracion del catalogo (ej. que un token no se pinta en el mockup). */}
      {f.hint && <div className="hint">{f.hint}</div>}
    </div>
  )
  // Los campos con `group` (ej. "Avanzado (CMS)") se juntan en una seccion plegable al
  // final, para que la config tecnica del CMS no tape los campos de contenido.
  const fields = visibleFields(component, draft)
  const plain = fields.filter((f) => !f.group)
  const groups = []
  for (const f of fields.filter((f) => f.group)) {
    const g = groups.find((x) => x.name === f.group) || (groups.push({ name: f.group, fields: [] }), groups[groups.length - 1])
    g.fields.push(f)
  }
  return (
    <div className="cf">
      <SpecsPanel specs={getSpecs(component, draft)} />
      {/* Campos filtrados por tipo (ej. Banner Type oculta/muestra campos). */}
      {plain.map(one)}
      {groups.map((g) => {
        const cargados = g.fields.filter((f) => draft[f.key] !== undefined && draft[f.key] !== '' && draft[f.key] !== false).length
        return (
          <details key={g.name} className="cf-group">
            <summary>{g.name}{cargados > 0 && <span className="cf-group-n">{cargados}</span>}</summary>
            {g.fields.map(one)}
          </details>
        )
      })}
    </div>
  )
}
