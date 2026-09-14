// Como se nombra una pagina y como se ve un bloque, para las herramientas que tienen que
// coincidir entre si.
//
// EL SLUG es la identidad de la pagina fuera de la base: nombra el archivo del plan, la
// carpeta de imagenes recortadas, el manifiesto, y va adelante del nombre de cada medio.
// Estaba escrito igual en tres lugares; con que uno cambie, el manifiesto pide medios de
// una carpeta que no existe.
//
// EL PLAN es la forma que tienen los bloques dentro de las herramientas
// (`componente` / `contenido` / `hijos`). El hub los guarda con otros nombres
// (`component_key` / `content`), asi que se traducen al entrar y de ahi en adelante es
// todo lo mismo, venga del sitio viejo o del builder.
export const slugDePagina = (path) =>
  String(path || '').replace(/^\//, '').replace(/[^\w-]+/g, '-') || 'pagina'

export const planDelHub = (bloque) => ({
  componente: bloque.component_key,
  contenido: bloque.content || {},
  hijos: (bloque.hijos || []).map(planDelHub),
})
