# Los Perrines · notas para Claude

Tienda online de fundas tipo canasto para mascotas (asiento trasero del auto), hecha en San Luis.
Dueño: no es programador. **Hablale en español rioplatense, simple, paso a paso, sin jerga técnica**;
muchas veces trabaja desde el celular. Explicá el "por qué" con ejemplos y números concretos.
**Pidió (17/11) que seas siempre sincero, no condescendiente:** si algo que propone no conviene, decíselo claro y con números, aunque después decida él.
El repositorio es **público**: no escribas acá datos sensibles (costos, márgenes, datos de clientes, claves).

> **Detalle completo** de cada cambio, decisión y medida (hasta el 21/11/2026): `NOTAS-HISTORIA.md`. No se carga solo: buscá ahí (grep) cuando necesites el porqué o el nombre exacto de algo. Este archivo es el resumen: mantenelo corto (el dueño pidió cuidar el contexto) y actualizalo **una vez al final de cada tema**, no en cada cambio.

## Cómo está armado

| Archivo | Qué es |
|---|---|
| `index.html` | La tienda (GitHub Pages, `www.losperrines.com.ar`). Tarda unos minutos en publicarse; si el dueño ve algo viejo, que recargue. |
| `admin.html` + `admin-*.js` | Panel. `admin-core.js` (núcleo, Ventas, Tienda, Recuperar ventas y Códigos de descuento; expone `window.LP`), `admin-hoy.js` (Hoy), `admin-venta.js` (Nueva venta y **Vendedores**), `admin-taller.js` (Taller, Precios y rentabilidad, **Mayoristas**; define `window.PANEL_VERSION`), `admin-publicidad.js`, `admin-tablero.js`. |
| `Codigo.gs` | Backend en Google Apps Script sobre una planilla. Se instala con el botón del panel (ver abajo). |
| `corte.html` | Plano de corte y ficha para la costurera. |
| `ig/`, `pet/`, `fb/`, `wa/`, `mayorista/` | Links cortos con utm (Instagram bio, veterinarias, Marketplace/Facebook, WhatsApp, grupos de comerciantes → formulario mayorista). |
| `vendedores-mensajes.md`, `mayoristas-mensajes.md` | Mensajes de WhatsApp para invitar vendedores y conseguir mayoristas. |
| `privacidad/` | Política de privacidad (la pidió Google). |
| `dev/` | Emulador de Apps Script, pruebas y helpers de Playwright; `dev/instagram/` placas (lanzamiento, semana, **vendedor.js**, **mayorista.js** para grupos de comerciantes); `dev/video/` scripts ffmpeg de Reels. |
| `costos.html`, `insumos.html`, `pagos.html`, `admin-viejo.html` | Herramientas viejas, de respaldo. |

## Actualizar el sistema (importante)

- El dueño instala `Codigo.gs` desde el panel: **Configuración → Sistema → Buscar actualización → Actualizar ahora** (baja `Codigo.gs` de `main`, lo publica y corre `instalar()`, que agrega columnas/hojas nuevas). Funciona desde el celular desde el 15/11.
- **Cada vez que cambies `Codigo.gs`, subí `SISTEMA_VERSION`** y decile al dueño que toque el botón. Columnas nuevas: siempre **al final** de `COLS`.
- Apps Script vinculado a un **proyecto propio de Google Cloud**: cada API que use el script tiene que estar habilitada ahí (Apps Script, Analytics Data, Drive). Si aparece "Se denegó el permiso para habilitar las APIs: X", habilitar X.
- Desde la nube **no se llega a `script.google.com` ni a la web publicada**: se prueba con el emulador.

## Convenciones de código

