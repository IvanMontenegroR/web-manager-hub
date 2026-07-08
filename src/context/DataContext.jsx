import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAll } from '../lib/db'
import { detectOverlaps, detectDelays, withDerived } from '../lib/analysis'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [state, setState] = useState({
    partners: [],
    slas: [],
    projects: [],
    tasks: [],
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
    // Los proyectos archivados no participan del cronograma activo ni del analisis.
    const archivedIds = new Set(state.projects.filter((p) => p.archived).map((p) => p.id))
    const activeTasks = state.tasks.filter((t) => !archivedIds.has(t.project_id))
    const { pairs, conflictIds } = detectOverlaps(activeTasks)
    const delays = detectDelays(activeTasks)
    const enriched = state.tasks.map(withDerived)
    return { pairs, conflictIds, delays, enriched, archivedIds }
  }, [state.tasks, state.projects])

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
