import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAll } from '../lib/db'
import { detectOverlaps, detectDelays, withDerived } from '../lib/analysis'
import { computeProjection } from '../lib/projection'
import { taskCountry } from '../lib/countries'
import { toISO } from '../lib/dates'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [state, setState] = useState({
    partners: [],
    slas: [],
    projects: [],
    tasks: [],
    holidays: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchAll()
      setState(data)
    } catch (e) {
      setError(e.message || 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const derived = useMemo(() => {
    // Mapa country -> Set de feriados (ISO) para el calculo de dias habiles.
    const holidaysByCountry = new Map()
    for (const h of state.holidays) {
      if (!h.country) continue
      if (!holidaysByCountry.has(h.country)) holidaysByCountry.set(h.country, new Set())
      holidaysByCountry.get(h.country).add(h.date)
    }
    const partnerById = new Map(state.partners.map((p) => [p.id, p]))
    const projectById = new Map(state.projects.map((p) => [p.id, p]))
    // Los proyectos archivados no participan del cronograma activo ni del analisis.
    const archivedIds = new Set(state.projects.filter((p) => p.archived).map((p) => p.id))
    const today = toISO(new Date())

    const enriched = state.tasks.map((t) => {
      // Calendario de la tarea: pais del partner, o si no tiene, el market del proyecto.
      const country = taskCountry(partnerById.get(t.partner_id), projectById.get(t.project_id))
      const base = holidaysByCountry.get(country)
      // Feriados efectivos = los del pais menos los excluidos puntualmente en la tarea.
      let hol = base
      const excl = t.excluded_holidays
      if (base && Array.isArray(excl) && excl.length) {
        hol = new Set(base)
        for (const d of excl) hol.delete(d)
      }
      const d = withDerived(t, hol, today)
      d.country = country
      d.holidaysSet = hol || null
      return d
    })

    // Proyeccion no destructiva del arrastre por dependencias.
    const proj = computeProjection(enriched, today)
    const byId = new Map(enriched.map((t) => [t.id, t]))
    for (const t of enriched) {
      const p = proj.get(t.id)
      if (!p) continue
      t.projStart = p.projStart
      t.projEnd = p.projEnd
      t.effEnd = p.effEnd
      t.pushed = p.pushed
      t.pushedBy = p.pushedBy
      t.pushedByName = p.pushedBy ? byId.get(p.pushedBy)?.action_name || null : null
      // Fin de la barra REAL/proyectada: si arranco, hasta el fin efectivo (o hoy);
      // si no arranco, hasta su fin proyectado.
      const started = !!t.actual_start || !!t.actual_end || t.status === 'En curso'
      t.renderStart = p.projStart
      t.renderEnd = started ? p.effEnd : p.projEnd
      // Guard: nunca dibujar una barra invertida (fin antes que inicio) por datos malos.
      if (t.renderEnd && t.renderStart && t.renderEnd < t.renderStart) t.renderEnd = t.renderStart
    }

    const active = enriched.filter((t) => !archivedIds.has(t.project_id))
    const { pairs, conflictIds } = detectOverlaps(active)
    const delays = detectDelays(active)
    return { pairs, conflictIds, delays, enriched, archivedIds, holidaysByCountry }
  }, [state.tasks, state.projects, state.partners, state.holidays])

  const value = useMemo(
    () => ({ ...state, ...derived, loading, error, refresh }),
    [state, derived, loading, error, refresh]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData debe usarse dentro de DataProvider')
  return ctx
}
