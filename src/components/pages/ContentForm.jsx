import { useRef, useState } from 'react'
import { Plus, X, Image as ImageIcon, Ruler, Upload } from 'lucide-react'
import { getSpecs, visibleFields } from '../../data/components'
import { uploadMedia, isVideoUrl } from '../../lib/storageDb'

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
function Field({ f, value, onChange }) {
  if (f.type === 'textarea') {
    return <textarea className="control" rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} />
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
    // Sin valor cargado = mostrado por defecto (value !== false).
    return <input type="checkbox" className="cf-check" checked={value !== false} onChange={(e) => onChange(e.target.checked)} />
  }
  if (f.type === 'color') {
    // Color de acento: swatch (input color) + hex editable. Default rojo Purina.
    const v = value || '#ED1C24'
    return (
      <div className="cf-color">
        <input type="color" className="cf-color-sw" value={v} onChange={(e) => onChange(e.target.value)} />
        <input className="control cf-color-hex" value={v} onChange={(e) => onChange(e.target.value)} />
      </div>
    )
  }
  // text / url
  return <input className="control" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={f.type === 'url' ? 'https://...' : f.placeholder} />
}

function ListField({ f, value, onChange }) {
  const items = Array.isArray(value) ? value : []
  const setItem = (i, k, v) => onChange(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)))
  const add = () => onChange([...items, {}])
  const del = (i) => onChange(items.filter((_, j) => j !== i))
  return (
    <div className="cf-list">
      {items.map((it, i) => (
        <div key={i} className="cf-list-item">
          <div className="cf-list-head">
            <span>{f.label} {i + 1}</span>
            <button className="ic-btn" onClick={() => del(i)} title="Quitar"><X size={13} /></button>
          </div>
          {f.item.map((sf) => (
            <div key={sf.key} className="field cf-sub">
              <label>{sf.label}</label>
              <Field f={sf} value={it[sf.key]} onChange={(v) => setItem(i, sf.key, v)} />
            </div>
          ))}
        </div>
      ))}
      <button className="btn btn-sm" onClick={add}><Plus size={13} /> Agregar {f.label.toLowerCase()}</button>
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

export default function ContentForm({ component, draft, onChange }) {
  const set = (key) => (val) => onChange({ ...draft, [key]: val })
  return (
    <div className="cf">
      <SpecsPanel specs={getSpecs(component, draft)} />
      {/* Campos filtrados por tipo (ej. Banner Type oculta/muestra campos). */}
      {visibleFields(component, draft).map((f) => (
        <div key={f.key} className="field">
          <label>{f.label}</label>
          {f.type === 'list'
            ? <ListField f={f} value={draft[f.key]} onChange={set(f.key)} />
            : <Field f={f} value={draft[f.key]} onChange={set(f.key)} />}
        </div>
      ))}
    </div>
  )
}
