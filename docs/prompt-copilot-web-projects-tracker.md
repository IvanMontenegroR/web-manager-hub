# Prompt para Copilot Claude - Evaluacion de herramientas para el "Web Projects Tracker"

> Copiar todo lo que sigue (desde "CONTEXTO") y pegarlo como un unico mensaje.

---

## CONTEXTO

Soy el Websites Expert de Nestle Purina LATAM. Gestiono los proyectos web (landings,
migraciones, rollouts de marca) que ejecutan 5 agencias partner externas en 12 mercados
de la region. Hoy llevo ese seguimiento en una herramienta que ya existe y funciona, y
quiero evaluar si tiene sentido reconstruirla dentro del entorno tecnologico aprobado de
Nestle.

**Todavia NO quiero que escribas codigo.** Lo que necesito primero es una **evaluacion de
herramientas**: con que se puede construir esto dentro de lo que Nestle tiene disponible y
aprobado, que opciones hay, que se gana y que se pierde con cada una, y donde estan los
riesgos reales. Al final del documento te digo exactamente que entregable espero.

Te describo el modulo completo con el nivel de detalle necesario para que la evaluacion
sea seria, porque el diablo esta en dos o tres reglas de negocio que parecen menores y son
las que suelen romper una implementacion low-code.

---

## 1. QUIEN LO USA

- **Un solo usuario que escribe: yo.** No hay multiusuario, ni roles, ni aprobaciones, ni
  workflow de estados entre personas.
- **Consumidores de solo lectura:** las agencias y los stakeholders de mercado NO entran a
  la herramienta. Reciben un **Excel exportado**. Esto es central: el Excel no es un extra,
  es el canal de comunicacion oficial del cronograma hacia afuera.
- Uso diario, de escritorio, en oficina y en reuniones. No hay caso de uso mobile.

## 2. QUE HACE (resumen en una frase)

Un cronograma tipo Gantt multiproyecto, medido en **dias habiles por pais**, que detecta
automaticamente atrasos imputables a cada agencia, solapamientos de una misma agencia entre
proyectos distintos, y proyecta el arrastre de las demoras por dependencias, y que exporta
todo eso a un Excel formateado que se manda a las agencias y a los mercados.

## 3. VOLUMEN REAL (hoy)

Es deliberadamente chico. La complejidad esta en las reglas, no en la escala.

| Entidad | Registros |
|---|---|
| Proyectos | 10 (8 activos, 2 archivados) |
| Tareas | 113 |
| Tareas con dependencias declaradas | 94 |
| Partners (agencias + equipos internos) | 7 |
| Feriados cargados | 236, sobre 19 calendarios de pais |
| Mercados distintos en uso | 6 (el diseno soporta 19 calendarios) |
| Definiciones de SLA | 5 |

Crecimiento esperado: decenas de proyectos por ano, cientos de tareas. Nunca miles de
usuarios ni millones de filas.

---

## 4. MODELO DE DATOS

Seis entidades. Los tipos son orientativos.

### `partners` - las agencias y los equipos internos
`id`, `name`, `color` (hex, se usa para pintar el Gantt y el Excel), `country`
(codigo de calendario de feriados; puede ser nulo).

Detalle que importa: el equipo interno esta partido en **dos partners distintos** que
resuelven su calendario de feriados de forma diferente:
- **"Purina Mercado"**: usa el pais del proyecto.
- **"Purina Region"**: usa un pais de calendario que se elige **por proyecto**, con
  fallback al pais del proyecto si no se cargo.

O sea: **el calendario laboral de una tarea no depende solo del partner, sino del par
(partner, proyecto)**. Cualquier herramienta que asuma "un calendario por recurso" no
alcanza.

### `projects`
`id`, `name`, `brand`, `market` (codigo de pais - define el calendario por defecto),
`region_country` (calendario opcional para las tareas de Purina Region),
`start_date`, `market_launch` (fecha objetivo de salida, opcional, se dibuja como deadline),
`status`, `archived` (bool - los archivados salen del cronograma activo y de todos los
calculos, y se ven aparte).

