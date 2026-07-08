// Helpers de color para las barras de partner: contraste de texto y tintes.
function hexToRgb(hex) {
  const h = (hex || '#888888').replace('#', '')
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(v, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

// Luminancia relativa (WCAG) para decidir texto claro u oscuro.
function luminance({ r, g, b }) {
  const a = [r, g, b].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
}

// Devuelve texto negro o blanco segun el fondo del partner.
export function textOn(hex) {
  return luminance(hexToRgb(hex)) > 0.5 ? '#1a1a1a' : '#ffffff'
}

// Version translucida del color (para tintes de fila / fondos suaves).
export function tint(hex, alpha = 0.12) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function partnerColor(partners, id, fallback = '#9aa0a6') {
  const p = partners.find((x) => x.id === id)
  return p?.color || fallback
}

export function partnerName(partners, id, fallback = 'Sin partner') {
  const p = partners.find((x) => x.id === id)
  return p?.name || fallback
}

// Color de la barra segun el estado de la tarea (mismos tonos que las vars del CSS).
// El retraso NO es un estado: se detecta y dibuja aparte (extension rayada roja).
export const STATUS_COLORS = {
  Pendiente: '#868e99', // gris (--ink-3)
  'En curso': '#2e6fd0', // azul (--info)
  Completado: '#2f8f5b', // verde (--ok)
}

export function statusColor(status, fallback = '#868e99') {
  return STATUS_COLORS[status] || fallback
}