- Cada cambio del panel: **subí `window.PANEL_VERSION`** y decile qué número buscar abajo del menú.
- Las vistas se redibujan al tipear: todo `<input>`/`<select>` con `data-in`/`data-ch` necesita `id`. Ventanas: `redlg()`. `<details>` recuerdan si estaban abiertos.
- Números: `nd()` (decimales con coma) y `nm()` (plata). WhatsApp: `waNorm()`.
- Web en celular: tamaños con `min(rem, vw)` calibrados a **412 px** (el celular del dueño, ~412 × 777 útiles). El bloque `@media(max-width:349px)` va **después** del cierre del `@media(max-width:899px)` (ya se rompió una vez). Antes de publicar cambios de la web, probar en 360/390/412/430 px y en la compu, con la letra real (no bloquear Google Fonts).
- Cambios grandes de diseño: **mostrarle una vista previa (antes/después) y esperar su OK**; le gusta así.
- Commits en español, explicando el cambio. **Publicar siempre en `main`** sin preguntar, una vez probado.

## Cómo probar

```bash
node dev/test-backend.js     # taller, compras, tandas
node dev/test-oficina.js     # pantalla Hoy, resumen diario (reloj simulado)
node dev/test-meta.js        # API de Conversiones de Meta
node dev/test-cero.js        # Empezar de cero
node dev/test-tablero.js     # Tablero y Analytics simulado
node dev/test-avisos.js      # Avisame cuando vuelva
node dev/test-actualizar.js  # Actualizar el sistema desde el panel
node dev/test-venta.js       # Nueva venta (por fuera de la web)
node dev/test-youtube.js     # Videos de YouTube por link
node dev/test-mayorista.js   # Formulario de venta por mayor
node dev/test-cupones.js     # Códigos (% o $ por funda) y vendedores: aviso, comisión fija, pagos, recordatorio
node dev/gas-emu.js Codigo.gs 8787 dev/seed-store.js   # backend emulado con tienda de ejemplo (sin recetas)
```
`dev/pw-lib.js`: `open(browser, url, viewport)` redirige Apps Script al emulador (contraseña `test`; bloquea fuentes, así que para medir tamaños usar página propia sin bloquear). La compra pública es la acción `pedido` (con `sucursal` si es a sucursal).

## Reglas del negocio (las definió el dueño)

- **Rentabilidad = ganancia ÷ costo.** Objetivo 60%. Tarjeta: precio − comisión de Mercado Pago (20% cargado); transferencia: ~10% menos. Manda la **mezcla** guardada (% con tarjeta).
- Costo por funda = materiales + confección + gastos compartidos + otros + envío gratis + bolsa. La publicidad **no** va en el costo (se ve en Tablero/Publicidad).
- Margen de costura, laterales, corte y unión, bolsa: ver `NOTAS-HISTORIA.md` (sección Reglas). `piezas()` igual en `admin-taller.js` y `corte.html`.
- Compras suman stock y deuda con el proveedor; "Otro gasto" solo deuda. Proveedores y gastos estilo app del banco (adelantos = saldo a favor).
- Tandas: en confección reservan insumos; al recibir descuentan insumos, suman fundas a la tienda y anotan la confección. Se pueden editar mientras no estén cerradas.
- **Códigos de descuento:** con transferencia; **desde el 23/11 pueden valer también con tarjeta** (casilla "También con tarjeta", columna `tarjeta`; con tarjeta el descuento va dentro del precio de cada funda que se manda a Mercado Pago) y tener **fecha de inicio** (`desde`). Una vez por cliente (opcional). Pueden ser **% o monto fijo en $ por funda** (columna `monto` de Cupones; manda sobre el %). Los de vendedores, solo transferencia.
- **Vendedores (16/11):** cada vendedor tiene un código con **$2.000 de descuento por funda** para el cliente y cobra **$2.000 por funda** (bajó de $3.000 el 16/11, decisión del dueño). Se cargan en Recuperar ventas → Códigos de descuento con su **mail** y **comisión** (para cambiar un código existente se crea de nuevo con el mismo nombre). La comisión se **gana cuando el pedido queda pagado, aunque después se devuelva o cancele**, y queda fija en el pedido (columna `comision`). **Se paga los viernes**: pantalla **Ventas → Vendedores** (lo que se debe pedido por pedido, botón "Le pagué", hoja PagosVendedores, mail al vendedor); el resumen de las 20 h del jueves y viernes lo recuerda. Al pagarse una compra con su código, al vendedor le llega un mail (sin datos del cliente).
- Las transferencias llegan a **Mercado Pago**.

