-- "Lo que debes saber antes de adoptar" — Paso 1: las OCHO cards del sitio, en orden.
-- Ya aplicado. Respaldo previo: page_components_backup_adoptar_paso1.
--
-- En la app estaban cargadas solo tres (Edad, Presupuesto, Tiempo). En el sitio el
-- carrusel tiene ocho y muestra tres por vista, con tres puntos: 1-3, 4-6 y 6-8 (la
-- ultima vista se corre para atras para llenarse, por eso "Tiempo" aparece dos veces
-- en las capturas — es la MISMA card, no una repetida).
--
-- Las ILUSTRACIONES no se cargan: las pone el mercado. La celda de la imagen baja en
-- amarillo en el Excel, que es justamente para eso.

create table if not exists page_components_backup_adoptar_paso1 as
select id, page_id, component_key, content, parent_id, tab_index, sort_order, now() as backed_up_at
from page_components where id = '34d97601-f0dc-4d46-a0cf-24c6b2ededa9';

update page_components
set content = content || jsonb_build_object('items', jsonb_build_array(
  jsonb_build_object('title', '¿Gato o perro?',
    'description', 'Los gatos son independientes y mimosos, los perros juguetones y traviesos.'),
  jsonb_build_object('title', 'Tamaño',
    'description', 'Considera el espacio de tu hogar para elegir el tamaño de tu mascota.'),
  jsonb_build_object('title', 'Tipo de pelo',
    'description', 'Hay pelajes que requieren más cuidados que otros.'),
  jsonb_build_object('title', 'Edad',
    'description', 'Una mascota menos de un año necesita atenciones distintas a las de un adulto.'),
  jsonb_build_object('title', 'Presupuesto',
    'description', 'Calcula los gastos de alimento, vacunas y productos de higiene antes de adoptar.'),
  jsonb_build_object('title', 'Tiempo',
    'description', 'Una mascota necesita que le dediques tiempo para jugar y cuidarla.'),
  jsonb_build_object('title', 'Personalidad',
    'description', 'Tú y tu nuevo mejor amigo deben tener las personalidades compatibles.'),
  jsonb_build_object('title', 'Estilo de vida',
    'description', 'Busca una mascota que armonice con tu rutina y actividades diarias.')
))
where id = '34d97601-f0dc-4d46-a0cf-24c6b2ededa9';
