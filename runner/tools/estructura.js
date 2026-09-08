// LEE LA ESTRUCTURA de una pagina del sitio VIEJO, no solo su texto.
//
// Corre DENTRO del navegador (se pasa a `page.evaluate`), asi que es una funcion sola sin
// imports. Exporta el fuente como string para poder inyectarla.
//
// POR QUE NO ALCANZA CON EL TEXTO NI CON UNA FOTO. Una foto muestra el acordeon cerrado,
// la pestaña 1 de 2 y el slide 1 de 6. Y una lista plana de parrafos no dice que esos
// cinco bloques son un acordeon: sin eso no se puede elegir entre `accordion_grid`,
// `comp_tabs` o un `card_grid` en modo carrusel, que es toda la decision.
//
// Esta escrito contra el HTML REAL de purina.com.mx, no contra heuristicas genericas:
//
//   BANNER    la imagen NO es un <img>. Es `background-image` dentro de un <style> inline,
//             una para mobile y otra en @media(min-width:769px) para desktop. Leyendo solo
//             <img> se pierde entera — que es justo la imagen mas importante de la pagina.
//   TABS      Bootstrap 5: ul.nav-tabs > a[data-bs-toggle="tab"] + div.tab-pane
//   ACORDEON  Bootstrap 5: .accordion-item > button.accordion-button + .accordion-collapse
//   CARRUSEL  slick, que CLONA slides para el scroll infinito. Seis cards reales aparecen
//             doce veces en el DOM: hay que descartar `.slick-cloned` o se cuenta mal.
//   LAYOUTS   el sitio viejo se declara solo: `paragraph--type--layout-columns-3`,
//             `layout-33-66`, `layout-25-25-50`, `paragraph--type--image`.
//   CARDS     .card > img + h5.card-title + cuerpo + a.button-nestle-positive
//   WYSIWYG   .wysiwyg con style="color:…; background-color:…" — los colores del bloque,
//             que es lo que despues se mapea a los tokens de fondo del CMS nuevo.