### `tasks`
`id`, `project_id`, `partner_id`, `action_name`, `planned_start`, `planned_days`,
`actual_start`, `actual_end`, `status` (Pendiente | En curso | Completado), `delay_reason`,
`excluded_holidays` (array de fechas), `depends_on` (array de ids de tareas predecesoras,
relacion finish-to-start), `is_meeting` (bool), `is_extra` (bool), `sort_order`.

Notar: `planned_days` es una **duracion en dias habiles**, no un rango de fechas. La fecha
de fin planificada se **calcula**, nunca se guarda. Ver regla R1.

### `holidays`
`id`, `country`, `date`, `name`. Unico por (country, date). Un feriado nacional por pais,
mas calendarios subnacionales cuando hacen falta (por ejemplo Brasil nacional vs Brasil -
Sao Paulo, que son dos calendarios distintos).

### `sla_definitions`
`id`, `action_name`, `sla_days`. Autocompleta la duracion cuando creo una tarea con ese
nombre. Es una tabla de referencia, no participa de ningun calculo.

### `project_launches`
`id`, `project_id`, `market`, `launch_date`, `precision` (day | month | quarter | tbd).
Un mismo proyecto puede salir en varios mercados en fechas distintas, y algunas de esas
fechas todavia no estan confirmadas. Se muestran en un widget de proximos lanzamientos.

---

## 5. REGLAS DE NEGOCIO

Estas son las que hay que respetar si o si. Son la razon de existir de la herramienta.

### R1 - Todo se cuenta en dias habiles, y "habil" depende del pais
Un dia es habil si no es sabado, no es domingo y no es feriado **del calendario que le toca
a esa tarea**. Toda duracion, todo atraso y todo solapamiento se mide en dias habiles.

Calculo del fin planificado: `planned_end` = el `planned_days`-esimo dia habil contando
desde `planned_start` inclusive. Si `planned_start` cae en dia no habil, ese dia no cuenta.

Dos consecuencias que suelen sorprender:
- La misma duracion (5 dias) da fechas de fin distintas para dos agencias que arrancan el
  mismo dia, porque tienen calendarios de feriados distintos.
- **Una tarea puede excluir feriados puntuales** (`excluded_holidays`): por ejemplo, es
  feriado en Mexico pero hay un aprobador de backup en otro pais, asi que ese feriado no
  frena esa tarea especifica. El calendario efectivo de una tarea es
  `feriados del pais MENOS los excluidos en esa tarea`.

### R2 - Atraso
Una tarea esta atrasada si cerro despues de su fin comprometido (`actual_end` posterior)
**o** si sigue abierta y su fin comprometido ya paso (se mide contra hoy). Los dos casos son
el mismo "atraso" y se muestran igual.

**Restriccion clave de imputabilidad:** una tarea que todavia **no arranco** nunca cuenta
como atraso propio, aunque su fecha haya pasado. Si no arranco es porque la predecesora
viene demorada, y esa demora es heredada, no es culpa de esta agencia. Se ve en el forecast,
no en rojo.

El atraso se mide contra el **plan efectivo**, no contra el plan original: el `planned_days`
corrido al arranque real. Asi una agencia que empezo tarde por culpa ajena solo se pinta en
rojo si se pasa de SUS dias habiles contados desde que realmente pudo empezar. **Cada
agencia se mide solo por lo que controla.** Esta regla es la que hace que la herramienta se
pueda mostrar en una reunion con las agencias sin discutir.

La razon del atraso es **obligatoria** en el formulario cuando la tarea cierra tarde.

### R3 - Adelanto
Espejo exacto del atraso: si cerro antes de su fin comprometido, los dias ahorrados se
marcan en verde. Solo cuenta con entrega real, nunca por proyeccion.

### R4 - Proyeccion / forecast (no destructiva)
El plan original (`planned_start`, `planned_days`) **nunca se modifica**. Aparte, se calcula
para cada tarea donde caeria realmente segun el avance de sus predecesoras:

- Si la tarea ya arranco, su inicio real es un hecho.
- Si no arranco y la predecesora que manda termina despues del plan, la tarea se **empuja**
  al dia habil siguiente.
- Si la predecesora **ya cerro de verdad** antes de lo previsto, la tarea se **adelanta**.
  Sin entrega real no se adelanta nunca: se mantiene el peor caso.
- Una tarea abierta y vencida empuja a las siguientes **desde hoy**, no desde su fin
  planificado.
- Hay que guardar quien es la predecesora culpable del empuje, para poder mostrarlo
  (accountability).
- La resolucion es **entre proyectos**, no solo dentro de uno: un rollout regional tiene
  dependencias cruzadas entre proyectos distintos.
- Tiene que haber guarda anti-ciclos.

En pantalla: la barra solida es la realidad/proyeccion, y el plan original se dibuja como
un contorno hueco ("fantasma") solo cuando la realidad se corrio.

### R5 - Solapamiento de agencia
Conflicto = **mismo partner**, **proyectos distintos**, y la interseccion de sus rangos
reales/proyectados contiene **al menos un dia habil** (si solo se pisan en un fin de semana
o feriado, no es conflicto). Las tareas de tipo GO-LIVE son hitos de un dia y se excluyen
del detector.

Sirve para negociar: "esta agencia no puede tomar este proyecto en esta ventana porque ya
esta comprometida en el otro".

### R6 - Vueltas extra fuera del plan
Cuando aparece trabajo que no estaba previsto (tipicamente una ronda adicional de feedback),
**nunca se reabre la tarea ya cerrada ni se estira su ventana**. Se agregan tareas nuevas
marcadas como extra, y la siguiente del plan pasa a depender de ellas, asi el forecast empuja
el resto del proyecto y se ve cuanto se corrio.

La convencion de imputacion:
- La tarea de **quien pidio la vuelta** nace con duracion 1 dia. Todo lo que consuma por
  encima cae como atraso rojo imputado a esa parte.
- La tarea de **quien ejecuta el ajuste** nace con el SLA normal de esa agencia para una
  ronda de ajustes. Si entra en SLA no se pinta rojo - el ajuste es consecuencia del
  feedback, no culpa suya - pero si se pasa, ese exceso si es suyo.

Visualmente son **dos colores con dos significados que no se pisan**:
- **ambar** = esto no estaba en el plan (corre el proyecto, sea de quien sea la culpa)
- **rojo rayado** = se paso de su SLA (imputable a la agencia)

Una tarea extra que ademas se pasa muestra las dos cosas.

---

## 6. LA PANTALLA

Una sola vista, densa, de escritorio. En orden vertical:

1. **Barra superior** con: recargar, ocultar dias pasados, zoom dia/semana, mostrar u ocultar
   los fantasmas del plan original, exportar, un menu de administracion (partners, feriados)
   y crear proyecto. Todas las preferencias de vista se recuerdan entre sesiones.

2. **Widget de proximos lanzamientos** por mercado, con fechas de precision variable
   (dia exacto, mes, trimestre o por confirmar).

3. **Referencias / leyenda** de los colores y marcas.

4. **El Gantt**, que es el corazon:
   - Filas agrupadas por proyecto, tareas ordenables manualmente dentro del proyecto.
   - Eje horizontal por dia (columna angosta) o por semana (columna muy angosta, solo se
     rotulan los lunes).
   - Barra por tarea, coloreada por estado, con un punto del color de la agencia.
   - Extension rayada roja desde el fin del plan hasta el fin real/hoy cuando hay atraso, con
     los dias habiles de exceso.
   - Extension verde cuando hubo adelanto.
   - Contorno hueco del plan original cuando la realidad se corrio (toggle).
   - Fines de semana y feriados pintados **por encima** de las barras, para que se vea que la
     barra atraviesa dias no laborales. Al pasar el mouse por un feriado, tooltip con nombre
     del feriado, calendario de que pais y fecha.
   - Linea vertical del dia de hoy.
   - Marca del deadline de lanzamiento del mercado.
   - Iconos por tarea: reunion, tarea extra.
   - Tooltip por barra con plan, real y la predecesora que la empujo.
   - Acciones inline: editar/borrar/archivar proyecto, agregar/editar/borrar/reordenar tarea,
     exportar ese proyecto, ocultar el proyecto de la vista (distinto de archivar: ocultar es
     una preferencia local, archivar es persistente).
   - Los proyectos archivados van en un acordeon aparte al final, con su propio Gantt.

