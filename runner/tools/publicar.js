// QUE PASOS lleva publicar una pagina del hub en el CMS, y en que orden.
//
// Es una funcion PURA (no corre nada) para poder probar la cadena sin navegador, sin base
// y sin CMS: que los pasos esten en orden, que el ensayo no pase `--save` y que la subida
// se saltee cuando la pagina no tiene fotos.
//
// EL ORDEN NO ES ARBITRARIO. Cada paso usa lo que dejo el anterior:
//
//   1. recortar   baja las fotos y las corta a la medida del componente -> imagenes/<slug>/
//   2. manifiesto traduce la pagina del hub a paragraphs del CMS       -> manifests/<slug>.json
//   3. subir      mete esas fotos en la Media library
//   4. armar      construye la pagina, ELIGIENDO las fotos por nombre
//
// El 3 va antes del 4 porque el runner no sube imagenes mientras construye: las elige de
// la libreria. Si no estan arriba, frena. Y van SEPARADOS porque si la subida falla a la
// mitad, asi no queda ademas una pagina a medio armar con la mitad de las fotos.
import { slugDePagina } from './paginas.js'

export function pasos({ path, market = 'MX', save = false, hayImagenes = true }) {
  const slug = slugDePagina(path)
  const todos = [
    { n: 1, que: 'recortar las fotos a la medida de cada componente',
      script: 'tools/imagenes.mjs', args: [`--hub=${path}`, 'imagenes', `--market=${market}`] },
    { n: 2, que: 'traducir la pagina del hub a paragraphs del CMS',
      script: 'tools/manifiesto.mjs', args: [path, `--market=${market}`] },
    // Sin fotos no hay nada que subir, y la herramienta avisaria que falta la carpeta.
    // Que una pagina no tenga imagenes no es un error.
    { n: 3, que: 'subir las fotos a la Media library', saltear: !hayImagenes,
      porQue: 'la pagina no tiene imagenes',
      script: 'tools/subir-medios.mjs', args: [`imagenes/${slug}`] },
    { n: 4, que: save ? 'armar la pagina en el CMS y GUARDARLA' : 'armar la pagina en el CMS (ensayo: no guarda)',
      script: 'src/cli.js', args: ['build', `manifests/${slug}.json`, ...(save ? ['--save'] : [])] },
  ]
  return todos
}
