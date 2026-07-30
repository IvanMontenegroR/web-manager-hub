import { Plus, X, Image as ImageIcon, Ruler } from 'lucide-react'
import { getSpecs } from '../../data/components'

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
    return (
      <div className="cf-img">
        <input className="control" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="URL de la imagen (https://...)" />
        {value ? <img className="cf-img-thumb" src={value} alt="" /> : <div className="cf-img-thumb ph"><ImageIcon size={14} /></div>}
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
      {component.fields.map((f) => (
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
