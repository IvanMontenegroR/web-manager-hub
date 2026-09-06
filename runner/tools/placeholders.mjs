// Genera imagenes PLACEHOLDER con las medidas EXACTAS que pide cada componente, para
// subirlas una vez a la Media library y tener siempre algo que elegir mientras se arma
// una pagina de prueba.
//
//   node tools/placeholders.mjs [carpeta-destino]
//
// Las medidas NO se escriben a mano: salen del catalogo del hub (`src/data/components.js`),
// que es la misma fuente que usa la matriz de contenido. Si ahi cambia una medida, se
// vuelve a correr esto y listo.
//
// Es un generador de UNA VEZ, no parte del runner: por eso vive en tools/ y es lo unico
// que mira fuera de la carpeta. Usa el Chrome del sistema para dibujar y capturar, asi
// no hace falta ninguna libreria de imagenes.
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { openBrowser } from '../src/browser.js'
import { COMPONENTS, BANNER_TYPES, CARD_GRID_MODES } from '../../src/data/components.js'

// La variante se guarda con el valor de MAQUINA; en la imagen va la etiqueta que ve el
// editor, que es como la va a buscar.
const ETIQUETAS = Object.fromEntries([...(BANNER_TYPES || []), ...(CARD_GRID_MODES || [])]
  .map((o) => [o.value, o.label]))

const DESTINO = resolve(process.argv[2] || 'placeholders')
const CHROME = process.env.RUNNER_CHROME

// Una entrada por medida concreta: componente + variante + campo + desktop/mobile.
function medidas() {
  const out = []
  const agregar = (comp, variante, s) => {
    for (const vista of ['desktop', 'mobile']) {
      const m = /^(\d+)\s*[×x]\s*(\d+)/.exec(s[vista] || '')
      if (!m) continue
      out.push({
        componente: comp.key,
        etiqueta: comp.name || comp.key,
        variante: variante || null,
        varianteLabel: variante ? (ETIQUETAS[variante] || variante) : null,
        campo: s.label || null,
        vista,
        w: Number(m[1]),
        h: Number(m[2]),
        peso: s.max || null,
      })
    }
  }
  for (const c of COMPONENTS) {
    if (c.specsByType) {
      for (const [k, arr] of Object.entries(c.specsByType)) (arr || []).forEach((s) => agregar(c, k, s))
    } else {
      (c.specs || []).forEach((s) => agregar(c, null, s))
    }
  }
  // Misma medida y mismo destino = un solo archivo.
  const vistas = new Map()
  for (const e of out) {
    const k = [e.componente, e.variante, e.campo, e.vista, e.w, e.h].join('|')
    if (!vistas.has(k)) vistas.set(k, e)
  }
  return [...vistas.values()]
}

const limpio = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const nombre = (e) => [
  limpio(e.componente),
  e.variante ? limpio(e.variante) : null,
  e.campo ? limpio(e.campo) : null,
  e.vista,
  `${e.w}x${e.h}`,
].filter(Boolean).join('-') + '.png'

// El dibujo. Tiene que gritar PLACEHOLDER — si alguna se escapa a produccion, que se vea.
const html = (e) => `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}
  body{width:${e.w}px;height:${e.h}px;display:flex;align-items:center;justify-content:center;
    background:repeating-linear-gradient(45deg,#fdf2f2 0 24px,#fae8e8 24px 48px);
    font:400 ${Math.max(13, Math.round(Math.min(e.w, e.h) / 22))}px/1.35
      -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#7c2b2b;
    box-sizing:border-box;border:${Math.max(2, Math.round(Math.min(e.w, e.h) / 120))}px dashed #ED1C24}
  .c{text-align:center;padding:4%}
  .m{font-weight:700;font-size:${Math.max(20, Math.round(Math.min(e.w, e.h) / 8))}px;
    letter-spacing:-.02em;color:#ED1C24;line-height:1}
  .t{margin-top:.55em;font-weight:600;text-transform:uppercase;letter-spacing:.14em;
    font-size:.62em;opacity:.8}
  .d{margin-top:.5em;opacity:.75}
</style><div class="c">
  <div class="m">${e.w}×${e.h}</div>
  <div class="t">placeholder · ${e.vista}</div>
  <div class="d">${e.etiqueta}${e.campo ? ' — ' + e.campo : ''}${e.varianteLabel ? '<br>' + e.varianteLabel : ''}</div>
</div>`

const lista = medidas()
mkdirSync(DESTINO, { recursive: true })
// El perfil del navegador va a un temporal: no tiene nada que hacer entre las imagenes.
const perfil = mkdtempSync(join(tmpdir(), 'placeholders-'))

const { ctx, page } = await openBrowser({
  ...(CHROME ? { executablePath: CHROME } : { browser: 'chrome' }),
  profileDir: perfil, headless: true, slowMo: 0,
})

try {
  for (const e of lista) {
    await page.setViewportSize({ width: e.w, height: e.h })
    await page.setContent(html(e), { waitUntil: 'load' })
    const archivo = join(DESTINO, nombre(e))
    await page.screenshot({ path: archivo, clip: { x: 0, y: 0, width: e.w, height: e.h } })
    process.stdout.write(`${nombre(e)}\n`)
  }

  const filas = lista.map((e) => `| ${e.etiqueta} | ${e.varianteLabel || '—'} | ${e.campo || '—'} `
    + `| ${e.vista} | ${e.w}×${e.h} | ${e.peso || '—'} | \`${nombre(e)}\` |`).join('\n')
  writeFileSync(join(DESTINO, 'INDICE.md'), `# Placeholders

Imagenes de relleno con las medidas EXACTAS que pide cada componente. Se suben UNA vez a
la Media library de Drupal y quedan disponibles para armar paginas de prueba sin tener
todavia el material definitivo.

Salen de \`src/data/components.js\`, la misma fuente que usa la matriz de contenido. Para
regenerarlas: \`node tools/placeholders.mjs\` desde \`runner/\`.

Son ${lista.length} archivos. El peso de la columna "Max" es el limite que pide el CMS:
estas pesan mucho menos, asi que no hay problema.

| Componente | Variante | Campo | Vista | Medida | Max | Archivo |
|---|---|---|---|---|---|---|
${filas}
`)
  process.stdout.write(`\n${lista.length} imagenes en ${DESTINO}\n`)
} finally {
  await ctx.close()
  rmSync(perfil, { recursive: true, force: true })
}
