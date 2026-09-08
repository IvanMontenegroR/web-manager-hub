// LEE las paginas del sitio VIEJO y trae lo que hace falta para decidir que se migra y
// para traducirlo a los componentes nuevos.
//
//   node tools/extraer.mjs urls.txt salida/            # texto de cada pagina
//   node tools/extraer.mjs urls.txt salida/ --fotos    # ademas, un screenshot por pagina
//
// `urls.txt` = una URL por linea. Las lineas vacias y las que empiezan con # se saltean.
//
// POR QUE UN NAVEGADOR Y NO `fetch`. En una maquina corporativa el proxy corta los
// pedidos que salen de Node — ya paso con /sitemap.xml. Chrome, en cambio, ya esta
// configurado para esa red. Se usa el mismo perfil del runner, asi que si alguna pagina
// pide sesion, alcanza con `page-runner login` una vez.
//
// QUE SACA, Y POR QUE ESO. Para decidir si una pagina se migra no hace falta el HTML: un
// Drupal renderizado son 300-500 KB de markup del tema por pagina, y lo que decide es el
// CONTENIDO. Asi que se guarda el texto en orden con su jerarquia, las imagenes con su
// medida real, los links y los formularios. Todo junto son ~2 KB por pagina en vez de 400.
//
// Los screenshots son otra cosa y por eso van aparte (`--fotos`): sirven para traducir el
// LAYOUT a los componentes nuevos, no para decidir. Pesan ~200 KB cada uno.
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { openBrowser } from '../src/browser.js'

const ESPERA = Number(
  process.argv.find((a) => a.startsWith('--espera='))?.split('=')[1] || 30000)
const PAUSA = 250          // entre paginas: no es una prueba de carga

const args = process.argv.slice(2)
const flag = (n) => args.includes(`--${n}`)
const [lista, destino] = args.filter((a) => !a.startsWith('--'))
if (!lista || !destino) {
  process.stderr.write('uso: node tools/extraer.mjs <urls.txt> <carpeta-salida> [--fotos]\n')
  process.exit(2)
}

const urls = readFileSync(lista, 'utf8').split('\n')
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith('#'))
mkdirSync(resolve(destino), { recursive: true })
if (flag('fotos')) mkdirSync(join(resolve(destino), 'fotos'), { recursive: true })

// El archivo se escribe LINEA POR LINEA, no al final: si la corrida se corta a la mitad,
// lo que ya se leyo esta guardado y se puede seguir desde ahi.
const salida = join(resolve(destino), 'paginas.jsonl')
const hechas = new Set()
if (existsSync(salida)) {
  let fallaron = 0
  for (const l of readFileSync(salida, 'utf8').split('\n')) {
    if (!l.trim()) continue
    try {
      const d = JSON.parse(l)
      // Solo se saltea lo que se LEYO. Una pagina que fallo no esta hecha: si se la diera
      // por hecha, volver a correr no la reintentaria nunca y el error quedaria para
      // siempre. Se reintenta y la linea nueva pisa a la vieja al resumir.
      if (d.error) { fallaron += 1; continue }
      hechas.add(d.pedida)
    } catch { /* linea a medias */ }
  }
  process.stderr.write(`Ya estaban leidas ${hechas.size}; se saltean.`
    + (fallaron ? ` ${fallaron} habian fallado: se reintentan.` : '') + '\n')
}

