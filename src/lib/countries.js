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

// True si el partner es "Purina Región" (nombre contiene "region"/"región").
// Purina se divide en dos: "Purina Región" (feriados del pais elegido por
// proyecto) y "Purina Mercado" (feriados del market del proyecto).
export function isPurinaRegion(partner) {
  return !partner?.country && /regi[oó]n/i.test(partner?.name || '')
}

// Calendario que aplica a una tarea:
// - Partner con pais propio (agencias): su pais.
// - Purina Región: el pais de feriados elegido en el proyecto (region_country),
//   con fallback al market si no se cargo.
// - Purina Mercado / cualquier otro sin pais: el market del proyecto.
export function taskCountry(partner, project) {
  if (partner?.country) return partner.country
  if (isPurinaRegion(partner)) return project?.region_country || project?.market || null
  return project?.market || null
}