export const ESTRUCTURA = function () {
  const lim = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n || 600)
  const clase = (el) => (el && typeof el.className === 'string' ? el.className : '')

  // Las imagenes de fondo viven en <style> inline. Se leen las reglas y se separan las que
  // estan dentro de un @media de desktop de las que no, que son las de mobile.
  const FONDOS = {}
  for (const st of document.querySelectorAll('style')) {
    const css = st.textContent || ''
    for (const m of css.matchAll(/\.([\w-]+)\s*\{([^}]*)\}/g)) {
      const img = /background-image:\s*url\(['"]?([^'")]+)/.exec(m[2])
      if (!img) continue
      const antes = css.slice(0, m.index)
      // Cuenta de llaves: si quedan abiertas, esta regla esta adentro de un @media.
      const dentro = (antes.match(/\{/g) || []).length - (antes.match(/\}/g) || []).length > 0
      const esDesktop = dentro && /@media[^{]*min-width:\s*(7[6-9]\d|[89]\d\d|1\d{3})/.test(
        antes.slice(antes.lastIndexOf('@media')))
      FONDOS[m[1]] = FONDOS[m[1]] || {}
      FONDOS[m[1]][esDesktop ? 'desktop' : 'mobile'] = img[1]
    }
  }
  const fondoDe = (el) => {
    for (const c of clase(el).split(/\s+/)) if (FONDOS[c]) return FONDOS[c]
    return null
  }

  const img1 = (el) => {
    const i = el.querySelector('img')
    if (!i) return null
    return { src: i.getAttribute('src') || '', alt: i.getAttribute('alt') || '',
             w: i.naturalWidth || 0, h: i.naturalHeight || 0 }
  }
  const cta1 = (el) => {
    const a = el.querySelector('a.button-nestle-positive, a.btn, .card-body--buttons a')
    return a ? { texto: lim(a.textContent, 80), href: a.getAttribute('href') || '' } : null
  }
  const estilo = (el) => {
    const s = el.getAttribute('style') || ''
    const c = /(?:^|;)\s*color:\s*([^;]+)/.exec(s)
    const b = /background-color:\s*([^;]+)/.exec(s)
    const o = {}
    if (c) o.texto = c[1].trim()
    if (b && !/rgba\([^)]*,\s*0\)/.test(b[1])) o.fondo = b[1].trim()   // rgba(...,0) = sin fondo
    return Object.keys(o).length ? o : null
  }
  const card = (el) => {
    const o = { titulo: lim(el.querySelector('.card-title')?.textContent, 120) }
    const cuerpo = [...el.querySelectorAll('.card-body p')].map((p) => lim(p.textContent, 400))
    if (cuerpo.length) o.texto = cuerpo.join(' ')
    const i = img1(el); if (i) o.imagen = i
    const c = cta1(el); if (c) o.cta = c
    return o
  }

  // Se recorre el DOM de arriba hacia abajo y, apenas se reconoce una estructura, se la
  // toma ENTERA y no se sigue bajando: si no, las cards de un carrusel volverian a salir
  // sueltas mas abajo.
  const RAIZ = document.querySelector('article, main, [role="main"], #block-purina-content') || document.body
  const bloques = []
  const visto = new Set()

  const recorrer = (nodo) => {
    for (const el of nodo.children) {
      if (visto.has(el)) continue
      const c = clase(el)
      const tag = el.tagName

      if (tag === 'STYLE' || tag === 'SCRIPT' || tag === 'NOSCRIPT') continue

      // --- BANNER (imagen de fondo + texto encima)
      if (el.classList.contains('banner') && el.querySelector('h1,h2')) {
        const f = fondoDe(el)
        const b = { tipo: 'banner',
                    titulo: lim(el.querySelector('h1,h2')?.textContent, 200),
                    texto: [...el.querySelectorAll('p')].map((p) => lim(p.textContent, 500)).filter(Boolean) }
        if (f) b.fondo = f
        const st = estilo(el); if (st?.texto) b.color_texto = st.texto
        bloques.push(b); visto.add(el); continue
      }

      // --- TABS. Se reconoce por el UL, no por un ancestro que "contenga" un .nav-tabs:
      // con un selector de descendiente, el primer <div> de la pagina daba verdadero y se
      // tragaba TODO — el banner de arriba desaparecia del arbol.
      if (el.tagName === 'UL' && el.classList.contains('nav-tabs')) {
        const cont = el.parentElement?.querySelector(':scope > .tab-content')
                  || el.nextElementSibling
        const items = []
        for (const a of el.querySelectorAll('.nav-link')) {
          const id = (a.getAttribute('href') || '').replace('#', '')
          const panel = id && cont && cont.querySelector(`#${CSS.escape(id)}`)
          items.push({ titulo: lim(a.textContent, 120),
                       hijos: panel ? sub(panel) : [] })
          if (panel) visto.add(panel)
        }
        bloques.push({ tipo: 'tabs', items })
        visto.add(el); if (cont) visto.add(cont); continue
      }

      // --- ACORDEON. Los items NO son hermanos: el sitio los reparte en columnas
      // distintas. Lo que los junta es `data-bs-parent`, que apunta al acordeon al que
      // pertenecen. Sin eso salian nueve acordeones de un item cada uno.
      if (/\baccordion-item\b/.test(c)) {
        const padre = el.querySelector('.accordion-collapse')?.getAttribute('data-bs-parent') || ''
        const todos = padre
          ? [...RAIZ.querySelectorAll('.accordion-item')].filter(
              (x) => x.querySelector('.accordion-collapse')?.getAttribute('data-bs-parent') === padre)
          : [el]
        todos.forEach((x) => visto.add(x))
        bloques.push({ tipo: 'acordeon', items: todos.map((x) => ({
          titulo: lim(x.querySelector('.accordion-button')?.textContent, 200),
          cuerpo: lim(x.querySelector('.accordion-body')?.textContent, 1500) })) })
        continue
      }

      // --- CARRUSEL slick. Los `.slick-cloned` son copias para el scroll infinito.
      if (/\bslick-slider\b/.test(c)) {
        const slides = [...el.querySelectorAll('.slick-slide')]
          .filter((s) => !/\bslick-cloned\b/.test(clase(s)))
          .map((s) => (s.querySelector('.card') ? card(s.querySelector('.card')) : { texto: lim(s.textContent, 400) }))
        const porFila = /items-(\d+)/.exec(c)
        bloques.push({ tipo: 'carrusel', porFila: porFila ? Number(porFila[1]) : null, slides })
        visto.add(el); continue
      }

      // --- LAYOUT de columnas: el sitio viejo dice cual es
      const lay = /paragraph--type--(layout-[\w-]+)/.exec(c)
      if (lay) {
        const cols = [...el.querySelectorAll(':scope > .row > [class*="col-"]')]
        bloques.push({ tipo: 'columnas', variante: lay[1],
                       columnas: cols.map((cl) => { visto.add(cl); return sub(cl) }) })
        visto.add(el); continue
      }

      // --- CARD suelta
      if (/\bcard\b/.test(c) && el.querySelector('.card-body')) {
        bloques.push({ tipo: 'card', ...card(el) }); visto.add(el); continue
      }

      // --- IMAGEN (paragraph propio del sitio viejo)
      if (/paragraph--type--image/.test(c)) {
        const i = img1(el)
        if (i) { bloques.push({ tipo: 'imagen', ...i }); visto.add(el); continue }
      }

      // --- TEXTO con formato (wysiwyg): trae sus colores
      if (/\bwysiwyg\b/.test(c)) {
        const b = { tipo: 'texto', html: (el.innerHTML || '').replace(/\s+/g, ' ').trim().slice(0, 3000),
                    plano: lim(el.textContent, 1200) }
        const st = estilo(el); if (st) b.estilo = st
        if (b.plano) bloques.push(b)
        visto.add(el); continue
      }

      // --- IFRAME (formulario externo, video, PDF)
      if (tag === 'IFRAME') {
        bloques.push({ tipo: 'iframe', src: el.getAttribute('src') || '' })
        visto.add(el); continue
      }

      recorrer(el)
    }
  }

  // Sub-arbol: lo mismo pero devolviendo la lista en vez de empujar a la global.
  function sub(nodo) {
    const guardar = bloques.length
    recorrer(nodo)
    return bloques.splice(guardar)
  }

  recorrer(RAIZ)
  return bloques
}.toString()
