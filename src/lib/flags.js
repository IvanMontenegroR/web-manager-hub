// Banderas SVG reales (flag-icons) para los mercados LATAM. Importamos solo las
// que usamos, asi Vite emite unicamente estos assets y no las 260 del paquete.
// Se usan SVG en vez del emoji de bandera porque Windows/Chrome no trae glifos
// de bandera en su fuente de emoji y cae al texto ("AR", "MX", ...).
import ar from 'flag-icons/flags/4x3/ar.svg'
import bo from 'flag-icons/flags/4x3/bo.svg'
import br from 'flag-icons/flags/4x3/br.svg'
import cl from 'flag-icons/flags/4x3/cl.svg'
import co from 'flag-icons/flags/4x3/co.svg'
import cr from 'flag-icons/flags/4x3/cr.svg'
import doo from 'flag-icons/flags/4x3/do.svg'
import ec from 'flag-icons/flags/4x3/ec.svg'
import gt from 'flag-icons/flags/4x3/gt.svg'
import hn from 'flag-icons/flags/4x3/hn.svg'
import mx from 'flag-icons/flags/4x3/mx.svg'
import ni from 'flag-icons/flags/4x3/ni.svg'
import pa from 'flag-icons/flags/4x3/pa.svg'
import pe from 'flag-icons/flags/4x3/pe.svg'
import py from 'flag-icons/flags/4x3/py.svg'
import sv from 'flag-icons/flags/4x3/sv.svg'
import uy from 'flag-icons/flags/4x3/uy.svg'
import ve from 'flag-icons/flags/4x3/ve.svg'

// La clave es el `market`/`country` de la app. BR-SP (Sao Paulo) usa la bandera de Brasil.
const FLAGS = {
  AR: ar, BO: bo, BR: br, 'BR-SP': br, CL: cl, CO: co, CR: cr, DO: doo, EC: ec,
  GT: gt, HN: hn, MX: mx, NI: ni, PA: pa, PE: pe, PY: py, SV: sv, UY: uy, VE: ve,
}

// Devuelve la URL del SVG de bandera para un codigo de mercado, o null si no hay.
export function flagSrc(code) {
  if (!code) return null
  return FLAGS[code.trim().toUpperCase()] || null
}
