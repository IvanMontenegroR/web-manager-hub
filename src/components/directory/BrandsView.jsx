import { useEffect, useMemo, useState } from 'react'
import { Tag, Plus, Database, ExternalLink, Pencil, Search, User } from 'lucide-react'
import { fetchBrands, seedBrands } from '../../lib/directoryDb'
import BrandModal from './BrandModal.jsx'
import SetupNotice from './SetupNotice.jsx'

export default function BrandsView({ registerNewHandler, ownerNames = [] }) {
  const [rows, setRows] = useState([])
  const [state, setState] = useState('loading')
  const [errMsg, setErrMsg] = useState(null)
  const [modal, setModal] = useState(null)
  const [q, setQ] = useState('')

  async function load() {
    setState('loading')
    const { data, error, tableMissing } = await fetchBrands()
    if (tableMissing) return setState('missing')
    if (error) { setErrMsg(error.message); return setState('error') }
    setRows(data); setState('ok')
  }
  useEffect(() => { load() }, [])

  const nextSort = useMemo(() => rows.reduce((m, r) => Math.max(m, r.sort_order || 0), 0) + 1, [rows])
  useEffect(() => { registerNewHandler?.(() => () => setModal({})) }, [registerNewHandler, nextSort])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) =>
      [r.name, r.species, ...(r.owners || [])].some((x) => String(x || '').toLowerCase().includes(s)))
  }, [rows, q])

  if (state === 'loading') return <div className="center-state"><div className="spinner" /><div>Cargando...</div></div>
  if (state === 'missing') return <SetupNotice />
  if (state === 'error') return <div className="center-state"><div style={{ color: 'var(--danger)', fontWeight: 600 }}>No se pudo cargar</div><div style={{ fontSize: 13 }}>{errMsg}</div><button className="btn" onClick={load}>Reintentar</button></div>

  return (
    <div className="dir-panel">
      {rows.length === 0 ? (
        <div className="dir-empty">
          <Tag size={26} />
          <div className="dir-empty-t">Sin marcas</div>
          <p>Cargá las marcas iniciales (Friskies, Fancy Feast, Felix, Beneful, Chows, Purina One, Pro Plan) o creá a mano.</p>
          <div className="dir-empty-actions">
            <button className="btn btn-primary" onClick={async () => { await seedBrands(); load() }}>
              <Database size={15} /> Cargar iniciales
            </button>
            <button className="btn" onClick={() => setModal({})}><Plus size={15} /> Crear a mano</button>
          </div>
        </div>
      ) : (
        <>
          <div className="dir-toolbar">
            <div className="dir-search">
              <Search size={14} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar marca, especie o responsable..." />
            </div>
            <span className="dir-count">{filtered.length} / {rows.length}</span>
          </div>
          <div className="dir-grid brands">
            {filtered.map((b) => (
              <div key={b.id} className="brand-card" onClick={() => setModal(b)}>
                <div className="brand-top">
                  <div className="brand-name">{b.name}</div>
                  {b.species && <span className={`brand-species ${b.species.toLowerCase()}`}>{b.species}</span>}
                  <Pencil size={13} className="brand-edit" />
                </div>
                {(b.owners?.length > 0) && (
                  <div className="brand-owners">
                    {b.owners.map((o) => <span key={o} className="dir-chip owner"><User size={11} /> {o}</span>)}
                  </div>
                )}
                {b.guidelines && <div className="brand-guidelines">{b.guidelines}</div>}
                {(b.links?.length > 0) && (
                  <div className="brand-links">
                    {b.links.map((l, i) => (
                      <a key={i} href={l.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink size={12} /> {l.label || l.url}
                      </a>
                    ))}
                  </div>
                )}
                {b.notes && <div className="brand-notes">{b.notes}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {modal && (
        <BrandModal
          item={modal.id ? modal : undefined}
          suggestOwners={ownerNames}
          nextSort={nextSort}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
