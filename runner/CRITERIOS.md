# Criterios de migracion (decisiones tomadas)

Registro de las decisiones del Websites Expert al revisar la migracion de paginas del sitio viejo al
CMS nuevo. Cada criterio tiene el caso que lo origino. **Se lee antes de traducir o corregir una
pagina**, y cada decision nueva se agrega aca en el momento en que se toma (no al final de la ronda):
es lo que permite que la ronda siguiente no repita el error de la anterior.

Formato: la regla en negrita, despues el por que y el caso de origen. Si una regla se ajusta, se
reescribe (no se agrega otra que la contradiga) y se deja el caso nuevo.

## Proceso

- **Case by case, con verificacion visual de cada pagina.** Nada de correcciones en masa sin mirar el
  resultado: cada cambio se recarga en el Hub, se captura y se mira contra el sitio viejo. Origen: MX,
  ronda 4 ("prefiero case by case, asi realmente nos aseguramos de que todo este bien").
- **Un patron se busca en TODAS las paginas**, pero cada aparicion se resuelve y verifica por separado.
  Que el usuario marque un caso no significa que sea el unico.
- **Las decisiones que "se notan" las toma el que migra**, sin esperar a que las marquen: un CTA que el
  copy esta pidiendo, un icono que no dice nada, una banda que quedo vacia. Origen: MX, ronda 5
  ("donde comprar se nota que tiene que llevar un cta, ese es el tipo de decisiones que quiero que
  tomes tambien").
- **Los "decidir si..." no se dejan como pendiente**: si la decision sale de estos criterios, se toma
  y se anota lo que se decidio. Al usuario le llega solo lo que de verdad no se puede decidir sin el
  (un dato del negocio, un copy nuevo, un asset que no existe).
- **Cada pregunta al usuario va con la imagen**: como se ve hoy y como quedaria (antes/despues, en la
  captura del Hub). Una pregunta de diseño sin imagen obliga a imaginarse el resultado. Origen: MX,
  ronda 5 ("al hacer estas preguntas mostrame").
- **Las paginas que cargamos en content quedan PUBLICADAS.** Antes la regla era dejarlas en borrador;
  la cambio el usuario al pasar a cargar por MCP (MX, octubre 2026). Solo se escribe en content: preprod
  y prod los arma F5 exportando desde ahi. Las paginas editadas a mano en el Hub, y cualquier pagina que
  ya exista en el CMS, no se pisan.

- **Si la pagina tiene frame en Figma, se sigue el layout de Figma.** Antes de armar o subir una
  pagina se busca su frame en Figma (archivo del rediseño: Home, Brands, Club Purina®, Purina®
  Cuida, Institucional, Cookies, Blog, las homes de marca...). Si existe, la estructura, el orden
  de los bloques, los componentes y las imagenes salen de ahi; el hub se corrige contra el frame
  antes de subir, no despues. La matriz del mercado aporta el texto y lo que Figma no tiene. Solo
  las paginas SIN frame se arman directo desde el hub. Origen: MX, lote de subida a content (las
  de Club Purina salieron armadas desde el hub teniendo diseño en Figma y hubo que borrarlas).

## Alcance

- **Las paginas que ya existen en content y estan bien, quedan como estan**: no se suben ni se
  reemplazan. Hoy son /conoce-purina, /adopta/como-apoyamos-refugios y /adopta/tenencia-responsable.
  Origen: MX, subida a content.

- **Las paginas de linea de Pro Plan (debajo de /proplan/gatos y /proplan/perros) quedan en pausa**:
  la idea es linkear directo a los productos. Origen: MX, ronda 3.
- **Club Purina se arma a mano.** El borrador automatico queda solo como referencia. Origen: MX, ronda 2.

## Imagenes

- **Homes de marca: de donde sale cada imagen.** Primero la que entrego el mercado (matriz o carpeta),
  despues la del Figma, despues la del sitio viejo. Si una seccion no tiene ninguna, se busca una que
  quede bien en el sitio viejo, en MX o en BR (con el criterio de reuso BR/MX: fotos sin texto, pack ni
  logo). No se deja una seccion con placeholder: el placeholder es SOLO para el hero (ver Heroes).
  Origen: MX, homes de marca Ecosystem 2.0, pedido del usuario.

- **"Del Figma" es el ORIGINAL del frame de esa seccion, no una copia bajada del sitio publicado.** Se
  ubica la seccion en la home de la marca del Figma y se baja el archivo que tiene de relleno, en su
  resolucion; solo se recorta, se escala, se espeja (si el frame lo espeja) o se funden bordes. Una
  copia publicada se reemplaza por el original cuando el original da mas resolucion para ese recorte
  (el mosaico de Cat Chow y Fancy Feast estaba a 450px y el original da 1200 a 1800); si da lo mismo,
  se deja. Antes de usar el sitio viejo se revisa el Figma: en Felix, fondo de tarjetas, imagen de
  productos y mosaico 1 venian del sitio viejo y el Figma tenia los suyos. Origen: MX, homes de marca.

- **Marca sin matriz, sin carpeta y sin pagina en el Figma: fotos del sitio viejo, y el layout lo
  decide lo que haya.** Se recorre la home vieja y sus subpaginas; si aparecen fotos limpias (sin texto,
  pack ni logo) para el carrusel de cards (2+ verticales) y el mosaico (3), la home va completa; si no,
  reducida. Hero: placeholder igual (ver Heroes). Asi quedo Excellent (reducida) y se revisaron de nuevo
  Beneful, Campeon, Gatina y Dentalife (siguen reducidas: el sitio viejo solo tiene packs, ingredientes
  de 336px, iconos y banners con texto). Origen: MX, homes de marca, pedido del usuario.

- **Snacks NO es una marca**: agrupa snacks de varias (Dog Chow, Beneful, Felix, DentaLife). /snacks es
  una pagina de componentes comun, sin brand hero ni menu de marca, con un carrusel de productos por
  especie. Origen: MX, pedido del usuario.

- **Home de marca sin fotos usables: layout REDUCIDO, no secciones con fotos de relleno.** Si ni el
  mercado, ni el Figma, ni el sitio viejo tienen fotos para el carrusel de cards y el mosaico (el sitio
  viejo solo trae banners con el texto quemado y packs), esos dos bloques no se arman: la home queda en
  hero (placeholder) + 3 tarjetas con icono + carrusel de productos + "Cuidado integral". El copy de
  las tarjetas sale de lo que el sitio viejo ya publicaba (beneficios, claims de los banners), acortado
  a la guia de 90 sin agregar promesas. Cuando lleguen las fotos se suman los dos bloques. El bloque de 3 tarjetas NUNCA va sin imagen de fondo: el
  layout toma su alto de la imagen y sin ella colapsa y se monta sobre el carrusel de productos (paso
  en Campeon). Sin foto va un PNG TRANSPARENTE a la medida (2784x1994 / 702x1600): el panel muestra
  solo el degradé de la marca. Origen: MX,
  homes de Beneful, Campeón, Gatina y Dentalife (matrices vacias o sin imagenes).

- **La medida es la del catalogo del Hub**, siempre (`src/data/components.js`, `specs`/`specsByType`).
  Son las medidas reales del CMS. Origen: MX, ronda 3.
- **No se generan imagenes nuevas: se modifican y redimensionan las que ya existen.** Nada de IA
  generativa para crear contenido. Origen: MX, ronda 1.
- **Nunca texto sobre texto**: si la imagen trae letras metidas y el componente dibuja su titulo
  encima, hay que resolverlo (limpiar la imagen o cambiar de componente). Origen: MX, ronda 3.
- **Una imagen que en el sitio viejo se fundia con el fondo blanco se pinta del fondo nuevo.** Las
  fotos recortadas sobre blanco, las ilustraciones sin marco y las piezas con una curva que salia del
  blanco de la pagina funcionaban porque la pagina era blanca; con la marca del nodo (verde Dog Chow,
  negro Pro Plan) quedan como un recuadro blanco. Se rellena SOLO el blanco que toca el borde de la
  imagen (inundacion desde el borde, no todo lo claro) y se multiplica por el color nuevo, asi las
  sombras suaves quedan como sombra de ese color y no como halo gris. El color es el que la rodea: el
  de la pagina (Dog Chow #007A38) o el de la card si va adentro de una (Pro Plan Brand 03 #1F1F1F). La
  excepcion es una pieza con logo o texto de color pensada sobre blanco (el hero de Calidad en tus
  manos): pintarla rompe el logo, queda blanca. Origen: MX, revision de los colores de marca ("esta
  imagen tiene efecto al no tener fondo, antes funcionaba porque era blanco", transicion de alimento
  de Dog Chow).
  **Excepcion (ronda 10): las FOTOS no se pintan.** Una foto recortada (el perro con el plato de
  Calidad en tus manos) o una foto con marco propio (el circulo de "Nuestra promesa") pintada del
  color de la pagina queda como un recorte flotando, y no se ve bien: van con su fondo blanco, como
  una card blanca sobre la pagina. Pintar sigue valiendo para ilustraciones y graficos sin foto.
  Origen: MX, Calidad en tus manos ("la foto del perro debe tener el fondo blanco, ya que no queda
  bien sin fondo"; la de nuestra promesa igual, por consistencia).
- **Al sacar un elemento del borde de una imagen (la cuña verde del sitio viejo) no se recorta al
  sujeto.** Si el recorte a la medida del componente se come la cabeza del sujeto, se rellena el
  hueco con el fondo de la propia foto (desenfocado, inpainting clasico) y se recorta por el costado
  vacio, no por arriba. Origen: MX, banner "La combinacion perfecta" de Longevidad ("se corta la cara
  del perro").
- **El desenfocado solo si queda bien.** Sirve para rellenar el lado del titulo cuando el fondo ya era
  suave (bokeh, bosque, follaje: el FAQ de LiveClear es el ejemplo bueno). En heroes con fondo nitido
  queda mal y no se usa. Origen: MX, ronda 4.
- **Si la imagen no se puede limpiar bien, va el componente Imagen (`c_image`, Image Bottom) con el
  banner del sitio viejo entero** y el texto real en el componente, arriba. Origen: MX, ronda 4.
- **Fondo liso con letras: se pinta del color del fondo** y el texto pasa al componente. Ojo con el
  contraste: si el titulo del componente es blanco y el fondo pintado es claro, no sirve (ver
  Contraste). Origen: MX, ronda 4.
- **Contraste del titulo blanco sobre la foto: minimo 3:1** con el velo del hero. Se mide con el
  percentil 80 de luminancia de la zona del texto. Por debajo, se ajusta la imagen o se cambia de
  componente. El caso que lo marco (Vet Diets, titulo blanco sobre bata blanca) daba 2.15. Origen: MX,
  ronda 5.
- **Las posiciones sin medida en el catalogo (text_image, Imagen fuera de Background Box) llevan el
  original ENTERO**, sin recortar. Si un bloque cambia a una de esas posiciones, vuelve al original (no
  se queda con el recorte de la posicion anterior). Origen: MX, ronda 5 (el perro y el circulo de
  Calidad en tus manos; la banda de Gran Comienzo).
- **Imagenes pensadas a sangre van a sangre**: bandas con curvas o fondos que en el sitio viejo iban de
  borde a borde llevan Image Style = Full Width y Spacing = Sem espaco vertical; si son el ultimo
  bloque, pegadas al footer. Origen: MX, ronda 5 (transicion de alimento en Calidad en tus manos).
- **No queda ninguna banda vacia.** Si al sacar el texto de una imagen queda un espacio que en el
  sitio viejo era para ese texto, el texto vuelve a ese lugar (o la imagen se recorta al contenido
  y el texto va al lado). Origen: MX, ronda 5 (banda "SIN colorantes" de Gran Comienzo).
  Si ese lugar es oscuro, el texto vuelve EN la banda como Banner, alineado del lado libre (Sabrosobres
  "¡Una combinacion irresistible!", Nutricion Reforzada "¡Adios a la monotonia!"). Si es claro, la
  imagen se recorta y el texto va al lado.
- **Una banda decorativa a todo el ancho (un plato chico sobre textura) va a sangre con el texto
  aparte**, como en el sitio viejo; en media columna el contenido queda chiquito. Origen: MX, ronda 5
  (bodegones de Longevidad y Nutricion Reforzada).
- **Un marco pensado para fundirse con el fondo de la pagina vieja se recorta**: en la pagina nueva
  se ve como un recuadro. Origen: MX, ronda 5 (banner "Oli" de Longevidad).
- **Las curvas de transicion se sacan**: una forma lisa al borde de la imagen (una V, una ola, una
  franja) que en el sitio viejo servia para empalmar con la seccion de al lado queda suelta en la
  pagina nueva (la V blanca al pie del hero de LiveClear sobre la pagina oscura de Pro Plan). Se pinta
  con el color del fondo de la foto o se recorta, sin tocar el sujeto. **La V verde al pie de los
  banners de Dog Chow TAMBIEN es transicion y se saca** (en la ronda 5 se la habia dejado como sello de
  la marca y el usuario la marco en Combinacion de proteinas, Longevidad, Nutricion Reforzada, FAQ y
  Sabrosobres: "controla todas"). Lo que SI queda es lo que forma parte de la escena: el hexagono de
  linea verde alrededor del sujeto, o un piso donde esta parado el sujeto (la linea dorada y el blanco
  donde esta sentado el gato de Cat Chow, con su sombra). Origen: MX, rondas 5 y 6. Se busca en TODAS
  las paginas (detector de formas lisas al borde + revision a ojo).
- **Una foto de persona que en el sitio viejo era un avatar chico va en una columna chica**
  (layout 25/75: foto en la de 25, texto en la de 75), no en texto con imagen, donde ocupa media
  pantalla. Origen: MX, ronda 5 (Dr. Satyaraj en Alergenos del gato), confirmado por el usuario.
- **Los avisos legales metidos en una imagen no se borran** (la linea de marcas registradas al pie de
  una infografia), aunque esten en ingles: los decide Legal.

## Heroes y banners

- **Hero de una home de marca sin su asset especifico (el video de la marca, el key visual de la
  campaña): se pone el PLACEHOLDER del Brand Hero y se marca como pendiente.** No se lo reemplaza con
  otra foto: el hero es la pieza de la marca y una foto cualquiera ahi parece una decision tomada. Es la
  unica seccion que lleva placeholder; en el resto se busca una imagen que funcione (ver Imagenes).
  Origen: MX, home de Dog Chow (el video no estaba en la carpeta), pedido del usuario.

- **Hero con video: en el CMS va un Responsive Video (mp4 desktop + mobile, sin audio); en el Hub, un
  cuadro del mismo video.** El bucket del Hub no acepta mp4. El medio de video se crea antes de guardar
  la pagina con el MISMO nombre que el traductor le da a la imagen del hero, asi el runner lo elige de
  la libreria en vez de subir el cuadro. Si el video trae bandas negras (el "desk" de Fancy Feast tenia
  90px de cada lado) se RECORTAN sin escalar hasta la proporcion del hero: estirarlo agranda las bandas
  de compresion y el sitio lo dibuja a sangre. Origen: MX, homes de Fancy Feast y Pro Plan.

- **Hero con video sin version mobile: el mobile es un mp4 de UN cuadro fijo en 2:3.** El Responsive
  Video solo acepta mp4 en los dos campos, asi que la "imagen" mobile va como video quieto (3 s, unos
  100 KB). El hero mobile del sitio es **1:1.5** (clase `media--ratio-1-1-5--2-5-1`; desktop 2.5:1),
  no cuadrado: el cuadro se arma a esa proporcion y se elige uno con el sujeto entero, sin el texto
  quemado del spot; el logo de la esquina se saca con inpaint sobre el fondo difuso. Para cambiar el
  medio de un hero ya publicado esta `qa-local/_hero-medio.mjs` (quita la referencia sin borrar el
  medio viejo de la libreria). Origen: MX, home de Dog Chow (spot 100 años).

- **"Cuidado integral" (Tabs Full Background): la foto tiene que LEERSE y el texto blanco pasar 4.5:1.**
  El titulo y la bajada van siempre en blanco (el Text Color de Classy solo pinta las pestañas). La
  franja mide 2.32:1 (1440x620), la foto 16:9 se recorta arriba y abajo, y las tarjetas tapan la
  mitad de abajo: lo unico que queda a la vista es la franja de ARRIBA del titulo (en la foto de
  2160x1212, y 150..330; mobile 562x999, y 60..250). Por eso: (1) el sujeto (caras, mascotas) se
  corre o se reencuadra hasta esa franja, o a la derecha del texto (x>1650); (2) el velo va SOLO
  detras del texto, con degradé suave desde la izquierda, nunca sobre toda la mitad de arriba: un
  velo ancho apaga justo lo unico que se ve y la foto deja de entenderse. En fondo blanco
  (ilustracion) el velo va del color de la marca. Herramienta: `bin/serv.py` + `bin/simular.py` (simula
  texto y tarjetas a 1440, 1920 y 390 antes de subir). Ojo con los archivos del mercado: en Dog Chow
  "Desktop" y "Mobile" venian INVERTIDOS (medir siempre el tamaño real). Origen: MX, homes de marca
  ("el fondo del carrusel de servicios no se entiende").

- **Si el titulo cruza al sujeto o al producto, se parte**: el h1 queda con lo que dice de que es la
  pagina y el resto pasa a la bajada, sin reescribir ("Donde comprar" + "Encuentra tu veterinaria mas
  cercana...", "Resultados visibles en 28 dias" + "Purina® One® para perros."). El corte cae en un
  limite natural de la frase. Origen: MX, ronda 5, confirmado por el usuario.
- **Si el key visual trae su propio texto (slogan, claim, logo de producto, placa de datos), va
  ENTERO y el titulo con la bajada van ARRIBA, como texto** (Imagen con "Image Bottom": titulo,
  bajada y debajo la pieza original, desktop y mobile). Asi la pieza se ve como se diseño y el texto
  de la pagina no compite con sus letras. Es el caso de Pro Plan Gatos y Perros ("Alcanza lo
  excepcional"), Satisfaccion Garantizada, LiveClear, Calidad en tus manos y los heroes de Dog Chow
  con logo (Gran Comienzo, Nutricion Reforzada, "Sensacional" de Combinaciones). Si la pieza traia una
  forma pensada para pegarse a una seccion de color del sitio viejo (la cuña verde de Dog Chow), se
  pinta del fondo de la pagina. Origen: MX, revision de los colores de marca ("en este tipo de casos
  si me gusta mucho mas que el titulo y subtitulo este por encima del banner", Pro Plan Perros).
- **La excepcion: si las letras de la imagen SON el titulo** (no un slogan: el mismo texto, como
  "UN SOLO producto 15 BENEFICIOS PARA LA SALUD" de Campeon), titulo arriba e imagen abajo repiten
  todo. Ahi se borran las letras de la imagen y el titulo va EN el banner. Origen: MX, idem ("no me
  gusta que aca no usemos banner y que se repitan las palabras", Campeon).
- **Un hero sin letras en la imagen es Banner con el titulo adentro**, como siempre (Alergenos del
  gato, Estandares). Si el titulo cruzaria al sujeto, se corre la foto (se extiende su propio fondo o
  se achica contra una esquina) antes que partir el titulo.
- **Cuando hay que borrar letras (la excepcion de arriba), solo limpiando, nunca dibujando.** Letras sobre un fondo liso o un degrade
  (crema, rojo, turquesa): se rellena con el mismo fondo, columna por columna. Letras sobre una
  franja oscura con textura: inpainting chico, solo sobre el trazo de la letra. Una placa grande
  sobre un fondo con textura: se tapa con el MISMO fondo de otra parte de la imagen. Si para que el
  titulo no cruce al sujeto hace falta mas lugar, se extiende el fondo propio de la imagen (espejado
  y desenfocado, que no se lea como repeticion) o se achica la foto contra una esquina; nunca se
  agrega nada que no estuviera. Un fondo claro donde el blanco no se lee se pinta del color de la
  propia pieza o de la marca (Campeon: el rojo de su titular; Calidad: el verde de Dog Chow), igual
  que las imagenes que se fundian con el blanco.

- **Si la imagen tiene una zona limpia y oscura, el texto va EN el banner y la imagen se ajusta para
  eso** (encuadre, alineacion del texto, titulo mas corto si hace falta). Sacar el texto del banner es
  el ultimo recurso, no el primero. Origen: MX, ronda 5 (hero de Gran Comienzo).
- **Una imagen buena puede ser banner aunque en el sitio viejo no lo fuera.** Satisfaccion Garantizada
  y Donde comprar (La nutricion mas avanzada) pasaron a Secondary Hero. Origen: MX, ronda 5.
- El titulo del Secondary Hero no tiene tope de ancho (confirmado con la captura del CMS en el
  playbook): un titulo largo cruza la foto. Se cuenta con eso al encuadrar.
- **Un banner sin imagen no va**: dibuja un recuadro vacio. Si la pagina vieja no tenia hero (legales,
  estudios), el titulo es un bloque de texto centrado. Origen: MX, ronda 5 (Cookies, Terminos,
  Estudio de esperanza de vida).
- **Toda pagina arranca con un banner. Nunca con un texto con imagen (50/50).** Si el hero del sitio
  viejo es de fondo claro y sin letras metidas, igual va Banner: la foto se encuadra con el sujeto del
  lado contrario al titulo y la zona del titulo se oscurece hasta que el blanco pase el contraste
  (ver Contraste). Origen: MX, ronda 6 (Vet Diets: "no podes comenzar la pagina con un 50/50, tiene que
  ser un banner"). Reemplaza a la regla de la ronda 5 que ponia esos heroes como texto con imagen. Las
  paginas sin hero en el sitio viejo (legales, estudios) siguen arrancando con el titulo en texto.
- **Imagen con card (Image Background Box) solo si la card no tapa nada.** Si la foto tiene una zona
  lisa u oscura para el texto, va Banner con el texto EN esa zona, sin card (Dog Chow Snacks "Con menos
  de 7 calorias" y "Estamos comprometidos", el cierre de Longevidad). La card frosted sobre una foto
  con sujeto o sobre un relleno de borde se ve pegada. Origen: MX, ronda 6 ("los banners con cards de
  dog chow snacks no se ven para nada bien, tenemos que tener un qa para estos casos").
- **QA de banners (`qa_banners.py`), en cada ronda y sobre las 38 paginas**: por cada banner e Imagen
  con card mide si queda una banda de transicion en algun borde (desktop y mobile), cuanto detalle
  hay en la zona del titulo (sujeto o letras de la imagen debajo del texto) y el contraste del blanco.
  Lo que se miro a ojo y se acepto va a `qa_banners_ok.json` con el motivo (los pisos de Cat Chow y
  Purina One, el pasto de Dog Chow), asi la corrida siguiente solo muestra lo nuevo.
- **Un titulo de banner que cruza al sujeto o a letras de la imagen se parte** aunque la imagen ya este
  bien encuadrada: el h1 queda con lo que dice de que es la pagina o la seccion ("Combinaciones de
  proteinas", "Estamos comprometidos") y el resto pasa a la bajada, sin reescribir. Origen: MX, ronda 6.
- **Los banners de una misma pagina van con la misma alineacion, por defecto a la izquierda**, y eso
  incluye los slides de un carrusel de banners: uno a la izquierda y el siguiente centrado se lee como
  un descuido. Si el CMS guarda uno distinto de lo cargado, se corrige (el runner ya lo repasa solo,
  ver README). Origen: MX, Pro Plan Perros ("siempre tratemos de mantener una alineacion, en este caso
  izquierda").
- **El h1 de la pagina y su subtitulo van SIEMPRE alineados a la izquierda**, como el layout del
  sitio, aunque el bloque sea de Texto o Imagen y en el sitio viejo estuviera centrado. Origen: MX,
  Satisfaccion garantizada.
- **Un banner que no tiene nada alrededor no luce:** en una pagina casi sin contenido el desenfoque
  que el banner le aplica a la foto queda mal. Ahi va la Imagen tal cual (`c_image`, Image Bottom) con
  el titulo arriba. Origen: MX, Estandares de nutricion.
- **Si el usuario ya decidio un hero, no se revierte por una regla general nueva.** Pro Plan Gatos y
  Perros quedan como Imagen con el key visual entero (ronda 4, confirmado de nuevo al revisar los
  colores de marca).

## Textos

- **El subtitulo nunca lleva saltos de linea.** Va en una sola linea (o un solo parrafo): las frases
  que venian partidas con `<br>` se unen con un espacio, poniendo el punto que falte entre una y otra.
  Vale para el subtitulo de cualquier componente, la Description del banner y la bajada de un h1.
  Origen: MX, Gran Comienzo ("el subtitulo nunca debe estar separados por breaks").
- **El contenido no puede quedar solo como texto adentro de una imagen.** Una infografia con
  informacion (cifras, pasos, porcentajes) se rearma con componentes de texto: cards con icono para
  las cifras, cards numeradas para los pasos. La imagen se puede sacar. Un key visual de campaña con
  su slogan NO entra aca (ver Heroes). Origen: MX, Campeon 15 beneficios ("no esta ni en formato
  texto, no podamos obviar contenido de esta manera"), y por la misma regla la transicion de alimento
  de Calidad en tus manos y los 97% / 47% de Alergenos del gato.
- **Una cita va como cita:** la frase entre comillas en el titulo del bloque de Texto y el nombre (con
  su cargo) en el subtitulo. No como un parrafo en negrita con "-Nombre" abajo. Origen: MX, Alergenos
  del gato.

- **Nada de mayusculas sostenidas.** Todo lo que en el sitio viejo venia en ALL CAPS (titulos, bajadas,
  nombres de producto en el cuerpo) pasa a tipo oracion; las marcas quedan con su mayuscula inicial
  ("PRO PLAN® VETERINARY DIETS" -> "Pro Plan® Veterinary Diets") y las siglas quedan como siglas (DHA,
  EPA, ADN). Si hace falta enfasis, es la tipografia del componente la que lo da. Origen: MX, ronda 6
  ("LA SALUD DE LOS GATOS Y PERROS": "todo lo que este en all caps podes poner bien").
- **El subtitulo NO tiene color propio en el CMS: toma el mismo que el titulo.** Sin Text Color de
  Classy, los dos van en el texto por defecto de la marca (blanco en Pro Plan, Dog Chow, Purina One y
  Cat Chow); con Text Color, ese color pinta los dos juntos. No hay forma de separarlos, asi que un
  subtitulo con poco contraste se resuelve con el fondo del bloque, nunca con su color. Medido sobre
  el CSS real con cada marca (`components-text__subtitle`). Origen: MX, Estudio sobre la esperanza de
  vida (el mockup lo dibujaba gris violaceo: era un error del hub, no del sitio).
- **Si el sitio viejo tenia una bajada debajo del titulo de una seccion, va al subtitulo del
  componente.** No se pierde al traducir. Origen: MX, Opti tecnologias ("por que no usamos los
  subtitulos nosotros?").

## Figma

- **Si la pagina esta diseñada en Figma, se sigue ese layout con el contenido del sitio viejo.** Esto
  vale para todas. El indice es `figma_mx_inventario.csv` (archivo `zKnt2Z78kLDgBt0GM7DgL2`). Hoy el
  Figma tiene las portadas de seccion (Purina Cuida, Calidad, Nutricion, Comunidad, Por el planeta),
  Institucional (Nuestra historia, Nutricion y calidad, Preguntas frecuentes, Aliados, Profesionales,
  Contacto) y la home de cada marca; NO tiene Ingredientes, Estandares ni Purina Cares. Origen: MX,
  Ingredientes ("esta pagina esta en figma no? ... esto aplica para todas").

## Despues de subir

- **Se pide cada imagen publicada (src y srcset) y se mira que no venga vacia.** Drupal arma las
  versiones AVIF la primera vez que alguien las pide, y si eso falla queda un archivo de 0 bytes que se
  ve como un recuadro gris con el alt. No se arregla solo: se vuelve a subir el MISMO archivo con otro
  nombre en el medio (`qa-local/_reemplazar-medio.mjs`, `SOLO=field_media_image`), asi la version nace
  de nuevo. Origen: MX, el hero desktop de Alergenos del gato (y antes Crecimiento), subidos durante un
  corte de red.
- **Se mira la pagina publicada buscando marcas a la vista** (`**`, `](`). Un campo de cuerpo que no
  ofrece Purina Markdown recibe HTML, y si el texto no se convierte los asteriscos salen tal cual.
  Origen: MX, el hero de Dentalife preguntas frecuentes.

## Spacing

- **Que hace cada opcion** (medido en el CSS real de content, 2026-10): `space_py_N` es el mismo
  padding arriba y abajo en todos los anchos (0, 4, 8, 12, 16, 20, 24, 32, 36, 40, 60, 80, 120 px).
  Las "Espaçamento de Seção" tienen mas abajo que arriba y cambian a los 992px: Minimo 4/8 -> 8/16,
  Extra Pequeño 8/16 -> 16/32, Pequeño 16/32 -> 20/40, **Medio 20/40 -> 32/60**, Grande 32/60 ->
  40/80, Extra Grande 40/80 -> 60/120 (mobile -> desktop, arriba/abajo).
- **Sin spacing cargado cada componente trae el suyo**: Medio en todos los card grid, la Imagen,
  las pestañas, el carrusel de productos y el resto de las secciones; 20/20 el Texto y el Texto
  con imagen; 16/16 el Banner; **0 el Acordeon suelto**. El aire entre dos bloques es la SUMA del
  de abajo de uno y el de arriba del otro.
- **Un Texto que es solo el TITULO de la seccion de abajo va con 0 (`space_py_0`)**: asi queda a
  32px de su contenido (el aire de arriba del componente que sigue) y no flotando a mitad de camino.
  Para que se lea como el arranque de una seccion nueva, lo que tiene ARRIBA tiene que dejar 60:
  si es un Texto o un Texto con imagen (20), pasa a Seccion Medio. Lo mismo el titulo de pestañas
  que el traductor pone en un Texto antes del Tabs.
  **Excepcion: justo despues del banner** el titulo conserva su 20/20. El banner deja 16 abajo y
  agrandarlo cambiaria el arranque de todas las paginas.
- **El Acordeon suelto va con Seccion Medio.** Con su 0 por defecto queda pegado al banner de
  arriba y al titulo de abajo. Ademas, suelto en la pagina mide como maximo 686px y va centrado, y
  todos los items arrancan cerrados: es el diseño del CMS (esta pensado para ir en una columna).
- **El Carrusel de banners (Banner Wrapper) va con Seccion Medio.** Su default es 0 y las flechas
  van arriba a la derecha, AFUERA del banner: despues de un carrusel de productos quedaban encima
  del "Ver todos" y las dos piezas se tocaban. Con Medio las flechas bajan 32px y el banner queda
  separado. Origen: MX, Pro Plan Perros ("entre el banner de pro plan veterinary diets y el carrusel
  de alimento humedo, estas 2 partes se tocan").
- Origen: MX, primera pagina subida con el runner (Por que cambiar a Purina One: "quiero que
  aprendas sobre los spacings que tenemos y que apliques correctamente, ademas, que paso con el
  accordion?").

- **Homes de marca: el hero va con `space_py_5` y el primer bloque despues del hero con `space_py_11`**,
  como el modelo de F5 (/proplan, armado desde el Figma). Queda 100px de aire despues del hero y
  112 hasta el bloque siguiente en desktop; el resto con los defaults (92 / 60 / 60). En mobile
  py_11 es fijo (80), asi que entre el primer y el segundo bloque quedan 136px. Origen: MX, homes de
  marca ("buenos margenes entre components").

## Mobile

- **Cada pagina se revisa tambien en mobile** (toggle Desktop / Mobile del builder, 390px con las
  imagenes mobile) y la galeria muestra las dos versiones lado a lado. Origen: MX, ronda 7 ("estas
  considerando mobile para todas las paginas no?").
- **Como pone el texto el sitio nuevo en el celular** (mirado en staging): el Secondary Hero es 1:1
  con el texto a la izquierda y centrado en vertical, ENCIMA de la foto, aunque pise al sujeto. Por eso
  en mobile lo que se exige es que se LEA: **4.5:1** en toda la franja del texto (la bajada es letra
  chica; el 3:1 queda para el titulo grande de desktop). Si no llega, se oscurece esa franja con un
  degrade suave, lo justo para pasar. Lo mide `qa_banners.py` (`contraste mobile`).
- **Texto sobre foto en mobile ESTA BIEN; solo es problema si debajo hay letras de la imagen o si
  no llega al contraste.** Que el titulo o la bajada pisen al sujeto (la cara del perro, la comida) no
  se corrige. Lo que si: letras de la imagen debajo del texto (un logo, un titulo impreso, un empaque,
  el texto curvo de un sello) y contraste por debajo de 3:1 (titulo grande) o 4.5:1 (el resto). Vale
  para banners y para cards. Lo mide el QA de mobile: captura cada pagina a 390px con y sin texto,
  busca letras debajo con OCR y mide el contraste de cada linea. Origen: MX, revision mobile
  ("casos de texto encima de imagen no importa a menos que las imagenes tengan tambien texto o que
  haya poco contraste"; el caso que lo abrio fue el logo de Opti debajo de la descripcion).
- **Nunca texto sobre texto, tampoco en mobile**: si el titulo cae sobre letras de la imagen mobile
  ("SENSACIONAL" en Combinacion, el claim de Sabrosobres), se recorta distinto o, si las letras estan
  sobre un fondo liso, se pintan con ese fondo.
- **Una imagen con letras metidas no se achica a mobile**: si el sitio viejo tenia version mobile
  (Campeon, Calidad en tus manos), va esa; una foto apaisada sin letras se recorta a 4:3 sobre el
  sujeto (una tira de 1920x500 en el celular queda de 90px); si no hay version mobile y las letras no
  se leen, queda como pendiente para la agencia.

## Productos

- **Cards que llevan a productos se reemplazan por el carrusel de productos.** Ya no hay cards
  personalizadas para productos. Origen: MX, ronda 4. **Aunque la card lleve a una gama o a un
  listado y no a la ficha de un producto, si lo que muestra son productos va en el carrusel de
  productos**: las Opti tecnologias de Pro Plan y "Alimento seco / Alimento humedo" de Purina One.
  Se probo pasarlas a cards Simple con su imagen original y el usuario lo freno ("ojo que aca tenemos
  que usar los carruseles de productos, porque esos son productos"). Origen: MX, revision de los
  colores de marca.
- **Nada de listas de productos (acordeones, textos) debajo del carrusel**: los productos y su
  descripcion salen del CMS. Origen: MX, ronda 5 (Opti tecnologias).
- **Un bloque que ES un producto va en el carrusel de productos**, aunque sea uno solo. Origen: MX,
  ronda 5 (el packshot de LiveClear).
- **El titulo del carrusel va en el campo Titulo del carrusel**, no en un bloque de texto aparte:
  mismo componente, mismo tipo de titulo. Origen: MX, ronda 5 ("Alimento seco" bien, "Alimento
  humedo" mal).
- **Un titulo de carrusel largo se parte en titulo y subtitulo**: lo que viene despues de los dos
  puntos, o la parte que describe, va al subtitulo del componente ("Purina® Pro Plan® LiveClear™" +
  "Alimento seco para gatos con una formula reductora de alergenos"). Vale para todos los carruseles
  (productos y cards). Origen: MX, ronda 6 (LiveClear, Nutricion Reforzada: "controla demas
  carruseles").
- **Una pagina de preguntas sobre un producto cierra con el carrusel de ese producto**, para seguir
  guiando al usuario. Origen: MX, ronda 5 (FAQ de LiveClear). **Las FAQ de marca tambien**: cierran con
  el carrusel de productos de la marca (Dog Chow, Cat Chow, Beneful, Dentalife). Confirmado por el
  usuario.
- **Los productos todavia no estan cargados en el CMS**: los nombres del carrusel son una guia para el
  editor, no hace falta el nombre exacto de catalogo ni frenar por un producto que falta.
- **Mientras los productos no esten migrados, el carrusel lleva MUESTRAS de la marca** (`productosMuestra`
  del mapping, nids de content) y se cambian por los reales despues, todos juntos con
  `npm run editar` (`field_block.productos`). Preprod tiene otros nids: antes de armar alla hay que
  mirar que productos de muestra existen ahi. Origen: MX, pedido del usuario ("dejemoslo con productos
  de muestra de la marca y despues ponemos los correctos").

## Menu de marca

- **El menu de marca (la barra con el logo debajo del header) sale de la MATRIZ; si la matriz no lo
  trae, del menu del sitio viejo. Lo que haya hoy en content no manda.** Es un menu de Drupal por
  marca (`dog-chow`, `pro-plan`...), elegido en el campo "Brand Menu" del termino de la marca. Las
  matrices traen los textos pero no los links: el link sale del sitio viejo con la ruta que va a
  tener la pagina en el sitio nuevo, aunque todavia no exista (Drupal lo acepta). Si la pagina ya
  existe en content con otra ruta (los productos viven en `/productos/...`), va la que existe. Los
  items que sobran se DESACTIVAN, no se borran. Hoy el bloque dibuja UN solo nivel: los subitems
  quedan cargados pero no se ven, asi que ningun padre va sin link (toma el de su primer hijo).
  Origen: MX, homes de marca (Dog Chow tenia el menu de Brasil en portugues y Felix, Beneful y
  Gatina mostraban el de Dentalife).

## Lanzamiento

- **En el lanzamiento no hay registro / inicio de sesion (Pet ID).** Todo lo que dependa de eso
  se saca al traducir, avisando: la card Pet ID del carrusel de productos y la del Card Grid.
  Origen: MX, mapeo del carrusel de productos.
- **El buscador con IA SI va, en el hero de TODAS las homes de marca** (`show_search` del Banner,
  como el de Dog Chow). Antes se sacaba junto con Pet ID; el Websites Expert lo pidio en todas al
  revisar preprod. Origen: MX, homes de marca en preprod.
- **Los carruseles de productos van con productos de MUESTRA** de la misma marca de la pagina
  (`productosMuestra` del mapping, productos reales de content), tantos como tenia el bloque,
  porque los productos todavia no estan migrados. Se reemplazan cuando se migren. Las pestañas
  de filtro del sitio viejo no existen en el carrusel del CMS y se sacan. Origen: MX, idem.
- **El titulo de un bloque de pestañas va en un bloque de Texto justo antes.** El Tabs del CMS
  no tiene titulo (lo que se ve arriba es la etiqueta de cada pestaña). Origen: MX, idem.

## Cards

- **Bloque de 3 tarjetas con icono: el fondo deja libre la franja del titulo y el subtitulo.** En el
  sitio la imagen cubre TODO el panel y el texto va encima de su parte de arriba (desktop: hasta ~230px
  de los 1994 de alto; mobile: hasta ~390px de los 1600, porque el subtitulo ocupa mas lineas). Si el
  sujeto llega a esa franja, el subtitulo blanco se pone sobre la foto y no pasa el contraste. Se baja
  el contenido de la imagen dentro del mismo lienzo (franja transparente arriba, achicando lo justo),
  sin tocar la foto: es lo que ya hace la de Pro Plan. Origen: MX, home Dog Chow, pedido del usuario.

- **Homes de marca, largos que no se cortan** (medido en /dogchow publicada): en el carrusel de
  cards verticales la descripcion se corta con "…" a las 3 lineas (una de 102 caracteres se corto, una
  de 88 entra). Si el mercado manda mas, se acorta sin cambiar lo que dice. El mosaico SI respeta el
  Card - Background Color (cajas blancas en Dog Chow, como el Figma). (El largo del mosaico que decia
  aca estaba medido solo en desktop: ver la entrada de abajo.)
- **Mosaico: la descripcion va en 70 caracteres, porque en MOBILE se corta a 3 lineas.** En desktop
  entra todo; en el celular la caja tiene alto fijo y corta con "…". Medido probando textos dentro de
  la caja real: a 390px entran unos 84 caracteres y a 360px (Android chico) entre 65 y 79 segun como
  caigan las palabras. Le pasaba a Cat Chow, Dog Chow, Purina One y Fancy Feast. La guia esta en el hub
  (`CARD_MOSAIC_DESC_MAX`) y en el generador de homes. Origen: MX, homes de marca, el usuario vio el
  corte en Fancy Feast.
- **Las guias de largo se miden en MOBILE a 360px, no en desktop.** Las primeras (90 en el bloque de
  3 tarjetas, 128 en las apaisadas, 116 en el mosaico) salieron de mirar desktop o 390px, y a 360px
  (el Android chico) cortan antes: se rehicieron probando textos dentro de la caja real y quedaron en
  `CARD_DESC_MAX_BY_MODE` del hub (verticales 65, texto sobre foto 55, 3 tarjetas 70, cuadradas con
  icono 60, Icons 65, Numbers 120, mosaico 70, apaisadas 100). Origen: MX, barrido de cortes del lote.
- **Cuando el texto no entra, primero se cambia de card, no de texto.** Todo el Card Grid corta la
  descripcion a N lineas con "…" (medido en la caja real a 360/390/1440: Icons ~65, Numbers ~125,
  Mosaico ~70-85, carruseles ~60-107 segun el modo), salvo la **Simple**. Y hay dos paragraphs que no
  cortan nunca: **Cards Info** (icono + titulo + texto) y **Contact Card**. Si un texto se pasa por
  MUCHO (beneficios de producto, consejos con viñetas, pasos, datos de contacto, cifras), recortarlo
  es perder el mensaje: va a Cards Info si las cards no tienen imagen, o a la Simple si la tienen.
  Solo lo que se pasa por POCO se acorta (regla de abajo). Al pasar a Cards Info, la primera card se
  deja IGUAL a las demas (Color Background First Card = Card - Background Color, texto negro): el
  resaltado rojo por defecto es un enfasis que el original no tenia. Cards Info no tiene link por
  card: un bloque con botones no se convierte. Origen: MX, revision de cortes en mobile (174 cards del
  hub, Club Purina y las paginas de producto de Pro Plan).
- **Acortar un texto del mercado: solo con lo que el original ya dice.** Se sacan partes, no se
  agregan: ninguna palabra ni idea que el original no tenga (si no dice "gatito", no se escribe
  "gatito"), y se mantiene el tono (si tutea o invita a algo, sigue haciendolo). Con un claim de salud
  NUNCA se lo hace mas fuerte: "ayudan a mantener una piel sana" no pasa a "para una piel sana";
  antes que eso, se saca una parte. Cada version se prueba en la caja real a 360 y 390 y se elige la
  mas completa que entra. Origen: MX, mosaicos de las homes, pedido del usuario.
- **Despues de crear una pagina, se relee el Classy de cada bloque.** En Dog Chow el de dos Card Grid
  (tarjetas y mosaico) se perdio al guardar aunque el formulario lo mostraba puesto; se repuso con
  `aplicar`. Origen: MX, home Dog Chow.

- **Homes de marca: el bloque de 3 tarjetas con icono ("Image + 3 cards with icons") se arma como
  "Nutricion respaldada por ciencia" de /proplan**, que es el modelo: titulo y bajada centrados, la
  mascota recortada arriba sobre el degradé y las 3 tarjetas de alto fijo. La descripcion de cada
  tarjeta va en **90 caracteres como maximo**: el sitio la corta a 4 lineas y en mobile (tarjeta de
  286px) un texto de 102 ya queda cortado con "…" (le pasaba a Fancy Feast y a Dog Chow). Si el
  mercado manda mas, se acorta conservando lo que dice, sin inventar. Origen: MX, homes de marca, el
  usuario señalo /proplan como ejemplo; medido en content.

- **Homes de marca: el bloque "Cuidado integral" (carrusel de servicios) es el MISMO en todas las
  marcas**: un solo titulo, descripcion y cards, que se definen mas adelante. Hasta entonces van con
  texto placeholder. Lo unico que cambia por marca es la imagen de fondo. En el CMS es un Tabs
  "Full Background" con una pestaña cuya imagen es el fondo y un Card Grid "slider-card-icons-square"
  adentro. Origen: MX, homes de marca Ecosystem 2.0, pedido del usuario.

- **En una card el texto va DEBAJO de la imagen.** El `c_image` del CMS no tiene "imagen arriba, texto
  abajo" (Image Bottom deja el texto arriba), asi que una card armada con columnas va como DOS bloques
  en la misma columna: la Imagen sola (spacing 0) y debajo un Texto con titulo, cuerpo y boton (spacing
  16). Origen: MX, Alergenos del gato y Purina Cares ("el texto deberia estar abajo de las cards").
- **Dos Texto con imagen seguidos se alternan**: si uno tiene la imagen a la izquierda, el siguiente
  la lleva a la derecha. Origen: MX, Resultados visibles en 28 dias ("hay 2 text + images hacia el
  final y estan del mismo lado, siempre hay que alternar").
- **Pestañas sobre una marca de fondo oscuro o de color**: el Text Color de Classy del Tabs pinta las
  pestañas NO seleccionadas (sin cargar caen a #1f1f1f, que no se lee sobre el turquesa de Purina One
  ni el verde de Dog Chow). Va en Primary White. Origen: MX, Por que cambiar a Purina One ("hay poco
  contraste en el ultimo componente").

- **Cada pagina se carga con su marca en el campo Brand del nodo** (la del hub, `pages.brand`). No
  es un dato de clasificacion: es lo que le pone el fondo, el texto por defecto y los acentos a toda
  la pagina. Una marca que no esta en el desplegable FRENA la carga. Origen: MX, revision de los
  colores de Pro Plan en content.
- **Una card Simple sobre fondo oscuro tiene que verse como card.** Si la imagen es un objeto sobre
  negro, en la pagina negra la card desaparece y el bloque se ve demasiado pelado. Dos salidas: si el
  sitio viejo tenia la imagen con un marco propio (los banderines dorados de Pro Plan), se usa esa
  imagen original, recortada al cuadrado y con el fondo en negro puro para que no se note el borde; si
  no, se le carga el Card - Background Color de la marca (Brand 03 en Pro Plan, su gris oscuro), asi
  imagen y texto quedan dentro de una card. Origen: MX, La nutricion mas avanzada (banderines) y
  LiveClear (Brand 03).
- **En las paginas de Pro Plan, el titulo de las cards Simple va en Brand 01 (el dorado) y la
  descripcion en Primary White.** Los colores de la card no siguen a la marca: sin cargarlos, el
  titulo sale rojo y la descripcion negra sobre la pagina negra. Origen: MX, La nutricion mas
  avanzada y LiveClear.

- **El mosaico (`grid-cards`) es solo para 3 cards con 3 imagenes.** Con menos, carrusel de cards.
  Origen: MX, ronda 5 (Vet Diets, 2 cards).
- **Cada card con icono lleva un icono distinto y que diga algo de su contenido.** Nunca el mismo icono
  repetido en todas. Origen: MX, ronda 5 ("¿Por que es mejor la carne fresca?", cuatro checks).
  Se eligen MIRANDO el dibujo del sprite, no por el nombre: `apple` es el logo de Apple Inc., no una
  fruta, y `ai` es el glifo de la IA del sitio. Si el sitio viejo tenia un dibujo parecido (el perro
  para la flora intestinal en la linea Dog Chow), se respeta, y el mismo beneficio lleva el mismo icono
  en las paginas de la misma linea.
- **El titulo de un carrusel de cards va en el componente**, igual que en el de productos, no en un
  bloque de texto aparte. Y el texto de cada card va ADENTRO de la card (card vertical con el texto
  sobre la imagen), no debajo de la foto. Origen: MX, ronda 6 ("Hasta 1.8 años más de vida
  saludable": "se ve medio raro, creo que el componente no funciona asi").
- **Tres columnas con imagen + titulo + texto son un mosaico** (tres imagenes y tres cards), no un
  layout de columnas con Imagen y Texto sueltos. Origen: MX, ronda 6 ("Evalua la condicion corporal
  de tu mascota").
- **Una card cuya imagen es un objeto solo sobre fondo liso (un logo, un ingrediente, un sello) y
  que tiene el texto ENCIMA pasa a "Simple (image + title)"**: la imagen queda entera arriba y el
  texto debajo, asi que no hay nada que el texto pueda pisar en mobile, y se conserva lo que la
  imagen dice (el logo Opti, el salmon, el sello), que un icono generico del set pierde. Se usan las
  imagenes ORIGINALES sin tocar, tambien las mobile: el runner las recorta al cuadrado tomando el
  centro, que es donde esta el objeto. Si la pagina es de fondo oscuro (Pro Plan) se carga el Card -
  Text Color en Primary White, porque el default es negro. La descripcion se acorta a 100 sin
  cambiar el tono. Reemplaza al criterio anterior, que las pasaba a Card Icon Square: esa queda para
  cuando la imagen no aporta nada propio. Origen: MX, comparacion de las tres versiones en La
  nutricion mas avanzada (Opti / Carne fresca / Formulas respaldadas) y LiveClear (huevo y signo de
  pregunta, que en mobile habia que oscurecer para que se leyera).
- **La card con icono tiene alto fijo y corta la descripcion a tres lineas.** El limite real lo pone
  MOBILE: entran unos 70 caracteres (unos 90 en desktop), medido en el builder. Si hay que acortar,
  se conserva la esencia y el tono del original (la primera persona, el diferencial: "exclusiva",
  "carne real como primer ingrediente", "500 cientificos") y se mide antes de cargar. Un texto que no entra no
  se recorta: si son preguntas y respuestas va a un acordeon; si no, se reparten las mismas palabras
  entre titulo y descripcion para que entren.
- **Un texto metido en la foto de una card queda debajo de la descripcion**: se recorta la foto sin
  ese rotulo o la card pasa a columnas con Imagen (texto arriba, foto entera abajo).
- **Las cards verticales (texto arriba de una foto alta) pasan a "Simple (image + title)" cuando el
  sujeto de la foto funciona CUADRADO**: se recorta al sujeto (el hexagono de Hasta 1.8 años, el
  perro o gato con sus paquetes de Vet Diets) y se completa a cuadrado con el mismo fondo de la
  imagen, que es el de la pagina. Titulo y descripcion van debajo, con Card - Title/Text Color
  cargados porque los de la card no siguen a la marca (Primary White en Dog Chow; Brand 01 + Primary
  White en Pro Plan). Una card vertical sin imagen cargada se queda como esta. Origen: MX, revision
  de los colores de marca ("aca no es mejor usar las nuevas cards?", Hasta 1.8 años); reemplaza la
  regla anterior, que las dejaba verticales. Las home de marca siguen en pausa.
- **Si la card del sitio viejo tenia una imagen propia SIN texto adentro, se usa esa imagen, no un
  icono del set.** Ilustraciones (las doradas de LiveClear, los circulos de los 28 dias de Purina One),
  fotos numeradas (los 15 beneficios de Campeon), los platos de la transicion, /adopta: el icono generico pierde
  justo lo que la imagen decia. Van en "Simple (image + title)", completadas a cuadrado con fondo
  transparente (o del color de la pieza) y sin agrandarlas; si la imagen traia un rotulo que repite el
  titulo ("DIA #01") o una flecha de secuencia, se recorta. Si la imagen ES la card con el texto
  quemado (los cuadros de beneficios de Dog Chow, "Revisa / Guarda" de Calidad, los circulos rojos de
  Purina One), se queda el icono: el texto tiene que ser texto. Origen: MX, idem.
- **Un color de fondo que choca con el de la marca se cambia por un token de la MISMA marca.** El
  Primary Red de una banda va sobre la pagina blanca; sobre el verde de Dog Chow es rojo contra verde
  y se reemplaza por Brand 03 (verde oscuro #13482C, blanco encima 10:1). **El mosaico (grid-cards)
  NO se puede cambiar**: su caja es siempre Primary Red y el CMS ignora el Card - Background Color
  (medido en content con la primera pagina subida, Purina One con Brand 04 cargado: sale #E91C24).
  Si el rojo choca, la salida es otro modo de vista, no el color. Las cards Simple
  sobre el turquesa de Purina One van con Card BG Primary White y titulo Brand 04, asi se ven como
  card y la imagen (platos, packshots) no se pierde contra el turquesa. Origen: MX, idem (banda
  newsletter de Combinaciones de proteinas).

## CTAs y links

- **Si el copy invita a una accion, lleva CTA.** "Donde comprar", "Registrate", "Encuentra..." sin
  boton es un bloque que no lleva a ningun lado. El destino sale de `urlmap.json` (sitio viejo ->
  sitio nuevo). Origen: MX, ronda 5 (Donde comprar -> /donde-comprar).
  Un enunciado no es una invitacion: "Una manera para manejar las alergias" no pide boton, y menos a
  un producto que la pagina nunca nombra.
- **Un texto que manda a un boton que no existe ("Haga clic en COMPRAR AHORA") o a contactar sin
  camino se resuelve con un link dentro del texto** (`[texto](url)`), sin reescribir el copy.
- **La etiqueta del boton dice a donde lleva**, en tipo oracion: nada de "Aqui" ni "HAZ CLICK AQUI".
  En un boton suelto (banner, slide, bloque de texto o de imagen) nombra el destino ("Conoce Pro Plan®
  Perros", "Ver productos Dog Chow®") y el mismo destino lleva la misma etiqueta en todo el sitio. En
  la card de un carrusel alcanza "Ver más": el titulo de la card ya dice el tema.
- **Un boton o link sin destino conocido va con `#` y se anota como pendiente** (pagina, bloque,
  etiqueta), no frena la subida. El `#` es la marca buscable para completarlo despues con `aplicar`.
  Origen: MX, subida a content (botones de Adopta).
- **Todo carrusel de productos lleva su "Ver todos" con destino** (el listado de la marca; Campeón,
  que no tiene, al listado general). Sin URL el boton no lleva a ningun lado.
- **En un carrusel donde todas las cards llevan link, la que no lo tiene y tiene tema con pagina
  propia se linkea.** Cards que en el sitio viejo iban todas a la misma pagina (porque no existian las
  otras) van cada una a su tema.
- **Paginas gemelas (gatos/perros, FAQ de dos marcas) quedan iguales**: mismo icono, misma etiqueta,
  mismo destino para lo mismo.

## Pendientes de confirmar (decisiones tomadas por el que migra, sin respuesta todavia)

- Estirar el degrade oscuro que YA trae el key visual para correr el sujeto y dejarle lugar al texto
  (hero de Gran Comienzo, 84px). No es inventar imagen: es el mismo borde liso.
- Una banda cuya mitad era para texto HTML pasa a texto con imagen (la mitad con contenido recortada,
  el texto al lado), porque ningun componente pone texto oscuro sobre una imagen (banda "SIN
  colorantes" de Gran Comienzo).
- Etiqueta del CTA de Donde comprar: "Buscar veterinaria".
- Titulos de carrusel: cuando el bloque de texto traia bajada, se une al titulo si agrega un beneficio
  (Longevidad, Snacks, Purina One gatos) y se saca si repite el titulo o es un slogan (Pro Plan
  "Alimento humedo", Gran Comienzo, Purina One perros). Titulos en mayusculas del sitio viejo pasan a
  minuscula como el resto ("OPTI TECNOLOGIAS PARA PERROS" -> "Opti Tecnologias para perros").

## Preguntas abiertas (no se aplican hasta que el usuario responda; se le muestran en imagen)

(ninguna por ahora)