## Funciones principales (detalle en NOTAS-HISTORIA.md)

- **Hoy / oficina:** etapas Confirmar pago → Preparar → Etiquetar → Despachar → En camino → Entregado; avisos; resumen diario a las 20 h; "¿Ya te llegó?" al cliente con links firmados (no hay API de Andreani).
- **Nueva venta:** ventas por fuera de la web (WhatsApp, en mano…), mismos mails que la web, no se avisan a Meta.
- **Avisame cuando vuelva:** mail automático cuando hay stock y la tienda está abierta.
- **Empezar de cero:** respaldo .xlsx en Drive y borra lo de prueba.
- **Medición:** GA4 + píxel de Meta + API de Conversiones (token en propiedades del script, nunca en el repo). `?no_medir=1` apaga la medición en un aparato (se le explicó al dueño el 16/11 para que sus visitas no cuenten).
- **Tablero** (Analytics + ventas, solo Argentina) y **Publicidad** (Meta Ads vs ventas reales, por provincia).
- **Precios y rentabilidad:** prueba precios; fila "Código de vendedor" (−$2.000 −$2.000; `VEND_DESC`, `VEND_COMISION`).

## La web hoy (19/11)

- **Desde el 18/11: estilo tienda tradicional** (pedido del dueño: "que se vea como una web que la gente está acostumbrada a ver"). Arriba una sola página de producto (`#producto`, `pintarProducto()`): foto, nombre, **cuotas primero y transferencia abajo (nunca el total con tarjeta grande)**, tamaño 2 plazas / 1 plaza (`PSEL`), COMPRAR, envío, confianza y desplegables. Fondo blanco, letra Inter. Las secciones viejas siguen en el HTML con `class="viejo"` (ocultas). Carrusel: foto entera sin recortar (fondo desenfocado), orden **fotos/videos de la funda elegida (★ primero) → Portada** (si la funda no tiene fotos, arranca con la principal de Portada); al cambiar de tamaño la foto entra con un fundido; videos: **mejor por YouTube (No listado)**: arrancan solos, sin sonido, en bucle y sin menú (`ytFrame`/`ytActivar`, solo se carga el del slide visible); los de Drive siguen con su menú. Sección **Venta por mayor** (`#mayorista`, antes de las preguntas; línea "🏪 ¿Tenés pet shop o veterinaria? Consultá precios por mayor ›" (`.anuncio-my`) dentro del encabezado, entre la franja verde y el logo; al bajar se van las dos, `topOcultar()`): sin precios, **formulario** (nombre, negocio, localidad, WhatsApp, mail opcional, cantidades) → acción `mayorista`, hoja **Mayoristas** y mail al dueño (responder le llega al negocio); link secundario a WhatsApp (19/11). **No decir "San Luis" en la web** (18/11, el dueño: no le importa a nadie): usar "🇦🇷 Industria argentina". Hay 3 fotos "Gemini_Generated_Image" (IA) en la carpeta de la web: se le recomendó sacarlas.
- **Precios:** 2 plazas **$83.400 tarjeta (3 de $27.800) / $75.000 transferencia**; 1 plaza **$60.900 (3 de $20.300) / $55.000**; el % OFF se calcula solo. **Stock al 22/11: 7 dobles y 5 de 1 plaza** (panel → Stock de fundas).
- **Cuándo llega:** 2 a 4 días hábiles desde el día siguiente, corte 17 h, sin fines de semana ni `FERIADOS` (en `index.html`; **agregar los de 2027** cuando salgan).
- **Versión anterior guardada:** commit `ea69f72` (tarjetas de precio; descripta en NOTAS-HISTORIA.md). Si pide volver: `git checkout ea69f72 -- index.html`, probar y publicar (no rehacerla).

