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

## Alcance

- **Las paginas que ya existen en content y estan bien, quedan como estan**: no se suben ni se
  reemplazan. Hoy son /conoce-purina, /adopta/como-apoyamos-refugios y /adopta/tenencia-responsable.
  Origen: MX, subida a content.

- **Las paginas de linea de Pro Plan (debajo de /proplan/gatos y /proplan/perros) quedan en pausa**:
  la idea es linkear directo a los productos. Origen: MX, ronda 3.
- **Club Purina se arma a mano.** El borrador automatico queda solo como referencia. Origen: MX, ronda 2.

## Imagenes

- **La medida es la del catalogo del Hub**, siempre (`src/data/components.js`, `specs`/`specsByType`).
  Son las medidas reales del CMS. Origen: MX, ronda 3.
- **No se generan imagenes nuevas: se modifican y redimensionan las que ya existen.** Nada de IA
  generativa para crear contenido. Origen: MX, ronda 1.
- **Nunca texto sobre texto**: si la imagen trae letras metidas y el componente dibuja su titulo
  encima, hay que resolverlo (limpiar la imagen o cambiar de componente). Origen: MX, ronda 3.
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

- **Si el titulo cruza al sujeto o al producto, se parte**: el h1 queda con lo que dice de que es la
  pagina y el resto pasa a la bajada, sin reescribir ("Donde comprar" + "Encuentra tu veterinaria mas
  cercana...", "Resultados visibles en 28 dias" + "Purina® One® para perros."). El corte cae en un
  limite natural de la frase. Origen: MX, ronda 5, confirmado por el usuario.
- **El h1 va siempre como texto real, aunque el key visual ya diga lo mismo.** El h1 es lo que
  estructura la pagina (buscadores, lectores de pantalla); las letras de una imagen no cuentan, salvo
  por su alt. Que se repita a la vista no es un problema. Origen: MX, ronda 5 (Nutricion Reforzada,
  Gran Comienzo), confirmado por el usuario.

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
- **Si el usuario ya decidio un hero, no se revierte por una regla general nueva.** Pro Plan Gatos y
  Perros quedan como Imagen con el banner viejo (su decision de la ronda 4), aunque borrando el slogan
  del key visual el titulo entraria en la franja.

## Textos

- **Nada de mayusculas sostenidas.** Todo lo que en el sitio viejo venia en ALL CAPS (titulos, bajadas,
  nombres de producto en el cuerpo) pasa a tipo oracion; las marcas quedan con su mayuscula inicial
  ("PRO PLAN® VETERINARY DIETS" -> "Pro Plan® Veterinary Diets") y las siglas quedan como siglas (DHA,
  EPA, ADN). Si hace falta enfasis, es la tipografia del componente la que lo da. Origen: MX, ronda 6
  ("LA SALUD DE LOS GATOS Y PERROS": "todo lo que este en all caps podes poner bien").

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
  personalizadas para productos. Origen: MX, ronda 4.
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

## Cards

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
- **Una card cuya imagen es en realidad un icono (un logo, un ingrediente o un sello sobre fondo
  liso) pasa a card con icono (Card Icon Square)**, con un icono del set que diga lo mismo. Se ve
  igual en desktop y mobile y no hay imagen que el texto pueda pisar. Se pierde el logo o el sello
  como imagen: se acepta si el nombre ya esta en el titulo o el sello aparece en otro bloque de la
  pagina. Origen: MX, revision mobile (Opti Tecnologias / Carne fresca / Formulas respaldadas en La
  nutricion mas avanzada -> `genetics`, `beef`, `stethoscope`).
- **La card con icono tiene alto fijo y corta la descripcion a tres lineas.** El limite real lo pone
  MOBILE: entran unos 70 caracteres (unos 90 en desktop), medido en el builder. Si hay que acortar,
  se conserva la esencia y el tono del original (la primera persona, el diferencial: "exclusiva",
  "carne real como primer ingrediente", "500 cientificos") y se mide antes de cargar. Un texto que no entra no
  se recorta: si son preguntas y respuestas va a un acordeon; si no, se reparten las mismas palabras
  entre titulo y descripcion para que entren.
- **Un texto metido en la foto de una card queda debajo de la descripcion**: se recorta la foto sin
  ese rotulo o la card pasa a columnas con Imagen (texto arriba, foto entera abajo).

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
