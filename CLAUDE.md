# Los Perrines · notas para Claude

Tienda online de fundas tipo canasto para mascotas (asiento trasero del auto), hecha en San Luis.
Dueño: no es programador. **Hablale en español rioplatense, simple, paso a paso, sin jerga técnica**;
muchas veces trabaja desde el celular. Explicá el "por qué" con ejemplos y números concretos.
**Pidió (17/11) que seas siempre sincero, no condescendiente:** si algo que propone no conviene, decíselo claro y con números, aunque después decida él.
El repositorio es **público**: no escribas acá datos sensibles (costos, márgenes, datos de clientes, claves).

> **Detalle completo** de cada cambio, decisión y medida (hasta el 24/11/2026): `NOTAS-HISTORIA.md`. No se carga solo: buscá ahí (grep) cuando necesites el porqué o el nombre exacto de algo. Este archivo es el resumen: mantenelo corto (el dueño pidió cuidar el contexto) y actualizalo **una vez al final de cada tema**, no en cada cambio.

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
| `dev/` | Emulador de Apps Script, pruebas y helpers de Playwright; `dev/instagram/` placas (lanzamiento, semana, **vendedor.js**, **mayorista.js**, **promo-historia.html** = historia de promo con precios tachados); `dev/video/` scripts ffmpeg de Reels. |
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
node dev/test-difusion.js    # Mail a tus contactos (tandas, bajas, nombre)
node dev/test-cupones.js     # Códigos (% o $ por funda) y vendedores: aviso, comisión fija, pagos, recordatorio
node dev/test-prospectos.js  # Prospectos de venta por mayor (estados, pegar varios sin repetir)
node dev/gas-emu.js Codigo.gs 8787 dev/seed-store.js   # backend emulado con tienda de ejemplo (sin recetas)
```
`dev/pw-lib.js`: `open(browser, url, viewport)` redirige Apps Script al emulador (contraseña `test`; bloquea fuentes, así que para medir tamaños usar página propia sin bloquear). La compra pública es la acción `pedido` (con `sucursal` si es a sucursal).

## Reglas del negocio (las definió el dueño)

- **Rentabilidad = ganancia ÷ costo.** Objetivo **50%** (lo bajó él en Config; antes 60%). Tarjeta: precio − comisión de Mercado Pago (20% cargado); transferencia: ~10% menos. Manda la **mezcla** guardada (% con tarjeta).
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
- **Promo en la web (23/11):** el dueño la maneja solo en **Ventas → Promo en la web** (estaba en Configuración; se movió el 24/11, `vPromo`) (`promo_texto`, `promo_codigo`, `promo_desde`, `promo_hasta`): franja negra arriba (reemplaza la línea de mayoristas) y recuadro bajo el precio; el código se carga solo en el carrito (`CUPON_URL`); se va sola al vencer; con vista previa se ve antes de empezar (`promoActiva()`). El código se crea aparte en Códigos de descuento.
- **Mail a tus contactos (24/11):** Recuperar ventas → bloque al final. Pega lista (mail + nombre), hoja **Difusion** (pendiente/enviado/baja/error), manda de a tandas con `difusionEnviar` (cupo de Google − 10 para ventas), desde su Gmail (responder le llega a él), con precios de la web, foto `img/mail-perro.jpg` y link de baja (hoja Bajas). Botón de prueba a `email_aviso`. Textos editables (se recuerdan en el navegador). Prueba: `dev/test-difusion.js`. **No usar para la base de clientes de Andreani** (se le explicó el 24/11: Ley 25.326 y su vínculo con Andreani; dijo que usa otros contactos).
- **Avisame cuando vuelva:** mail automático cuando hay stock y la tienda está abierta.
- **Empezar de cero:** respaldo .xlsx en Drive y borra lo de prueba.
- **Google (27/11):** título/descripción con "funda para perro para auto", datos de producto (`datosGoogle()`, schema.org con datos reales), `robots.txt`, `sitemap.xml`. **Search Console verificado** con la etiqueta `google-site-verification` en `index.html`: **no borrarla**. Sitemap enviado (27/11). **Google Business Profile creado (27/11)**, "Tienda de suministros para mascotas", sin dirección pública, foto real del perrito; parece verificado al instante (tilde azul): confirmar en business.google.com/locations. Pendiente: cambiar "Abierto 24 horas" por horario real, descripción (dio "caracteres no admitidos" al pegar: escribirla a mano), más fotos reales, pedir opiniones con "Solicita opiniones". **Merchant Center (28/11, sin terminar):** su Gmail ya tiene una cuenta de Merchant de **Deco Industrial** (otro negocio suyo) con sanción por "representación errónea" y productos de otro dominio: **no usarla**; hay que crear una cuenta nueva para Los Perrines (desde el celular no aparece la opción: hacerlo desde la compu o con "Sitio para computadoras"). Después: envío gratis AR 2–4 días hábiles, devoluciones 10 días sin costo, cargar las 2 fundas. Ojo: "Los Perrines" también es una cadena de panchos de México (confunde la búsqueda por nombre: usar "Los Perrines · fundas para perro").
- **Medición:** GA4 + píxel de Meta + API de Conversiones (token en propiedades del script, nunca en el repo). `?no_medir=1` apaga la medición en un aparato (se le explicó al dueño el 16/11 para que sus visitas no cuenten).
- **Tablero** (Analytics + ventas, solo Argentina) y **Publicidad** (Meta Ads vs ventas reales, por provincia).
- **Precios y rentabilidad:** prueba precios; fila "Código de vendedor" (−$2.000 −$2.000; `VEND_DESC`, `VEND_COMISION`); bloque **Probá una promo** (24/11, `promoBloque()`): % de descuento → precio tachado, ahorro en $ y rentabilidad, solo para mirar.

## La web hoy (19/11)

- **Desde el 18/11: estilo tienda tradicional** (pedido del dueño: "que se vea como una web que la gente está acostumbrada a ver"). Arriba una sola página de producto (`#producto`, `pintarProducto()`): foto, nombre, **cuotas primero y transferencia abajo (nunca el total con tarjeta grande)**, tamaño 2 plazas / 1 plaza (`PSEL`), COMPRAR, envío, confianza y desplegables. Fondo blanco, letra Inter. Las secciones viejas siguen en el HTML con `class="viejo"` (ocultas). Carrusel: foto entera sin recortar (fondo desenfocado), orden **fotos/videos de la funda elegida (★ primero) → Portada** (si la funda no tiene fotos, arranca con la principal de Portada); al cambiar de tamaño la foto entra con un fundido; videos: **mejor por YouTube (No listado)**: arrancan solos, sin sonido, en bucle y sin menú (`ytFrame`/`ytActivar`, solo se carga el del slide visible); los de Drive siguen con su menú. Sección **Venta por mayor** (`#mayorista`, antes de las preguntas; línea "🏪 ¿Tenés pet shop o veterinaria? Consultá precios por mayor ›" (`.anuncio-my`) dentro del encabezado, entre la franja verde y el logo; al bajar se van las dos, `topOcultar()`): sin precios, **formulario** (nombre, negocio, localidad, WhatsApp, mail opcional, cantidades) → acción `mayorista`, hoja **Mayoristas** y mail al dueño (responder le llega al negocio); link secundario a WhatsApp (19/11). **No decir "San Luis" en la web** (18/11, el dueño: no le importa a nadie): usar "🇦🇷 Industria argentina". Hay 3 fotos "Gemini_Generated_Image" (IA) en la carpeta de la web: se le recomendó sacarlas.
- **Precios:** 2 plazas **$83.400 tarjeta (3 de $27.800) / $75.000 transferencia**; 1 plaza **$60.900 (3 de $20.300) / $55.000**; el % OFF se calcula solo. **Stock al 22/11: 7 dobles y 5 de 1 plaza** (panel → Stock de fundas).
- **Cuándo llega:** 2 a 4 días hábiles desde el día siguiente, corte 17 h, sin fines de semana ni `FERIADOS` (en `index.html`; **agregar los de 2027** cuando salgan).
- **Versión anterior guardada:** commit `ea69f72` (tarjetas de precio; descripta en NOTAS-HISTORIA.md). Si pide volver: `git checkout ea69f72 -- index.html`, probar y publicar (no rehacerla).

