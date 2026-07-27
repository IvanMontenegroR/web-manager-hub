import { useState } from 'react'
import { Database, Copy, Check } from 'lucide-react'
import { SETUP_SQL } from '../../lib/directoryDb'

// Se muestra si las tablas del directorio no existen todavia. El usuario corre el
// SQL una vez en el editor de Supabase (proyecto Purina-Hub) y recarga.
export default function SetupNotice() {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(SETUP_SQL); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }
  return (
    <div className="dir-setup">
      <div className="dir-setup-head">
        <Database size={18} color="var(--purina)" />
        <div>
          <h3>Falta crear las tablas del directorio</h3>
          <p>Corré este SQL una vez en el editor de Supabase (proyecto Purina-Hub) y recargá.</p>
        </div>
        <button className="btn btn-sm" onClick={copy} style={{ marginLeft: 'auto' }}>
          {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
        </button>
      </div>
      <pre className="dir-setup-sql">{SETUP_SQL}</pre>
    </div>
  )
}
