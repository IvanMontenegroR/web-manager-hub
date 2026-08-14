import { useEffect, useState } from 'react'
import { Timer, RotateCw, Plus, Check, Trash2, Pencil, Tag, Users } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { createSla, updateSla, deleteSla } from '../lib/db'
import { SEED_BRANDS, SEED_STAKEHOLDERS } from '../lib/directoryDb'
import SlaItemModal from '../components/modals/SlaItemModal.jsx'
import BrandsView from '../components/directory/BrandsView.jsx'
import StakeholdersView from '../components/directory/StakeholdersView.jsx'

// Hub de Referencias: info de consulta siempre a mano. Tres secciones:
//   - SLAs: fases internas (General) + tablas por agencia (lo que antes era el modulo SLAs)
//   - Marcas: ficha por marca (responsables, guidelines, links, notas)
//   - Stakeholders: directorio de personas y de que se encargan
const SECTIONS = [
  { id: 'slas', label: 'SLAs', icon: Timer },
  { id: 'brands', label: 'Marcas', icon: Tag },
  { id: 'people', label: 'Stakeholders', icon: Users },
]

// Sugerencias base para los datalists de los modales (marcas <-> responsables).
const SEED_BRAND_NAMES = SEED_BRANDS.map((b) => b.name)
const SEED_OWNER_NAMES = SEED_STAKEHOLDERS.map((s) => s.name)

export default function Referencias() {
  const [section, setSection] = useState(() => localStorage.getItem('wmh_ref_section') || 'slas')
  useEffect(() => { localStorage.setItem('wmh_ref_section', section) }, [section])
  // Handlers "nuevo" que exponen las vistas de Marcas/Stakeholders para la topbar.
  const [newBrand, setNewBrand] = useState(null)
  const [newPerson, setNewPerson] = useState(null)

  const sub = section === 'slas'
    ? 'Fases internas y tablas por agencia'
    : section === 'brands'
      ? 'Responsables, guidelines y links por marca'
      : 'Quién se encarga de qué — contactos'

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Referencias</h1>
          <div className="sub">{sub}</div>
        </div>
        <div className="topbar-actions">
          {section === 'brands' && newBrand && (
            <button className="btn btn-primary" onClick={newBrand}><Plus size={16} /> Nueva marca</button>
          )}
          {section === 'people' && newPerson && (
            <button className="btn btn-primary" onClick={newPerson}><Plus size={16} /> Nueva persona</button>
          )}
        </div>
      </div>

      <div className="content">
        <div className="ref-nav">
          {SECTIONS.map((s) => {
            const Icon = s.icon
            return (
              <button key={s.id} className={`ref-nav-btn${section === s.id ? ' active' : ''}`} onClick={() => setSection(s.id)}>
                <Icon size={15} /> {s.label}
              </button>
            )
          })}
        </div>

        {section === 'slas' && <SlasSection />}
        {section === 'brands' && <BrandsView registerNewHandler={setNewBrand} ownerNames={SEED_OWNER_NAMES} />}
        {section === 'people' && <StakeholdersView registerNewHandler={setNewPerson} brandNames={SEED_BRAND_NAMES} />}
      </div>
    </>
  )
}

