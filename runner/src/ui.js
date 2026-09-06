// La INTERFAZ: un servidor chiquito que se abre en el navegador de todos los dias, para
// que armar una pagina no requiera terminal.
//
// Por que una pagina local y no una ventana de escritorio: el runner tiene que manejar
// un navegador con la sesion de Drupal del usuario, asi que corre si o si en la maquina
// de la persona. Una pagina servida en 127.0.0.1 usa el navegador que ya esta instalado,
// no agrega una sola dependencia, se ve igual en Mac y en Windows, y el codigo sigue
// siendo legible — nada empaquetado, nada firmado.
//
// SEGURIDAD. Un servidor local que puede manejar la sesion de Drupal no puede quedar
// abierto a cualquiera:
//   - escucha SOLO en 127.0.0.1, nunca en la red;
//   - cada arranque genera un TOKEN aleatorio que va en la URL y que toda llamada tiene
//     que repetir. Sin el, no se responde nada;
//   - se rechaza cualquier pedido con `Origin` de otro lado, para que una pagina web
//     abierta en otra pestaña no pueda dispararle ordenes (CSRF);
//   - y se rechaza un `Host` que no sea 127.0.0.1, que es lo que evita el rebinding de
//     DNS. Nada de esto es paranoia de mas: es lo que va a preguntar compliance.
import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { openBrowser, isLoggedIn } from './browser.js'
import { loadManifest, countBlocks, validateManifest } from './manifest.js'
import { missingTypes } from './mapping.js'
import { buildPage } from './build.js'
import { logRun } from './log.js'

const AQUI = fileURLToPath(new URL('.', import.meta.url))
const APP = join(AQUI, 'ui', 'app.html')