5. **Panel "Control del dia"** - el foco operativo. Clasifica las tareas activas contra hoy,
   en dias habiles, usando **solo fechas comprometidas y reales, nunca el forecast**:
   - vencidas y abiertas (arrancaron, se les paso el plan, siguen abiertas) - bloque urgente
   - vencen hoy
   - vencen en los proximos 1 a 3 dias habiles
   - cerradas en los ultimos 0 a 3 dias habiles, con marca de a tiempo o tarde

   El motivo de no usar el forecast aca: una tarea que se corrio para adelante porque su
   predecesora viene demorada no es un pendiente mio de hoy, y si apareciera todos los dias
   el panel se volveria ruido.

6. **Panel de retrasos** con la lista de atrasos y sus razones.

---

## 7. LA EXPORTACION A EXCEL

Es el entregable hacia las agencias y los mercados, y es la parte que menos se puede
degradar. **No es un volcado de la tabla: es un Gantt dibujado dentro de la grilla de Excel**,
una columna por dia.

Elijo que proyectos exportar. Sale un archivo con:

### Una hoja por proyecto
- Fila 1: banda negra con el **logo de Purina** embebido, respetando su proporcion.
- Fila 2: nombre del proyecto y la fecha de GO-LIVE resaltada en verde.
- Fila 3: encabezados - TASK / ASSIGNED TO / STATUS / DIAS - sobre banda roja de marca.
- Columnas de dia agrupadas por bandas de mes fusionadas, con numero de dia y dia de semana.
- Paneles congelados en las cuatro primeras columnas y las tres primeras filas.
- Ancho de columna distinto en modo dia y en modo semana.
- Cada tarea es una fila; su barra se dibuja **rellenando las celdas de sus dias** con el
  color de su estado, o ambar si es una tarea fuera del plan.
- **Rellenos de trama, no solo colores planos:** diagonal descendente para fines de semana y
  feriados, diagonal ascendente roja para el tramo de atraso, diagonal ascendente verde para
  el adelanto.
- Marcas de texto dentro de la celda: X para atraso, F para no laborable, el emoji de reunion,
  un simbolo de suma para tarea extra.
- Bordes verticales gruesos para la linea de GO-LIVE (verde) y la linea de hoy (violeta).
- Columna DIAS que muestra la duracion y, entre parentesis, el atraso o el adelanto.
- Al pie, un bloque **REFERENCIAS** con: leyenda de colores y marcas, la lista completa de
  **feriados** que afectaron el proyecto (fecha, nombre y pais), la lista de **retrasos** con
  su motivo, un bloque de **vueltas extra** que suma cuantos dias habiles perdio el proyecto
  en trabajo no planificado, y la fecha de **go-live original** segun el plan.

  Un detalle fino de ese total: **no es la suma de los dias de cada tarea extra, es la union
  de sus dias habiles**, para no contar dos veces el dia en que una cierra y arranca la
  siguiente.

### Una hoja "Timeline unificado" (cuando exporto 2 o mas proyectos)
Todos los proyectos y todas sus tareas sobre un eje comun. Aca las barras se pintan **por
agencia**, no por estado, porque la pregunta que responde esa hoja es "quien esta haciendo
que y cuando". Al pie, la lista completa de solapamientos de agencia detectados.

