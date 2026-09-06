# Placeholders

Imagenes de relleno con las medidas EXACTAS que pide cada componente. Se suben UNA vez a
la Media library de Drupal y quedan disponibles para armar paginas de prueba sin tener
todavia el material definitivo.

Salen de `src/data/components.js`, la misma fuente que usa la matriz de contenido. Para
regenerarlas: `node tools/placeholders.mjs` desde `runner/`.

Son 36 archivos. El peso de la columna "Max" es el limite que pide el CMS:
estas pesan mucho menos, asi que no hay problema.

| Componente | Variante | Campo | Vista | Medida | Max | Archivo |
|---|---|---|---|---|---|---|
| Menú de marca | — | Logo | desktop | 100×100 | 500kb | `placeholder-brand-menu-logo-desktop-100x100.png` |
| Menú de marca | — | Logo | mobile | 100×100 | 500kb | `placeholder-brand-menu-logo-mobile-100x100.png` |
| Banner | Main Hero | — | desktop | 2100×1050 | 500kb / 2-4MB | `placeholder-banner-main-hero-desktop-2100x1050.png` |
| Banner | Main Hero | — | mobile | 526×936 | 500kb / 2-4MB | `placeholder-banner-main-hero-mobile-526x936.png` |
| Banner | Secondary Hero | — | desktop | 2100×700 | 500kb / 2-4MB | `placeholder-banner-title-description-desktop-2100x700.png` |
| Banner | Secondary Hero | — | mobile | 526×526 | 500kb / 2-4MB | `placeholder-banner-title-description-mobile-526x526.png` |
| Banner | Brand Hero | — | desktop | 2088×835 | 500kb / 2-4MB | `placeholder-banner-brand-hero-desktop-2088x835.png` |
| Banner | Brand Hero | — | mobile | 526×789 | 500kb / 2-4MB | `placeholder-banner-brand-hero-mobile-526x789.png` |
| Banner | Promotional banner (Only image) | — | desktop | 2088×696 | 500kb / 2-4MB | `placeholder-banner-only-image-desktop-2088x696.png` |
| Banner | Promotional banner (Only image) | — | mobile | 465×675 | 500kb / 2-4MB | `placeholder-banner-only-image-mobile-465x675.png` |
| Imagen | image_background_box | — | desktop | 2088×1044 | 500kb / 2-4MB | `placeholder-content-image-image-background-box-desktop-2088x1044.png` |
| Imagen | image_background_box | — | mobile | 526×789 | 500kb / 2-4MB | `placeholder-content-image-image-background-box-mobile-526x789.png` |
| Carrusel de servicios | — | Fondo | desktop | 2160×1212 | 500kb | `placeholder-services-carousel-fondo-desktop-2160x1212.png` |
| Carrusel de servicios | — | Fondo | mobile | 562×999 | 500kb | `placeholder-services-carousel-fondo-mobile-562x999.png` |
| Carrusel de testimonios | — | Imagen | desktop | 1552×1014 | 500kb | `placeholder-testimonials-imagen-desktop-1552x1014.png` |
| Carrusel de testimonios | — | Imagen | mobile | 670×446 | 500kb | `placeholder-testimonials-imagen-mobile-670x446.png` |
| Carrusel de marcas | — | Imagen de marca | desktop | 822×616 | 500kb | `placeholder-brand-cards-imagen-de-marca-desktop-822x616.png` |
| Carrusel de marcas | — | Imagen de marca | mobile | 822×616 | 500kb | `placeholder-brand-cards-imagen-de-marca-mobile-822x616.png` |
| Carrusel de productos | — | Imagen izquierda (imagen única) | desktop | 650×692 | 500kb | `placeholder-product-list-imagen-izquierda-imagen-unica-desktop-650x692.png` |
| Carrusel de productos | — | Imagen izquierda (imagen única) | mobile | 650×692 | 500kb | `placeholder-product-list-imagen-izquierda-imagen-unica-mobile-650x692.png` |
| Línea de tiempo | — | — | desktop | 670×502 | 500kb | `placeholder-timeline-desktop-670x502.png` |
| Línea de tiempo | — | — | mobile | 670×502 | 500kb | `placeholder-timeline-mobile-670x502.png` |
| Carrusel de cards | Cards verticales | — | desktop | 822×1230 | 500kb | `placeholder-commitment-carousel-cards-verticales-desktop-822x1230.png` |
| Carrusel de cards | Cards verticales | — | mobile | 670×1004 | 500kb | `placeholder-commitment-carousel-cards-verticales-mobile-670x1004.png` |
| Card Grid | Slider Cards Default | — | desktop | 822×1230 | 500kb | `placeholder-card-grid-slider-default-card-desktop-822x1230.png` |
| Card Grid | Slider Cards Default | — | mobile | 670×1004 | 500kb | `placeholder-card-grid-slider-default-card-mobile-670x1004.png` |
| Card Grid | slider-default-card-square | — | desktop | 485×280 | 500kb | `placeholder-card-grid-slider-default-card-square-desktop-485x280.png` |
| Card Grid | slider-default-card-square | — | mobile | 335×280 | 500kb | `placeholder-card-grid-slider-default-card-square-mobile-335x280.png` |
| Card Grid | Grid Cards (Max 3 Cards) | Imagen de la card | desktop | 760×760 | 500kb | `placeholder-card-grid-grid-cards-imagen-de-la-card-desktop-760x760.png` |
| Banner con tarjetas | — | Fondo | desktop | 2784×1994 | 500kb | `placeholder-gradient-cards-fondo-desktop-2784x1994.png` |
| Banner con tarjetas | — | Fondo | mobile | 702×1600 | 500kb | `placeholder-gradient-cards-fondo-mobile-702x1600.png` |
| Texto con imagen ancha | — | — | desktop | 2100×760 | 500kb | `placeholder-text-wide-image-desktop-2100x760.png` |
| Imagen + destacados | — | — | desktop | 2160×1080 | 500kb | `placeholder-image-features-desktop-2160x1080.png` |
| Mosaico | — | Imagen del mosaico | desktop | 760×760 | 500kb | `placeholder-mosaic-imagen-del-mosaico-desktop-760x760.png` |
| Cards con logo | — | Imagen de fondo | desktop | 768×557 | 500kb | `placeholder-logo-cards-imagen-de-fondo-desktop-768x557.png` |
| Cards con logo | — | Imagen de fondo | mobile | 702×1048 | 500kb | `placeholder-logo-cards-imagen-de-fondo-mobile-702x1048.png` |
