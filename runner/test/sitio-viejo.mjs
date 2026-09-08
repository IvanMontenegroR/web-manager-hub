// Un SITIO VIEJO de mentira, con las mismas trampas que el real de purina.com.mx.
// Sirve para probar la cadena extraer -> plan -> imagenes sin depender de la red ni del
// sitio de produccion.
//
// Las trampas estan puestas a proposito, una por una, porque cada una nos costo un bug:
//   - el banner NO tiene <img>: su foto es un background-image dentro de un <style> en
//     linea, con una regla para mobile y otra adentro de un @media de desktop;
//   - el carrusel es slick y CLONA slides (.slick-cloned): seis cards aparecen doce veces;
//   - el titulo de una card es un <h5>, no un <h2>;
//   - los items del acordeon estan repartidos en columnas y lo unico que los junta es
//     `data-bs-parent`;
//   - hay dos <h1>;
//   - una foto es MAS CHICA que la medida que pide el componente nuevo.
import { createServer } from 'node:http'
import { deflateSync } from 'node:zlib'

// PNG de un color solido, del tamaño que se pida. Es el minimo indispensable para tener
// una imagen de verdad con un `naturalWidth` de verdad, sin traer ninguna dependencia.
export function png(w, h, [r, g, b] = [200, 80, 60]) {
  const crcTabla = (() => {
    const t = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c
    }
    return t
  })()
  const crc = (buf) => {
    let c = -1
    for (const byte of buf) c = crcTabla[(c ^ byte) & 0xff] ^ (c >>> 8)
    return (c ^ -1) >>> 0
  }
  const trozo = (tipo, datos) => {
    const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length)
    const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos])
    const chk = Buffer.alloc(4); chk.writeUInt32BE(crc(cuerpo))
    return Buffer.concat([largo, cuerpo, chk])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2   // 8 bits, RGB
  const fila = Buffer.concat([Buffer.from([0]), Buffer.concat(Array.from({ length: w }, () => Buffer.from([r, g, b])))])
  const cruda = Buffer.concat(Array.from({ length: h }, () => fila))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr), trozo('IDAT', deflateSync(cruda)), trozo('IEND', Buffer.alloc(0)),
  ])
}

const card = (n, titulo, texto, href) => `
  <div class="slick-slide">
    <div class="card">
      <img src="/card-${n}.png" alt="card ${n}">
      <div class="card-body">
        <h5 class="card-title">${titulo}</h5>
        <p>${texto}</p>
        <div class="card-body--buttons"><a class="button-nestle-positive" href="${href}">Leer más</a></div>
      </div>
    </div>
  </div>`

const acordeonItem = (n, padre) => `
  <div class="accordion-item">
    <button class="accordion-button">Pregunta ${n}</button>
    <div class="accordion-collapse" data-bs-parent="#${padre}">
      <div class="accordion-body">Respuesta ${n} del acordeon.</div>
    </div>
  </div>`

export const PAGINA = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Pagina de prueba | Purina Mexico</title>
<meta name="description" content="Descripcion de prueba.">
<style>
  .bnr-1 { background-image: url('/banner-mobile.png'); }
  @media (min-width: 769px) { .bnr-1 { background-image: url('/banner-desktop.png'); } }
</style></head>
<body>
<header><nav>menu que no interesa</nav></header>
<main>
  <div class="banner bnr-1" style="color: #ffffff">
    <h1>¿A ti te importa de dónde viene su alimento?</h1>
    <h1>A nosotros también, por eso te contamos qué es Purina®.</h1>
    <p>Una bajada del banner.</p>
  </div>

  <div class="paragraph--type--layout-columns-2">
    <div class="row">
      <div class="col-6">
        <div class="wysiwyg" style="color: #111111">
          <p>Un bloque de texto con formato en la primera columna.</p>
        </div>
      </div>
      <div class="col-6">
        ${acordeonItem(1, 'acc-uno')}
        ${acordeonItem(2, 'acc-uno')}
        ${acordeonItem(3, 'acc-uno')}
      </div>
    </div>
  </div>

  <div class="slick-slider items-3">
    <div class="slick-slide slick-cloned">${'<div class="card"><div class="card-body"><h5 class="card-title">CLON</h5></div></div>'}</div>
    ${card(1, 'Inspiración para innovar', 'Continuamente nuestros expertos de todo el mundo nos ayudan a crear productos innovadores para tu mascota, una búsqueda que representa lo que es Purina®.', '/purina/innovacion')}
    ${card(2, 'Calidad, nuestra promesa', 'Corto.', '/purina/calidad')}
    <div class="slick-slide slick-cloned">${'<div class="card"><div class="card-body"><h5 class="card-title">CLON</h5></div></div>'}</div>
  </div>

  <div class="paragraph--type--image"><img src="/franja.png" alt="Imagen"></div>

  <iframe src="https://www.youtube-nocookie.com/embed/ABC123?autoplay=1"></iframe>
</main>
<footer>pie que no interesa</footer>
</body></html>`

// Las medidas estan elegidas contra las specs del catalogo:
//   banner Secondary Hero = 2100×700 -> el de 2400×900 RECORTA
//   card apaisada        =  485×280  -> las de 500×360 RECORTAN
//   card 2               =  485×280  -> la de 300×200 NO ALCANZA: tiene que salir ESTIRADA
const IMAGENES = {
  '/banner-desktop.png': [2400, 900],
  '/banner-mobile.png': [700, 700],
  '/card-1.png': [500, 360],
  '/card-2.png': [300, 200],
  '/franja.png': [701, 177],
}

export function servirSitioViejo() {
  const server = createServer((req, res) => {
    const ruta = req.url.split('?')[0]
    if (IMAGENES[ruta]) {
      const [w, h] = IMAGENES[ruta]
      res.writeHead(200, { 'Content-Type': 'image/png' })
      return res.end(png(w, h))
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(PAGINA)
  })
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => {
    ok({ url: `http://127.0.0.1:${server.address().port}`, cerrar: () => server.close() })
  }))
}
