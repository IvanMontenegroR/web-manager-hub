-- Las cards apaisadas de Tenencia Responsable: el modo de vista correcto es
-- "Slider Cards Default" con el Card - Style Card en "Card Grid Default Square".
-- Ya aplicado.
--
-- Estaban en "Slider Background Cards Default", que es OTRA cosa: ese modo pone el
-- texto SOBRE la imagen, que hace de fondo de la card. Las de esta pagina no tienen
-- fondo — la imagen va arriba y el titulo con el texto abajo, sobre blanco.
--
-- CORRECCION (posterior): esa ultima frase esta MAL. Se escribio leyendo el formulario
-- del CMS y no mirando la pagina. En produccion la card apaisada tiene la imagen de
-- FONDO y el texto ENCIMA — el titulo arriba y la descripcion abajo, los dos en blanco.
-- El cambio de modo de vista que hace este archivo sigue siendo correcto; lo que estaba
-- mal era la descripcion de como se ve. El mockup ya la dibuja asi.
--
-- Lo que aprendimos y quedo mal modelado hasta ahora: la FORMA de las cards no sale
-- del modo de vista, sale del **Card - Style Card** (Square = apaisada, Vertical =
-- vertical). `slider-default-card` dibuja las dos cosas segun ese estilo.
update public.page_components
set content = (content - 'view_mode')
  || jsonb_build_object('view_mode', 'slider-default-card',
                        'card_style_card', 'card_grid_default_square')
where page_id = '45cad0b0-1a03-4058-a23f-1535ccc5de71'
  and component_key = 'card_grid';
