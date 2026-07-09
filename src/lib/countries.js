// Paises / calendarios de feriados. El `code` es la clave usada en la tabla holidays
// (y coincide con el `market` de projects para la resolucion de Purina).
export const COUNTRIES = [
  { code: 'MX', name: 'México' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'AR', name: 'Argentina' },
  { code: 'BR', name: 'Brasil (nacional)' },
  { code: 'BR-SP', name: 'Brasil – São Paulo' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'PA', name: 'Panamá' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'DO', name: 'Rep. Dominicana' },
  { code: 'HN', name: 'Honduras' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'SV', name: 'El Salvador' },
]

export function countryName(code) {
  if (!code) return '—'
  return COUNTRIES.find((c) => c.code === code)?.name || code
}

// Calendario que aplica a una tarea: el pais del partner responsable, o si el
// partner no tiene pais (ej. Purina), el market del proyecto.
export function taskCountry(partner, project) {
  return partner?.country || project?.market || null
}
