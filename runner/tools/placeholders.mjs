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

// Todos arrancan con "placeholder-": en la Media library quedan juntos, se filtran de
// un tecleo y se distinguen del material de verdad sin abrirlos.
//
// El nombre NO lleva la medida ni la vista: un medio `responsive_image` de este CMS
// contiene las DOS imagenes (Image Desktop e Image Mobile), asi que una sola medida
// mentiria. El nombre dice para que sirve, y adentro estan las dos.
const nombreMedio = (e) => [
  'placeholder',
  limpio(e.componente),
  e.variante ? limpio(e.variante) : null,
  e.campo ? limpio(e.campo) : null,
].filter(Boolean).join('-')

// El archivo si la lleva: son dos por medio y hay que poder distinguirlos de un vistazo.
const nombre = (e) => `${nombreMedio(e)}-${e.vista}-${e.w}x${e.h}.png`

// Un MEDIO por componente+variante+campo, con sus dos archivos. Cuando el catalogo no
// declara medida mobile, se sube el mismo archivo de desktop: el campo es obligatorio en
// el CMS y esto es material de relleno — inventar una medida mobile que nadie definio
// seria peor que repetir la que si conocemos.
function medios(lista) {
  const grupos = new Map()
  for (const e of lista) {
    const k = nombreMedio(e)
    if (!grupos.has(k)) grupos.set(k, { nombre: k, componente: e.etiqueta, variante: e.varianteLabel, campo: e.campo })
    grupos.get(k)[e.vista] = { archivo: nombre(e), w: e.w, h: e.h }
  }
  for (const g of grupos.values()) {
    if (!g.mobile && g.desktop) g.mobile = { ...g.desktop, repetida: true }
  }
  return [...grupos.values()]
}

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

  // El INDICE que lee el subidor. Explicito y sin adivinar nombres: cada medio dice sus
  // dos archivos. Parsear el nombre del archivo para reconstruir los pares funcionaria
  // hasta el dia que un componente se llame "algo-mobile".
  const pares = medios(lista)
  writeFileSync(join(DESTINO, 'INDICE.json'), JSON.stringify(pares, null, 2) + '\n')

  const filas = pares.map((g) => `| ${g.componente} | ${g.variante || '—'} | ${g.campo || '—'} `
    + `| \`${g.nombre}\` | ${g.desktop.w}×${g.desktop.h} `
    + `| ${g.mobile.w}×${g.mobile.h}${g.mobile.repetida ? ' *(la de desktop)*' : ''} |`).join('\n')
  writeFileSync(join(DESTINO, 'INDICE.md'), `# Placeholders

Imagenes de relleno con las medidas EXACTAS que pide cada componente. Se suben UNA vez a
la Media library de Drupal y quedan disponibles para armar paginas de prueba sin tener
todavia el material definitivo.

Salen de \`src/data/components.js\`, la misma fuente que usa la matriz de contenido. Para
regenerarlas: \`node tools/placeholders.mjs\` desde \`runner/\`.

Cada fila es UN medio de tipo **responsive_image**, que en este CMS lleva las dos
imagenes adentro (Image Desktop e Image Mobile, las dos obligatorias). Por eso el nombre
del medio no lleva medida: la que corresponde depende de cual de las dos mire el sitio.
**Ese nombre es el que va en el manifiesto.**

Cuando el catalogo no declara medida mobile, se sube la misma imagen de desktop: el campo
es obligatorio y esto es relleno; inventar una medida que nadie definio seria peor.

Son ${pares.length} medios (${lista.length} archivos).

| Componente | Variante | Campo | Nombre del medio | Desktop | Mobile |
|---|---|---|---|---|---|
${filas}
`)
  process.stdout.write(`\n${pares.length} medios (${lista.length} archivos) en ${DESTINO}\n`)
} finally {
  await ctx.close()
  rmSync(perfil, { recursive: true, force: true })
}