export async function startUi({ mapping, mappingFile, openOpts = {}, manifestDir = 'manifests' }) {
  const token = randomBytes(24).toString('hex')

  // UN solo navegador para toda la sesion: el login lo abre y las corridas lo reusan,
  // asi la persona no vuelve a loguearse en cada pagina.
  let nav = null
  async function navegador() {
    if (nav && !nav.ctx.pages().length) nav = null   // la cerraron a mano
    if (!nav) {
      nav = await openBrowser(openOpts)
      nav.ctx.on('close', () => { nav = null })
    }
    return nav
  }

  // Una corrida por vez. El estado vive aca y la pagina lo consulta cada medio segundo:
  // mas simple que un stream y no se pierde nada si la pestaña se recarga.
  let corrida = null
  const nuevaCorrida = (archivo, save) => (corrida = {
    archivo, save, estado: 'corriendo', pasos: [], resultado: null, error: null,
    desde: new Date().toISOString(),
  })

  function manifiestos() {
    const dir = resolve(manifestDir)
    if (!existsSync(dir)) return []
    return readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => {
      const archivo = join(manifestDir, f)
      try {
        const m = loadManifest(archivo)
        return {
          archivo, nombre: f, titulo: m.page.title, ruta: m.page.path || null,
          publicada: m.page.published === true,
          bloques: countBlocks(m.blocks), falta: missingTypes(mapping, m.blocks),
        }
      } catch (e) {
        return { archivo, nombre: f, error: e.message }
      }
    })
  }

  async function correr(archivo, save) {
    const m = loadManifest(archivo)
    const falta = missingTypes(mapping, m.blocks)
    if (falta.length) throw new Error(`El mapping no conoce: ${falta.join(', ')}`)
    const c = nuevaCorrida(archivo, save)
    const { page } = await navegador()
    if (!(await isLoggedIn(page, mapping.site))) {
      c.estado = 'error'
      c.error = 'No hay sesion en Drupal. Inicia sesion primero.'
      throw new Error(c.error)
    }
    try {
      const res = await buildPage({ page, mapping, manifest: m, save, onStep: (s) => c.pasos.push(s) })
      logRun({ manifest: archivo, title: m.page.title, ...res })
      c.estado = 'listo'
      c.resultado = { ...res, titulo: m.page.title }
    } catch (e) {
      logRun({ manifest: archivo, title: m.page.title, error: e.message })
      c.estado = 'error'
      c.error = e.message
    }
  }

  const rutas = {
    'GET /api/estado': async () => ({
      sitio: mapping.site, mapping: basename(mappingFile),
      sesion: nav ? await isLoggedIn(nav.page, mapping.site) : false,
      navegador: !!nav, manifiestos: manifiestos(), corrida,
    }),
    'GET /api/corrida': async () => corrida,
    'POST /api/login': async () => {
      const { page } = await navegador()
      await page.goto(mapping.site, { waitUntil: 'domcontentloaded' })
      return { ok: true }
    },
    'POST /api/sesion': async () => {
      const { page } = await navegador()
      return { sesion: await isLoggedIn(page, mapping.site) }
    },
    'POST /api/build': async (body) => {
      if (corrida?.estado === 'corriendo') throw new Error('Ya hay una pagina armandose.')
      if (!body?.archivo) throw new Error('Falta el manifiesto.')
      // No se espera: la pagina sigue el avance por /api/corrida.
      correr(body.archivo, !!body.save).catch(() => {})
      return { ok: true }
    },
    'POST /api/guardar-manifiesto': async (body) => {
      // Un manifiesto que vino de otro lado (el hub, un mail) se deja en manifests/.
      const m = validateManifest(body?.contenido, body?.nombre || '(pegado)')
      const nombre = (body?.nombre || `${m.page.title}.json`).replace(/[^\w.\- ]+/g, '_').replace(/(\.json)?$/, '.json')
      const destino = join(resolve(manifestDir), nombre)
      writeFileSync(destino, JSON.stringify(m, null, 2) + '\n')
      return { nombre }
    },
    'POST /api/cerrar-navegador': async () => {
      if (nav) await nav.ctx.close()
      nav = null
      return { ok: true }
    },
  }

  const server = createServer(async (req, res) => {
    const enviar = (code, obj) => {
      res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(obj ?? null))
    }
    try {
      const url = new URL(req.url, 'http://127.0.0.1')
      const puerto = server.address().port

      // Solo desde esta maquina, solo con el token de este arranque.
      const host = (req.headers.host || '').split(':')[0]
      if (host !== '127.0.0.1' && host !== 'localhost') return enviar(403, { error: 'host no permitido' })
      const origen = req.headers.origin
      if (origen && origen !== `http://127.0.0.1:${puerto}` && origen !== `http://localhost:${puerto}`) {
        return enviar(403, { error: 'origen no permitido' })
      }
      const dado = url.searchParams.get('t') || req.headers['x-token']
      if (dado !== token) return enviar(403, { error: 'token invalido' })

      if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        return res.end(readFileSync(APP, 'utf8'))
      }

      const ruta = rutas[`${req.method} ${url.pathname}`]
      if (!ruta) return enviar(404, { error: 'no existe' })

      let body = null
      if (req.method === 'POST') {
        const crudo = await leerCuerpo(req)
        body = crudo ? JSON.parse(crudo) : null
      }
      return enviar(200, await ruta(body))
    } catch (e) {
      return enviar(400, { error: e.message })
    }
  })

  await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
  const url = `http://127.0.0.1:${server.address().port}/?t=${token}`
  return { server, url, cerrar: async () => { if (nav) await nav.ctx.close(); server.close() } }
}

function leerCuerpo(req) {
  return new Promise((ok, mal) => {
    let d = ''
    req.on('data', (c) => {
      d += c
      if (d.length > 4e6) { mal(new Error('el manifiesto es demasiado grande')); req.destroy() }
    })
    req.on('end', () => ok(d))
    req.on('error', mal)
  })
}

// Abre la URL en el navegador de TODOS LOS DIAS (no el del runner).
export function abrirEnNavegador(url) {
  const cmd = process.platform === 'darwin' ? ['open', [url]]
    : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
      : ['xdg-open', [url]]
  try { spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore' }).unref() } catch { /* se abre a mano */ }
}
