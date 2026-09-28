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
- El runner deja todo en borrador; nunca publica. Las paginas editadas a mano en el Hub no se pisan.

## Alcance

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

## Heroes y banners

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
- **Hero de fondo claro y SIN letras metidas: texto a la izquierda y la foto al lado** (texto con
  imagen, la foto recortada al contenido), que es como estaba en el sitio viejo. Con el titulo del
  banner (blanco) no se lee, y con la imagen entera abajo queda media imagen vacia. Origen: MX,
  ronda 5 (Vet Diets, Ingredientes).
- **Si el usuario ya decidio un hero, no se revierte por una regla general nueva.** Pro Plan Gatos y
  Perros quedan como Imagen con el banner viejo (su decision de la ronda 4), aunque borrando el slogan
  del key visual el titulo entraria en la franja.

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
- **Una pagina de preguntas sobre un producto cierra con el carrusel de ese producto**, para seguir
  guiando al usuario. Origen: MX, ronda 5 (FAQ de LiveClear).

## Cards

- **El mosaico (`grid-cards`) es solo para 3 cards con 3 imagenes.** Con menos, carrusel de cards.
  Origen: MX, ronda 5 (Vet Diets, 2 cards).
- **Cada card con icono lleva un icono distinto y que diga algo de su contenido.** Nunca el mismo icono
  repetido en todas. Origen: MX, ronda 5 ("¿Por que es mejor la carne fresca?", cuatro checks).

## CTAs y links

- **Si el copy invita a una accion, lleva CTA.** "Donde comprar", "Registrate", "Encuentra..." sin
  boton es un bloque que no lleva a ningun lado. El destino sale de `urlmap.json` (sitio viejo ->
  sitio nuevo). Origen: MX, ronda 5 (Donde comprar -> /donde-comprar).
  Un enunciado no es una invitacion: "Una manera para manejar las alergias" no pide boton, y menos a
  un producto que la pagina nunca nombra.
- **Un texto que manda a un boton que no existe ("Haga clic en COMPRAR AHORA") o a contactar sin
  camino se resuelve con un link dentro del texto** (`[texto](url)`), sin reescribir el copy.
- **La etiqueta del boton dice a donde lleva**, en tipo oracion: nada de "Aqui" ni "HAZ CLICK AQUI".
- **En un carrusel donde todas las cards llevan link, la que no lo tiene y tiene tema con pagina
  propia se linkea.** Cards que en el sitio viejo iban todas a la misma pagina (porque no existian las
  otras) van cada una a su tema.
- **Paginas gemelas (gatos/perros, FAQ de dos marcas) quedan iguales**: mismo icono, misma etiqueta,
  mismo destino para lo mismo.

## Pendientes de confirmar (decisiones tomadas por el que migra, sin respuesta todavia)

- Titulos partidos para que el texto no tape al sujeto (Donde comprar: "Donde comprar" + el resto a
  la bajada; Gran Comienzo: "Dog Chow® Gran Comienzo®" + "Croquetas para cachorros." a la bajada).
- Estirar el degrade oscuro que YA trae el key visual para correr el sujeto y dejarle lugar al texto
  (hero de Gran Comienzo, 84px). No es inventar imagen: es el mismo borde liso.
- Una banda cuya mitad era para texto HTML pasa a texto con imagen (la mitad con contenido recortada,
  el texto al lado), porque ningun componente pone texto oscuro sobre una imagen (banda "SIN
  colorantes" de Gran Comienzo).
- Etiqueta del CTA de Donde comprar: "Buscar veterinaria".
- Hero de Nutricion Reforzada con el texto en el banner, debajo del logo del key visual (el titulo
  repite el logo, igual que en Gran Comienzo).

## Preguntas abiertas (no se aplican hasta que el usuario responda)

- Curvas de transicion pensadas para empalmar con la seccion de abajo del sitio viejo (la V blanca
  al pie del hero de LiveClear sobre la pagina oscura de Pro Plan, y las curvas de Cat Chow y Dog
  Chow FAQ): ¿se recortan o son parte del estilo?
- Foto del Dr. Satyaraj en Alergenos del gato: en texto con imagen ocupa media pantalla (en el
  sitio viejo era un avatar de ~150px). ¿Columna chica (layout 25/75) o se deja?
- Titulos de carrusel: cuando el bloque de texto traia bajada, se une al titulo si agrega un beneficio
  (Longevidad, Snacks, Purina One gatos) y se saca si repite el titulo o es un slogan (Pro Plan
  "Alimento humedo", Gran Comienzo, Purina One perros). Titulos en mayusculas del sitio viejo pasan a
  minuscula como el resto ("OPTI TECNOLOGIAS PARA PERROS" -> "Opti Tecnologias para perros").
