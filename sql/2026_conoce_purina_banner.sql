-- La imagen del banner de Conoce Purina, que faltaba.
--
-- POR QUE FALTABA. En el sitio viejo el hero no es un <img>: es un `background-image`
-- dentro de un <style> en linea, con la de mobile en la regla de afuera y la de desktop
-- adentro de un `@media (min-width: 769px)`. La pagina se leyo antes de que el extractor
-- supiera leer eso, asi que el bloque quedo sin Media y el outlier quedo anotado en las
-- notas. El extractor ya lo hace (hay un test que lo cubre), pero esta pagina ya estaba
-- cargada: se parchea en vez de volver a correr la cadena entera.
--
-- Se guardan los ARCHIVOS ORIGINALES, no los derivados `styles/webp/...?itok=...` que
-- sirve la pagina: el itok es un token de Drupal que puede caducar, y el derivado ya
-- viene reprocesado. Del original se recorta mejor.
--
-- OJO CON LA MEDIDA. La de desktop es de 1920×540 y el Secondary Hero pide 2100×700: NO
-- alcanza. El recortador la va a marcar ESTIRADA y hay que pedirla de nuevo — agrandarla
-- se ve mal. La de mobile sobra (800×1200 para 526×526, eso es un recorte).

update public.page_components
   set content = content || jsonb_build_object(
         'image',        'https://purina.com.mx/sites/default/files/2022-11/Banner_Best_Life_desktop.jpg',
         'image_mobile', 'https://purina.com.mx/sites/default/files/2022-11/Banner_Best_Life_mobile.jpg')
 where component_key = 'banner'
   and page_id = (select id from public.pages
                   where path = '/conoce-purina' and market = 'MX');

-- Y el outlier deja de decir que la imagen no la tenemos, porque ya la tenemos. Lo que
-- queda anotado es lo que sigue siendo cierto: que la de desktop no da la medida.
update public.pages
   set notes = replace(
         notes,
         E'\n· FALTA LA IMAGEN DEL BANNER y no la tenemos. En el sitio viejo no es un <img>: es un background-image dentro de un <style> en linea, y esta pagina se leyo antes de que el extractor supiera leer eso. Hay que volver a leerla (tools/extraer.mjs ya lo hace) o sacarla a mano del sitio.',
         E'\n· La imagen del banner sale del sitio viejo: Banner_Best_Life_desktop.jpg (1920×540) y Banner_Best_Life_mobile.jpg (800×1200). No es un <img>, es un background-image dentro de un <style> en linea; por eso no salio en la primera lectura.'
         || E'\n· LA DE DESKTOP NO ALCANZA: el Secondary Hero pide 2100×700 y la que hay es de 1920×540. Se sube ESTIRADA. Hay que pedirla de nuevo o re-cortarla mas grande; la de mobile si alcanza.')
 where path = '/conoce-purina' and market = 'MX';
