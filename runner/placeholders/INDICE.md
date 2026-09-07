# Placeholders

Imagenes de relleno con las medidas EXACTAS que pide cada componente. Se suben UNA vez a
la Media library de Drupal y quedan disponibles para armar paginas de prueba sin tener
todavia el material definitivo.

Salen de `src/data/components.js`, la misma fuente que usa la matriz de contenido. Para
regenerarlas: `node tools/placeholders.mjs` desde `runner/`.

Cada fila es UN medio de tipo **responsive_image**, que en este CMS lleva las dos
imagenes adentro (Image Desktop e Image Mobile, las dos obligatorias). Por eso el nombre
del medio no lleva medida: la que corresponde depende de cual de las dos mire el sitio.
**Ese nombre es el que va en el manifiesto.**

Cuando el catalogo no declara medida mobile, se sube la misma imagen de desktop: el campo
es obligatorio y esto es relleno; inventar una medida que nadie definio seria peor.

Son 20 medios (36 archivos).

| Componente | Variante | Campo | Nombre del medio | Desktop | Mobile |
|---|---|---|---|---|---|
| Menú de marca | — | Logo | `placeholder-brand-menu-logo` | 100×100 | 100×100 |
| Banner | Main Hero | — | `placeholder-banner-main-hero` | 2100×1050 | 526×936 |
| Banner | Secondary Hero | — | `placeholder-banner-title-description` | 2100×700 | 526×526 |
| Banner | Brand Hero | — | `placeholder-banner-brand-hero` | 2088×835 | 526×789 |
| Banner | Promotional banner (Only image) | — | `placeholder-banner-only-image` | 2088×696 | 465×675 |
| Imagen | image_background_box | — | `placeholder-content-image-image-background-box` | 2088×1044 | 526×789 |
| Carrusel de servicios | — | Fondo | `placeholder-services-carousel-fondo` | 2160×1212 | 562×999 |
| Carrusel de testimonios | — | Imagen | `placeholder-testimonials-imagen` | 1552×1014 | 670×446 |
| Carrusel de marcas | — | Imagen de marca | `placeholder-brand-cards-imagen-de-marca` | 822×616 | 822×616 |
| Carrusel de productos | — | Imagen izquierda (imagen única) | `placeholder-product-list-imagen-izquierda-imagen-unica` | 650×692 | 650×692 |
| Línea de tiempo | — | — | `placeholder-timeline` | 670×502 | 670×502 |
| Carrusel de cards | Cards verticales | — | `placeholder-commitment-carousel-cards-verticales` | 822×1230 | 670×1004 |
| Card Grid | Slider Cards Default | — | `placeholder-card-grid-slider-default-card` | 822×1230 | 670×1004 |
| Card Grid | slider-default-card-square | — | `placeholder-card-grid-slider-default-card-square` | 485×280 | 335×280 |
| Card Grid | Grid Cards (Max 3 Cards) | Imagen de la card | `placeholder-card-grid-grid-cards-imagen-de-la-card` | 760×760 | 760×760 *(la de desktop)* |
| Banner con tarjetas | — | Fondo | `placeholder-gradient-cards-fondo` | 2784×1994 | 702×1600 |
| Texto con imagen ancha | — | — | `placeholder-text-wide-image` | 2100×760 | 2100×760 *(la de desktop)* |
| Imagen + destacados | — | — | `placeholder-image-features` | 2160×1080 | 2160×1080 *(la de desktop)* |
| Mosaico | — | Imagen del mosaico | `placeholder-mosaic-imagen-del-mosaico` | 760×760 | 760×760 *(la de desktop)* |
| Cards con logo | — | Imagen de fondo | `placeholder-logo-cards-imagen-de-fondo` | 768×557 | 702×1048 |