// Corre DENTRO del navegador. Devuelve el contenido de la pagina, sin el cascaron del
// tema: el header, el footer y la navegacion son iguales en las 640 y solo hacen ruido.
const LEER = () => {
  const FUERA = 'header, footer, nav, .cookie, #onetrust-consent-sdk, [role="banner"],'
    + ' [role="navigation"], [role="contentinfo"], script, style, noscript'
  const raiz = document.querySelector('main, [role="main"], .region-content, #content') || document.body
  const clon = raiz.cloneNode(true)
  clon.querySelectorAll(FUERA).forEach((e) => e.remove())

  const limpio = (s) => String(s || '').replace(/\s+/g, ' ').trim()
  const bloques = []
  for (const el of clon.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,figcaption,button,a,td,th')) {
    // Un <a> adentro de un <p> ya viene en el texto del <p>: solo interesan los sueltos,
    // que son los que se ven como boton o como item de menu.
    if (el.tagName === 'A' && el.closest('p,li,td,th')) continue
    const t = limpio(el.innerText || el.textContent)
    if (!t || t.length < 2) continue
    const b = { tag: el.tagName.toLowerCase(), texto: t.slice(0, 600) }
    if (el.tagName === 'A') { b.href = el.getAttribute('href') || ''; b.tag = 'cta' }
    const ant = bloques[bloques.length - 1]
    if (ant && ant.tag === b.tag && ant.texto === b.texto) continue   // repetido pegado
    bloques.push(b)
  }

  // Las imagenes van con su medida NATURAL, que es la que decide si sirven para el
  // componente nuevo o hay que pedirlas de nuevo: una foto de 400px no se estira a 2100.
  //
  // Se recorren las del documento VIVO, no las del clon: `naturalWidth` solo lo sabe el
  // elemento que de verdad cargo el archivo. Un clon nunca descarga nada y contesta 0.
  const vistas = new Set()
  const imagenes = []
  for (const img of raiz.querySelectorAll('img')) {
    if (img.closest(FUERA)) continue
    const src = img.currentSrc || img.src || img.getAttribute('data-src') || ''
    if (!src || src.startsWith('data:') || vistas.has(src)) continue
    vistas.add(src)
    imagenes.push({ src, alt: img.getAttribute('alt') || '',
                    w: img.naturalWidth || 0, h: img.naturalHeight || 0 })
  }
  const meta = (n) => document.querySelector(`meta[name="${n}"], meta[property="og:${n}"]`)
    ?.getAttribute('content') || ''

  return {
    titulo: limpio(document.title),
    metaTitle: meta('title'),
    metaDescription: meta('description'),
    h1: [...clon.querySelectorAll('h1')].map((e) => limpio(e.innerText)),
    bloques: bloques.slice(0, 400),
    imagenes: imagenes.slice(0, 60),
    formularios: clon.querySelectorAll('form').length,
    iframes: [...clon.querySelectorAll('iframe')].map((e) => e.getAttribute('src') || '').slice(0, 10),
    palabras: limpio(clon.innerText).split(' ').filter(Boolean).length,
  }
}

// Cada cuanto avisar. Con 4 URLs y un paso de 10 no se imprime NUNCA: quien lo corre no
// sabe si esta trabajando o colgado, y con paginas que tardan 90s eso son minutos a
// ciegas. El paso sale del tamaño de la tanda.
const PASO = urls.length <= 20 ? 1 : 10

const { ctx, page } = await openBrowser({ profileDir: '.profile', headless: true,
  ...(process.env.RUNNER_CHROME ? { executablePath: process.env.RUNNER_CHROME } : {}) })
let n = 0, errores = 0
try {
  for (const url of urls) {
    n += 1
    if (hechas.has(url)) continue
    const fila = { pedida: url }
    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: ESPERA })
      fila.status = res ? res.status() : null
      fila.final = page.url()
      // Las imagenes cargan tarde (lazy load): sin esto, la mitad viene con medida 0.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {})
      await page.waitForTimeout(600)
      await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {})
      Object.assign(fila, await page.evaluate(LEER))
      if (flag('fotos')) {
        const nombre = url.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '_').slice(0, 120)
        fila.foto = `fotos/${nombre}.jpg`
        await page.screenshot({ path: join(resolve(destino), fila.foto),
                                fullPage: true, type: 'jpeg', quality: 70 })
      }
    } catch (e) {
      fila.error = String(e.message).split('\n')[0].slice(0, 140)
      errores += 1
    }
    appendFileSync(salida, JSON.stringify(fila) + '\n', 'utf8')
    if (n % PASO === 0 || n === urls.length) {
      const q = fila.error ? 'error' : fila.status
      process.stderr.write(`  ${n}/${urls.length}  ${q}  ${url.split('purina.com.mx')[1] || url}\n`)
    }
    await page.waitForTimeout(PAUSA)
  }
} finally {
  await ctx.close()
}

// Un resumen chico al lado, para poder mirar el resultado sin abrir el JSONL.
// Si una URL se reintento, quedan dos lineas: vale la ULTIMA, que es la del reintento.
const porUrl = new Map()
for (const l of readFileSync(salida, 'utf8').split('\n').filter(Boolean)) {
  try { const d = JSON.parse(l); porUrl.set(d.pedida, d) } catch { /* linea a medias */ }
}
const filas = [...porUrl.values()]
const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`
writeFileSync(join(resolve(destino), 'resumen.csv'),
  ['url,status,url final,titulo,palabras,imagenes,formularios,error',
   ...filas.map((f) => [f.pedida, f.status ?? '', f.final ?? '', f.titulo ?? '', f.palabras ?? 0,
     (f.imagenes || []).length, f.formularios ?? 0, f.error ?? ''].map(esc).join(','))].join('\n') + '\n',
  'utf8')

process.stderr.write(`\nListo: ${filas.length} paginas en ${salida}\n`)
if (errores) process.stderr.write(`${errores} con error (quedaron anotadas con su motivo).\n`)