## Estado y pendientes (al 24/11/2026; actualizar al cerrar cada tema)

**Primero, al retomar:** preguntarle cómo vino el Black Friday (terminó el 27/11) y pedirle captura de **Publicidad** y **Tablero**; si actualizó el sistema a **26/11/2026 · 1** (Prospectos) y si pegó la lista de pet shops; cómo le fue con los primeros WhatsApp a pet shops.

- **Instalado (24/11, confirmado):** `Codigo.gs` **24/11/2026 · 2**, panel **24/11 · 6** (subido, falta confirmar que lo ve). Todo sigue en jabacaicoa@gmail.com (decidió no usar mail aparte).
- **Ventas (revisado en la planilla el 25/11):** 1 web (19/11, 1 plaza, transferencia, entregada 24/11), 1 por fuera (22/11, doble, Marketplace, efectivo) y 1 doble de regalo (13/11). **Stock 25/11: 6 dobles y 5 de 1 plaza** (+2 dobles de muestra fuera de stock). Las 6 de 1 plaza que entraron son de Susana marcadas "fallados"/"mal cosidas": preguntado si se venden igual. Pendiente: que el dueño le pida por WhatsApp foto + opinión + "¿cómo nos conociste?". Webhook de Mercado Pago (tarjeta) **sin probar con venta real**.
- **Diagnóstico (23/11):** entra gente y no toca Comprar (≈1% agrega al carrito). Causas: lo que ven no es su producto (anuncio con funda gris; portada de la web = golden en **hamaca**), precio vs hamacas de ML sin explicar la diferencia, cero opiniones. **Lo que más destraba: una foto real de la doble con un perro** (web, anuncio, placas). Ofrecido sin hacer: mostrar la tabla "¿Por qué no una funda común?" bajo COMPRAR (con vista previa).
- **Publicidad al 26/11:** campaña "funda 2 cuotas." $14.360, 101 visitas (~$142 c/u), 5 carritos, 1 inició pago, 0 compras: **no renovarla** (vence 27/11). El reel promocionado "¿Tu perro viaja atrás?" (13-18/11) dio ~1.500 clics por $20.000 y 12,4 mil vistas: mejor candidato para volver a promocionar (revisar antes en Tablero si esos clics llegaron a la web). En el carrito 4 de 5 se fueron antes del formulario: se agregó botón "¿Dudas? WhatsApp" (26/11); ofrecido con vista previa: mostrar cuotas primero (hoy el "Total" grande es el de tarjeta) y el descuento del código en el carrito.
- **Campaña Meta "funda 2 cuotas."** (Ventas, evento Agregar al carrito, $3.000/día, 21/11 → 27/11; detalle en NOTAS-HISTORIA): al 23/11 ~$6.500 y **0 carritos**. Regla: con ~$15.000 sin carritos/ventas, pausar y hacer anuncio nuevo con producto real. La revisión del 24/11 quedó pendiente.
- **Black Friday 25 al 27/11:** código **BLACK 10%**, tarjeta y transferencia (lo crea él: Empieza 25/11, Vence 27/11, También con tarjeta) + Promo en la web 25 al 27 (Ventas → Promo en la web). Historia final: oscura con **precio de siempre tachado + precio con 10%** (le gusta ese estilo; rechazó la versión "estilo web" blanca); está en Drive FOTOS REDES como **"17 … CON TACHADOS (falta OK)"** (también "15/16 … 10%" sin tachado); diseño en `dev/instagram/promo-historia.html`. **24/11: decidió 10% y 3 historias, una por día** (FOTOS REDES **18/19/20**, `dev/instagram/black-dias.html` + `.js`): foto real del perrito, $67.500 transferencia grande (quiere empujar transferencia), cuotas abajo, envío gratis y 3 cuotas sin interés. **Programado (24/11, confirmado con captura):** historias 18/19/20 a las 9:00 y publicaciones 21/21b/22 (feed, mismo diseño) mié y jue 20:00, vie 12:30, en FB + IG, sin botón y link corto **losperrines.com.ar/black** (`black/`, utm_campaign=black). Banner y código BLACK ya cargados por él. Recordarle borrar la historia del viernes esa noche (sigue hasta el sábado 9:00). Desde el 28: historia general "14".
- **Mail a tus contactos:** el 24/11 mandó a **80 contactos** (mail simple; responder = código de $3.000). Código sugerido `VECINO` ($3.000 por funda, una vez por cliente, solo transferencia, vence ~10 días): confirmar si lo creó. Ofrecido: **máximo de usos** por código. **Nunca** para la base de clientes de Andreani.
- **Ofrecido y sin respuesta:** cambiar el mail de entregado ("gracias por confirmarnos" → "¡Qué bueno que ya tenés tu pedido!"); cartel con QR para mostrador.
- **Revendedores (24/11):** comisión a vendedores por ventas mayoristas no da; le gustó la idea de **revendedor** (compra a precio mayorista, vende al público al precio sugerido de la web, pago adelantado, mínimo ~3, sin anuncios ni ML con la marca, no se combina con código). No está confirmado como regla.
- **Mayorista:** precios solo en su panel (**no escribirlos en el repo**). Sin pedido mínimo, envío incluido, pago antes del despacho, precio sugerido = web contado, 30 días. Solapa Números → Mayoristas: Cotizar, Cotizaciones, Consultas, Pedidos y **Prospectos** (26/11, hoja `Prospectos`: pet shops/veterinarias; "Enviar WhatsApp" abre wa.me con el mensaje armado y lo marca enviado, a los 4 días "Volver a escribir"; textos editables en el aparato; "Pegar varios" = Nombre ; Localidad ; WhatsApp. No se usa API de WhatsApp ni difusión masiva: riesgo de bloqueo). Detalle en NOTAS-HISTORIA.
- **Fotos y material:** Drive **FOTOS REDES**: 10 (vendedores), 11 (mayoristas, la que usa), 14 (estado 2 fundas), 15/16 (Black Friday). Golden y FOTOS REDES 04/05/07 **no son su producto o son IA** (si se usan, etiqueta de IA); la doble 08 tiene otro acolchado. No prometer "viaja seguro". Reels: scripts en `dev/video/`. Publicar en IG + página de FB **desde Meta Business Suite** (el compartir automático va a su perfil personal; apagar "reels" ahí).
- **Vendedores:** EMILIANO: recrearlo con comisión 2000. Mensajes en `vendedores-mensajes.md`.
- **Susana:** cerrado. El pago por las falladas **no estaba en la planilla** (25/11): se le explicó cargarlo como "Otro gasto" con "Ya pagué". Dijo que las 6 chicas están OK para vender. **Costurero nuevo (Ubaldo):** funda de prueba hecha, la entrega en la semana; le dio un adelanto (cargarlo como pago → saldo a favor); precio sin acordar (lo de la ficha es simulación). Al recibirla: tanda de 1 doble con Ubaldo y la confección acordada.
- **Medidas:** la doble mide **130 × 140** (ancho × largo), corregido en Configuración; los valores por defecto del código siguen en 130 × 130.
- **Pendientes del dueño:** foto real de la doble con perro; cambiar portada de la web; precio en Marketplace y plantillas de WhatsApp; envío vs Andreani; comisión real de Mercado Pago; margen de costura en 1 (ya está en 1). Casa Natalia, Carlos, Papelera y Susana (confección 8) **saldados** en la planilla.
- **Estrategia:** tachar solo precios reales (promos con fecha); no pelear precio con las hamacas de ML; vendedores, video del canasto, primeras opiniones, mayoristas.
