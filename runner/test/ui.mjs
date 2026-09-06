// Prueba del SERVIDOR de la interfaz. No hace falta navegador: se le pega con fetch,
// que es exactamente lo que hace la pagina.
//
// Lo que importa aca es tanto que funcione como que NO responda a quien no debe: es un
// servidor local capaz de manejar la sesion de Drupal de la persona.
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startUi } from '../src/ui.js'
import { loadMapping } from '../src/mapping.js'
import { request } from 'node:http'

// Un pedido sin la libreria de fetch, para poder mandar headers que fetch no permite.
const pedirCrudo = (port, path, headers) => new Promise((ok, mal) => {
  const r = request({ host: '127.0.0.1', port, path, headers }, (res) => {
    res.resume()
    res.on('end', () => ok(res.statusCode))
  })
  r.on('error', mal)
  r.end()
})

let fallos = 0
const check = (ok, msg) => { console.log(`${ok ? 'OK  ' : 'FALLA'} ${msg}`); if (!ok) fallos++ }

const dir = mkdtempSync(join(tmpdir(), 'manifests-'))
writeFileSync(join(dir, 'una.json'), JSON.stringify({
  manifest: 1, page: { title: 'Pagina de prueba', path: '/prueba' },
  blocks: [{ type: 'c_text', fields: { field_c_text: 'hola' } }],
}))
writeFileSync(join(dir, 'rota.json'), '{ esto no es json')
writeFileSync(join(dir, 'desconocida.json'), JSON.stringify({
  manifest: 1, page: { title: 'Con un tipo que no existe' },
  blocks: [{ type: 'paragraph_inventado' }],
}))

const mapping = loadMapping('mapping/purina-latam.json')
const { url, cerrar } = await startUi({ mapping, mappingFile: 'mapping/purina-latam.json', manifestDir: dir })
const base = new URL(url).origin
const token = new URL(url).searchParams.get('t')
const api = (ruta, opts = {}) => fetch(base + ruta, {
  ...opts, headers: { 'x-token': token, 'content-type': 'application/json', ...(opts.headers || {}) },
})

try {
  // --- Lo que tiene que andar ---
  const home = await fetch(url)
  check(home.status === 200 && (await home.text()).includes('page-runner'), 'sirve la pagina con el token en la URL')

  const estado = await (await api('/api/estado')).json()
  check(estado.sitio === mapping.site, `informa el sitio (${estado.sitio})`)
  check(estado.sesion === false, 'arranca sin sesion, sin abrir ningun navegador')

  const porNombre = Object.fromEntries(estado.manifiestos.map((m) => [m.nombre, m]))
  check(porNombre['una.json']?.titulo === 'Pagina de prueba', 'lista el manifiesto y lee su titulo')
  check(porNombre['una.json']?.bloques === 1, 'cuenta los bloques')
  check(!!porNombre['rota.json']?.error, 'un manifiesto ilegible se muestra con su error, no rompe la lista')
  check(porNombre['desconocida.json']?.falta?.includes('paragraph_inventado'),
    'avisa que el mapping no conoce ese paragraph')

  const guardado = await (await api('/api/guardar-manifiesto', {
    method: 'POST',
    body: JSON.stringify({ contenido: { manifest: 1, page: { title: 'Pegada' }, blocks: [] } }),
  })).json()
  check(guardado.nombre === 'Pegada.json', `guarda un manifiesto pegado (${guardado.nombre})`)
  check(JSON.parse(readFileSync(join(dir, 'Pegada.json'), 'utf8')).page.title === 'Pegada',
    'y queda escrito en la carpeta')

  const malo = await api('/api/guardar-manifiesto', {
    method: 'POST', body: JSON.stringify({ contenido: { manifest: 9 } }),
  })
  check(malo.status === 400, 'rechaza un manifiesto invalido en vez de guardarlo')

  // --- Lo que NO tiene que andar ---
  const sinToken = await fetch(base + '/api/estado')
  check(sinToken.status === 403, 'sin token no responde nada')

  const otroToken = await fetch(base + '/api/estado', { headers: { 'x-token': 'a'.repeat(48) } })
  check(otroToken.status === 403, 'con un token que no es el de este arranque, tampoco')

  const otroOrigen = await api('/api/build', {
    method: 'POST', body: JSON.stringify({ archivo: join(dir, 'una.json') }),
    headers: { origin: 'https://sitio-cualquiera.com' },
  })
  check(otroOrigen.status === 403, 'una pagina web de otro origen no le puede dar ordenes')

  // `fetch` no deja tocar el header Host (es de los prohibidos), asi que va crudo.
  const otroHost = await pedirCrudo(new URL(url).port, '/api/estado', { 'x-token': token, host: 'evil.example' })
  check(otroHost === 403, `un Host que no es 127.0.0.1 se rechaza (rebinding de DNS) — dio ${otroHost}`)

  const noExiste = await api('/api/lo-que-sea')
  check(noExiste.status === 404, 'una ruta que no existe da 404')
} finally {
  await cerrar()
  rmSync(dir, { recursive: true, force: true })
}

console.log(fallos ? `\n${fallos} fallas` : '\nTodo OK')
process.exit(fallos ? 1 : 0)