## Estado y pendientes (al 21/11/2026; actualizar al cerrar cada tema)

- **Subido a `main` el 23/11: `Codigo.gs` 23/11/2026 · 1 y panel 23/11 · 1** (cupones con tarjeta y fecha de inicio): **confirmar que el dueño tocó Actualizar**. Antes: `Codigo.gs` **20/11/2026 · 4** (20/11: pedidos y cotizaciones mayoristas, borrar consultas con estado `borrada` sin eliminar la fila; probado por el dueño). Panel **20/11 · 6**.
- **Primera venta web (19/11, por transferencia):** pago confirmado y despachada. El webhook de Mercado Pago (tarjeta) sigue sin probarse con una venta real: revisar si en la primera con tarjeta no queda "pagado" sola. Cuando le llegue, pedirle al cliente foto del perro + opinión y de dónde vino.
- **Mayorista (19/11):** precios definidos con el dueño (están solo en su panel, `lp_mayorista`; **no escribirlos en el repo**). **Sin pedido mínimo** (20/11: lo negocia con cada uno; en el panel "Calcular para" es solo para la cuenta del envío), envío incluido, pago por transferencia antes del despacho, precio sugerido = web contado, válidos 30 días. **Solapa Números → Mayoristas (20/11):** Cotizar (cantidad por funda, envío repartido igual entre todas, precio↔rentabilidad: manda el último escrito; resumen del pedido; PDF con detalle), **Cotizaciones** guardadas en el sistema (misma hoja PedidosMayoristas, `estado: 'cotizacion'`, columna `validez`; Abrir/PDF/Pasar a pedido/Descartar; no tocan el stock), Consultas (hoja Mayoristas: Cotizar/WhatsApp/archivar; estado `cotizada`) y Pedidos (hoja **PedidosMayoristas**: pendiente **no toca el stock**; "Sacar del stock" crea un pedido `origen: 'mayorista'` que descuenta y sigue por Hoy; `esFuera()` lo incluye: sin vencimiento, sin Meta; **ningún mail al negocio** (`enviar()` ignora destinatario vacío; a Andreani va el mail del dueño)).
- **Fotos:** subió fotos reales de la 1 plaza (★ = perrito en la funda). La del golden (portada) es una **funda hamaca, no su canasto**, y hay 3 imágenes hechas con IA: se le recomendó reemplazarlas por fotos reales de la doble. Videos: mejor por YouTube "No listado" (en la web van sin sonido).
- **Videos/Reels (20/11, detalle en NOTAS-HISTORIA):** `dev/video/`: reel-mayorista.py (grabación de la web con zoom y manito; tapa historial y teclado con datos del dueño), reel-1plaza-limpio.py (estilo actual: le gusta, odió los giros "tipo cumple de 15"), reel-video-ia.py (clip de Meta AI + foto real + placa), reel-venta-mayor.py (fotos + formulario + placa). Placa WhatsApp mayorista: `dev/instagram/mayorista.js`. Voz: generada con sherpa-onnx (voz es_AR) pero prefirió editarla él en CapCut. No prometer "viaja seguro"; no mostrar fotos que no son su producto (golden = hamaca; FOTOS REDES 04/05/07 son de otro modelo o IA; la doble 08 tiene otro acolchado: se le advirtió).
- **Publicidad:** campaña anterior (Tráfico): $19.980, 1.500 clics, **0 ventas**. **21/11 publicó desde la compu** en la cuenta "Los Perrines" (no "losperrines_") la campaña **"funda 2 cuotas."** (Ventas, manual): $3.000/día, del 21/11 19 h al 27/11 23:59, conjunto "funda 2 plaza" (solo Sitio web, píxel Los Perrines - web, evento **Agregar al carrito**, público guardado "más de 25 años" Argentina, ubicaciones Advantage+), anuncio "reel perros" = **publicación existente de IG del 18/11** (se le advirtió que la miniatura parece la funda gris que no es su producto y que dice 1,30 × 1,40; decidió seguir igual), botón Comprar, utm cargados. **Martes 24/11: mirar con él Publicidad y Tablero** (costo por carrito, ventas); si con ~$15.000 gastados no hay ventas, parar y cambiar video/texto. Si arrancó tarde, puede correr el fin al 28/11.
- **Black Friday (25 al 27/11):** código **BLACK**, 5%, todos los medios de pago (crearlo con Empieza 25/11, Vence 27/11, También con tarjeta). Placas en Drive FOTOS REDES "15" (historia) y "16" (publicación), con precios ya con el 5%.
- **Tablero (18/11):** 1.129 entradas, 932 vieron fundas, 5 al carrito, 3 al formulario; parte pueden ser pruebas del dueño (entraba con `?no_medir=0`; se le explicó usar `=1`). Cuello de botella: ven y no tocan Comprar → confianza.
- **Vendedores:** EMILIANO hay que recrearlo con comisión 2000. Mensajes en `vendedores-mensajes.md`. 21/11 arrancó la prueba con un vendedor: placa lista en Drive, FOTOS REDES → **"10 Placa vendedores (…con perrito, código en blanco).png"** (foto real del perrito en la 1 plaza, carpeta de fotos de la web; precio de la 2 plazas: se le avisó). Usar esa; si cambian precios, regenerar con `vendedor.js`. Placa mayoristas: **usa la "11 Placa mayoristas" (fotos 08 y 09, sin perros)**, en Drive FOTOS REDES; también quedaron "12" (golden IA) y "13" (cuadro movido del video "perros en funda"), descartadas por él. Estado WhatsApp propio: **"14 Estado WhatsApp 2 fundas con perros"** (golden IA en la doble + perrito real en la simple, cuotas y transferencia de las dos; se le avisó de la IA).
- **Susana:** tema cerrado; al final (21/11) **le pagó un monto por las fundas dañadas** (se le explicó cargarlo como "Otro gasto" a Susana con "Ya pagué" = total, no como pago suelto, para que no quede como adelanto); las 6 de 1 plaza se arreglan (recibirlas con confección $0, arreglo como gasto del costurero nuevo). **Costurero nuevo** haciendo una funda de prueba; pagar siempre contra entrega.
- **Sin respuesta:** compra de prueba con tarjeta del 13/11 (LP-261113-002) vencida sin pago.
- **Pendientes del dueño:** fotos reales de la doble; precio en Marketplace y plantillas de WhatsApp; valor del envío vs Andreani; comisión real de Mercado Pago; margen de costura en 1; dominio en nic.ar; pagar compras del 8/11 a Casa Natalia.
- **Estrategia:** no usar precios tachados (confianza y Defensa del Consumidor); no pelear precio con las hamacas de Mercado Libre; vendedores, video del canasto, primeras opiniones, mayoristas.
- **Medidas (23/11):** la doble mide **130 de ancho × 140 de largo**; el dueño lo corrigió en la web (panel → Configuración → Medidas y detalles). Ojo: el desglose viejo (38 + 40 + 52) sumaba 130; si reaparece, pedirle las partes. Los valores por defecto de `index.html`/`Codigo.gs` siguen con 130 × 130 (solo se usan si falla la planilla).
- **Ofrecido y sin hacer:** página del vendedor; "Compartir por WhatsApp"; precio de lanzamiento con fecha; botón "Corregir precio" de ventas por fuera; perfil de Google Maps.
- **Material:** fotos en Drive, carpeta **FOTOS REDES** (no van al repo); la web toma las del panel (carpeta "Los Perrines - Fotos y videos"). Desde la nube el conector de Drive baja hasta 10 MB: videos más grandes, que los adjunte en el chat. Gmail conectado: nunca mandar mails sin su OK.
