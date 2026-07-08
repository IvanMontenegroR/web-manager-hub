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
    const { pairs, conflictIds } = detectOverlaps(state.tasks)
    const delays = detectDelays(state.tasks)
    const enriched = state.tasks.map(withDerived)
    return { pairs, conflictIds, delays, enriched }
  }, [state.tasks])

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