### Requisitos tecnicos de la exportacion
Necesita, como minimo: celdas fusionadas, rellenos de patron ademas de solidos, bordes por
lado con color y grosor, texto enriquecido dentro de una celda (varios formatos en la misma
celda), imagenes embebidas, ancho de columna y alto de fila por unidad, paneles congelados,
y nombres de hoja saneados. **Si la herramienta candidata no puede producir todo esto, hay
que decirlo explicitamente y decir que se pierde.**

---

## 8. REQUISITOS NO FUNCIONALES

- **Datos:** son de proyectos y proveedores. No hay datos personales de consumidores, ni
  datos de pago, ni nada regulado. Si hay nombres y contactos de personas de agencias y de
  mercado.
- **Autenticacion:** hoy no tiene. Deberia usar el inicio de sesion corporativo.
- **Disponibilidad:** no es critica. Si se cae un dia, no pasa nada.
- **Integraciones:** ninguna obligatoria hoy. Seria deseable a futuro poder mandar mails de
  status y notificaciones.
- **Offline:** no hace falta.
- **Impresion:** no hace falta - para eso esta el Excel.
- **Idioma:** interfaz en castellano. El Excel que va a las agencias mezcla castellano e
  ingles segun la convencion ya existente.

## 9. LO QUE NO ES

Para acotar el alcance y evitar que la evaluacion derive:

- No es un gestor de tareas de equipo ni un sustituto de una herramienta de gestion de
  proyectos corporativa. No hay asignacion a personas, ni horas, ni costos, ni capacidad, ni
  facturacion.
- No hay portal para las agencias. Ellas no entran: reciben el Excel.
- No hay workflow de aprobaciones.
- No es un reporte de BI: es una herramienta de captura y control operativo diario, que
  ademas produce un documento.

---

## 10. LO QUE TE PIDO

No escribas codigo todavia. Devolveme:

1. **Que herramientas del stack aprobado de Nestle podrian construir esto.** Considera
   explicitamente las opciones que existan en el entorno (por ejemplo la Power Platform con
   Power Apps y Dataverse o listas de SharePoint, una app web propia en Azure, Power BI,
   soluciones basadas en Excel u Office Scripts, o una herramienta de gestion de proyectos ya
   licenciada). Si alguna de estas no esta disponible o no esta aprobada para este caso,
   decimelo, que es justamente lo que necesito saber.

2. **Para cada opcion, un veredicto por capacidad**, no una descripcion general. En
   particular decime si puede o no puede, y con cuanto esfuerzo:
   - calcular dias habiles con **multiples calendarios de feriados simultaneos** y con
     exclusiones por tarea (R1)
   - resolver la **proyeccion por dependencias entre proyectos** con arrastre y anti-ciclos
     (R4)
   - hacer la **deteccion de solapamientos por pares** sobre rangos proyectados (R5)
   - renderizar un **Gantt denso con zoom por dia y por semana, superposicion de barras,
     tramas y tooltips** (seccion 6)
   - generar el **Excel formateado de la seccion 7** con tramas, imagen embebida, celdas
     fusionadas, bordes por lado y texto enriquecido

   Marcame claramente cuales de estas cinco son el punto de quiebre de cada opcion. Mi
   sospecha es que la matematica de dias habiles multipais, la proyeccion y el Excel son las
   tres que hunden a las opciones low-code, pero quiero tu lectura, no la mia confirmada.

3. **Una recomendacion, con la segunda opcion y por que quedo segunda.** Prefiero una
   recomendacion clara con sus riesgos a un cuadro comparativo neutro.

4. **Que se pierde** con la opcion recomendada respecto de lo descrito aca. Prefiero saberlo
   ahora.

5. **Riesgos de gobierno y de TI:** aprobaciones que haria falta pedir, donde quedarian
   alojados los datos, que pasa con el mantenimiento si yo no estoy, y si algo de esto
   choca con las politicas internas.

6. **Las preguntas que te falten para dar una respuesta firme.** No asumas: preguntame.

Si algo de lo que describi te parece mal planteado desde el arranque, decimelo antes de
evaluar herramientas.