// --- Seccion SLAs: lo que antes era el modulo completo (General + agencias). ---
function SlasSection() {
  const { partners, slas, partnerSlas, loading, error, refresh } = useData()
  // Una pestaña por agencia que tenga SLAs cargados (antes era una lista fija). Asi,
  // al cargar los SLAs de una agencia nueva su pestaña aparece sola.
  const withSlas = new Set(partnerSlas.map((s) => s.partner_id))
  const slaPartners = partners.filter((p) => withSlas.has(p.id))
  const [tab, setTab] = useState(() => localStorage.getItem('wmh_sla_tab') || 'general')
  const [modal, setModal] = useState(null) // { item?, partnerId, partnerName, prefill? }
  useEffect(() => { localStorage.setItem('wmh_sla_tab', tab) }, [tab])
  // Si el tab guardado es un partner que ya no aplica, cae a General.
  const validTab = tab === 'general' || slaPartners.some((p) => p.id === tab) ? tab : 'general'

  const openEdit = (item, p) => setModal({ item, partnerId: p.id, partnerName: p.name })
  const openNew = (p, prefill) => setModal({ partnerId: p.id, partnerName: p.name, prefill })
  const nextSort = partnerSlas.reduce((m, s) => Math.max(m, s.sort_order || 0), 0) + 1

  if (loading) return <div className="center-state"><div className="spinner" /><div>Cargando SLAs...</div></div>
  if (error) return (
    <div className="center-state">
      <div style={{ color: 'var(--danger)', fontWeight: 600 }}>No se pudo cargar</div>
      <div style={{ fontSize: 13 }}>{error}</div>
      <button className="btn" onClick={refresh}><RotateCw size={15} /> Reintentar</button>
    </div>
  )

  return (
    <>
      <div className="sla-tabs">
        <button className={`sla-tab${validTab === 'general' ? ' active' : ''}`} onClick={() => setTab('general')}>
          General <span className="sla-tab-sub">fases / autofill</span>
        </button>
        {slaPartners.map((p) => (
          <button
            key={p.id}
            className={`sla-tab${validTab === p.id ? ' active' : ''}`}
            style={validTab === p.id ? { borderBottomColor: p.color } : undefined}
            onClick={() => setTab(p.id)}
          >
            <span className="sla-tab-dot" style={{ background: p.color }} /> {p.name}
          </button>
        ))}
        <button className="btn btn-icon sla-reload" title="Recargar" onClick={refresh}><RotateCw size={15} /></button>
        {validTab !== 'general' && (
          <button className="btn btn-primary btn-sm" onClick={() => openNew(slaPartners.find((p) => p.id === validTab))}>
            <Plus size={15} /> Nueva fila
          </button>
        )}
      </div>

      {validTab === 'general'
        ? <GeneralTab slas={slas} refresh={refresh} />
        : <PartnerTab rows={partnerSlas.filter((s) => s.partner_id === validTab)} partner={slaPartners.find((p) => p.id === validTab)} openEdit={openEdit} openNew={openNew} />}

      {modal && (
        <SlaItemModal
          item={modal.item}
          prefill={modal.prefill}
          partnerId={modal.partnerId}
          partnerName={modal.partnerName}
          categories={[...new Set(partnerSlas.filter((s) => s.partner_id === modal.partnerId).map((s) => s.category).filter(Boolean))]}
          tiers={[...new Set(partnerSlas.filter((s) => s.partner_id === modal.partnerId).map((s) => s.tier).filter(Boolean))]}
          nextSort={nextSort}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
    </>
  )
}

// --- General: fases internas (sla_definitions) editables inline. Alimentan el autofill de tareas. ---
function GeneralTab({ slas, refresh }) {
  const [draft, setDraft] = useState({})
  const [nw, setNw] = useState({ action_name: '', sla_days: 1 })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const val = (s, k) => (draft[s.id]?.[k] ?? s[k])
  const edit = (id, k, v) => setDraft((d) => ({ ...d, [id]: { ...d[id], [k]: v } }))
  const run = async (fn) => { setBusy(true); setErr(null); try { await fn(); await refresh() } catch (e) { setErr(e.message) } finally { setBusy(false) } }
  const saveRow = (s) => run(async () => { await updateSla(s.id, { action_name: val(s, 'action_name'), sla_days: val(s, 'sla_days') }); setDraft((d) => { const c = { ...d }; delete c[s.id]; return c }) })
  const add = () => {
    if (!nw.action_name.trim()) return setErr('El nombre de la accion es obligatorio.')
    if (Number(nw.sla_days) < 1) return setErr('Los dias SLA deben ser 1 o mas.')
    run(async () => { await createSla(nw); setNw({ action_name: '', sla_days: 1 }) })
  }
  return (
    <div className="sla-panel">
      <p className="hint" style={{ marginTop: 0 }}>
        Fases internas del cronograma. Los dias (habiles) autocompletan una tarea nueva al elegir la accion
        (siempre editable por tarea). Es lo que antes estaba en Admin → SLAs.
      </p>
      {err && <div className="form-error">{err}</div>}
      <table className="mtable" style={{ maxWidth: 560 }}>
        <thead><tr><th>Accion</th><th style={{ width: 110 }}>Dias SLA</th><th style={{ width: 90 }}></th></tr></thead>
        <tbody>
          {slas.map((s) => {
            const dirty = !!draft[s.id]
            return (
              <tr key={s.id}>
                <td><input className="control" value={val(s, 'action_name')} onChange={(e) => edit(s.id, 'action_name', e.target.value)} /></td>
                <td><input type="number" min="1" className="control" value={val(s, 'sla_days')} onChange={(e) => edit(s.id, 'sla_days', e.target.value)} /></td>
                <td>
                  <div className="row-actions">
                    {dirty && <button className="btn btn-sm btn-primary btn-icon" title="Guardar" disabled={busy} onClick={() => saveRow(s)}><Check size={14} /></button>}
                    <button className="btn btn-sm btn-danger btn-icon" title="Borrar" disabled={busy}
                      onClick={() => confirm(`Borrar SLA ${s.action_name}?`) && run(() => deleteSla(s.id))}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            )
          })}
          <tr>
            <td><input className="control" placeholder="Nueva accion" value={nw.action_name} onChange={(e) => setNw((n) => ({ ...n, action_name: e.target.value }))} /></td>
            <td><input type="number" min="1" className="control" value={nw.sla_days} onChange={(e) => setNw((n) => ({ ...n, sla_days: e.target.value }))} /></td>
            <td><div className="row-actions"><button className="btn btn-sm btn-icon" title="Agregar" disabled={busy} onClick={add}><Plus size={14} /></button></div></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// --- Partner: tablas de referencia, agrupadas por categoria y pivoteadas por volumen. ---
function PartnerTab({ rows, partner, openEdit, openNew }) {
  if (!partner) return null
  if (rows.length === 0) {
    return (
      <div className="sla-panel">
        <div className="panel-empty">Sin SLAs cargados para {partner.name}. Agregalos con “Nueva fila”.</div>
      </div>
    )
  }
  // Agrupar por categoria preservando el orden (rows ya vienen por sort_order).
  const cats = []; const byCat = new Map()
  for (const r of rows) { if (!byCat.has(r.category)) { byCat.set(r.category, []); cats.push(r.category) } byCat.get(r.category).push(r) }

  return (
    <div className="sla-panel">
      {cats.map((cat) => {
        const cr = byCat.get(cat)
        const tiers = []
        for (const r of cr) if (r.tier && !tiers.includes(r.tier)) tiers.push(r.tier)

        if (tiers.length === 0) {
          return (
            <div className="sla-group" key={cat || '_'}>
              <div className="sla-cat">{cat || '—'}</div>
              <table className="sla-table">
                <tbody>
                  {cr.map((r) => (
                    <tr key={r.id} className="clickable" onClick={() => openEdit(r, partner)}>
                      <td className="sla-act">{r.activity}</td>
                      <td className="sla-val">{r.value}</td>
                      <td className="sla-edit"><Pencil size={12} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        // Matriz: actividades (filas) x tiers (columnas).
        const acts = []; const cell = {}; const merged = {}
        for (const r of cr) {
          if (!acts.includes(r.activity)) acts.push(r.activity)
          if (r.tier) { (cell[r.activity] || (cell[r.activity] = {}))[r.tier] = r }
          else merged[r.activity] = r
        }
        return (
          <div className="sla-group" key={cat}>
            <div className="sla-cat">{cat}</div>
            <div className="sla-table-wrap">
              <table className="sla-table matrix">
                <thead>
                  <tr><th className="sla-act">Actividad</th>{tiers.map((t) => <th key={t}>{t}</th>)}</tr>
                </thead>
                <tbody>
                  {acts.map((a) => {
                    const m = merged[a]
                    if (m && !cell[a]) {
                      return (
                        <tr key={a}>
                          <td className="sla-act">{a}</td>
                          <td className="sla-val merged clickable" colSpan={tiers.length} onClick={() => openEdit(m, partner)}>{m.value}</td>
                        </tr>
                      )
                    }
                    return (
                      <tr key={a}>
                        <td className="sla-act">{a}</td>
                        {tiers.map((t) => {
                          const r = cell[a]?.[t]
                          return (
                            <td key={t} className="sla-val clickable"
                              onClick={() => (r ? openEdit(r, partner) : openNew(partner, { category: cat, activity: a, tier: t }))}>
                              {r ? r.value : <span className="sla-empty">＋</span>}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
