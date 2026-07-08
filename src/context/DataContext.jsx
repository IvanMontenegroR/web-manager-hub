import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAll } from '../lib/db'
import { detectOverlaps, detectDelays, enrich } from '../lib/analysis'

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
    // Mapa partner_id -> Set de feriados (ISO) para el calculo de dias habiles.
    const holidaysByPartner = new Map()
    for (const h of state.holidays) {
      if (!h.partner_id) continue
      if (!holidaysByPartner.has(h.partner_id)) holidaysByPartner.set(h.partner_id, new Set())
      holidaysByPartner.get(h.partner_id).add(h.date)
    }
    // Los proyectos archivados no participan del cronograma activo ni del analisis.
    const archivedIds = new Set(state.projects.filter((p) => p.archived).map((p) => p.id))
    const enriched = enrich(state.tasks, holidaysByPartner)
    const active = enriched.filter((t) => !archivedIds.has(t.project_id))
    const { pairs, conflictIds } = detectOverlaps(active, holidaysByPartner)
    const delays = detectDelays(active)
    return { pairs, conflictIds, delays, enriched, archivedIds, holidaysByPartner }
  }, [state.tasks, state.projects, state.holidays])

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
