# Los Perrines · notas para Claude

Tienda online de fundas tipo canasto para mascotas (asiento trasero del auto), hecha en San Luis.
Dueño: no es programador. **Hablale en español rioplatense, simple, paso a paso, sin jerga técnica**;
muchas veces trabaja desde el celular. Explicá el "por qué" con ejemplos y números concretos.
El repositorio es **público**: no escribas acá datos sensibles (costos, márgenes, datos de clientes, claves).

## Cómo está armado

| Archivo | Qué es |
|---|---|
| `index.html` | La tienda pública (GitHub Pages, dominio `www.losperrines.com.ar`, ver `CNAME`). |
| `admin.html` | Cascarón del panel: estilos + carga `admin-core.js`, `admin-hoy.js`, `admin-venta.js`, `admin-taller.js`, `admin-publicidad.js` y `admin-tablero.js` con `?v=Date.now()` (para que el navegador nunca use una copia vieja). |
| `admin-core.js` | Núcleo del panel: sesión, navegación por áreas, vistas de Ventas y Tienda. Expone `window.LP`. |
| `admin-venta.js` | Pantalla **Ventas → Nueva venta**: cargar una venta hecha por fuera de la web (ver sección abajo). |
| `admin-hoy.js` | Pantalla **Hoy** (la "oficina"): pedidos por etapa, acciones en lote, hoja de preparación, WhatsApp prearmado y hora del resumen diario. |
| `admin-tablero.js` | Pantalla **Tablero** (primera de Números): "Qué mirar" (conclusiones escritas), ventas/cobrado/ganancia con comparación al período anterior, días de stock, transferencias pagadas, visitas de Google Analytics (canales, aparato, provincias, embudo) y resumen de Meta. |
| `admin-publicidad.js` | Pantalla **Publicidad** (grupo Números): inversión en Meta vs ventas reales de la planilla y ganancia después de anuncios (usa `TALLER.costoFunda`/`gananciaFunda`), embudo y campañas con veredicto. |
| `admin-taller.js` | Taller: insumos, productos (medidas + receta + bolsa), tandas, proveedores y pagos, planificar, rentabilidad, importación. Define `window.PANEL_VERSION` (se muestra abajo del menú). |
| `admin.webmanifest`, `iconos/` | Ícono del panel para el acceso directo en el celular (logo sobre fondo oliva; `admin-512-maskable.png` con más margen para Android). Nombre corto "LP Admin". |
| `corte.html` | Plano de corte e impresión de la ficha para la costurera. Con `#panel` toma las medidas que le pasa el panel por `localStorage` (`lp_corte_panel`; no `sessionStorage`, que no viaja a la pestaña nueva que abre `window.open`). |
| `Codigo.gs` | Backend en Google Apps Script sobre una planilla de Google. **No se publica solo**: el dueño lo pega en Apps Script, ejecuta `instalar()` y hace *Implementar → Administrar implementaciones → Editar → Nueva versión*. |
| `ig/index.html` | Link corto para la bio de Instagram (`losperrines.com.ar/ig`): redirige a `/?utm_source=instagram&utm_medium=bio`. |
| `costos.html`, `insumos.html`, `pagos.html`, `admin-viejo.html` | Herramientas anteriores, ya reemplazadas. Se conservan como respaldo. |
| `dev/` | Herramientas de prueba: emulador de Apps Script y helpers de Playwright (ver abajo). |

- La API es el `exec` de Apps Script que figura en `index.html` y `admin.html` (variable `API`).
- Desde el entorno en la nube **no se puede llegar a `script.google.com` ni a la web publicada**: se prueba con el emulador.
- El backend es retrocompatible: versión actual **5** (`tallerDatos().version === 5`; `resumen().oficina === 2`). Si cambiás columnas, agregalas **al final** de `COLS` y avisá que hay que volver a pegar el `Codigo.gs` (el panel detecta versión vieja y muestra un cartel).

## Reglas del negocio (las definió el dueño)

- **Rentabilidad = ganancia ÷ costo** (no sobre el precio). Objetivo configurable (hoy 60%).
- Tarjeta: se recibe el precio menos la comisión de Mercado Pago (configurable, hoy 20%). Transferencia: precio de transferencia (≈10% menos). Lo que importa es la **mezcla**; el % de ventas con tarjeta lo define el dueño y **manda el valor guardado** (el de las ventas reales se muestra solo como referencia).
- Costo por funda = materiales de la receta + confección + gastos compartidos (repartidos por metro de tela del rollo) + otros + envío gratis + bolsa.
- Corte del cuerpo: largo de corte = tramos terminados + **2 cm por cada pliegue** (2 pliegues); los extremos llevan bies. El largo del cuerpo va **a lo ancho de la tela** (150 cm). La tela se cobra por **metro lineal de rollo** (el sobrante del ancho ya está incluido).
- Bolsa de guardado: una pieza doblada; corte = (2 × alto + 2 × costura) × (ancho + 2 × costura). Insumos editables (tela "sale del corte", cierre "largo de la abertura", resto "cantidad fija").
- Compras: el envío se puede repartir en el precio de los insumos (opción marcada por defecto). Una compra suma stock y genera deuda con el proveedor; "Otro gasto" genera deuda **sin** sumar stock.
- Tandas: mientras están "en confección" reservan insumos; al **recibir** se descuentan insumos, se suman fundas a la tienda y se anota la confección a pagar. Se pueden **editar** (acción `tandaEditar`, botón "Editar" en Tandas: cantidades, quién la cose, notas) mientras estén planificadas o en confección; no deja bajar de lo ya recibido y, si queda igual a lo recibido, la cierra. Recibir parcial + "Es la última entrega" también cierra con menos de lo pedido.
- Las transferencias de los clientes llegan a **Mercado Pago**.

## Convenciones de código (importante)

- Cada vez que cambies el panel, **subí `window.PANEL_VERSION`** en `admin-taller.js` y decile al dueño qué número buscar abajo del menú.
- Las vistas se redibujan enteras al tipear: **todo `<input>`/`<select>` con `data-in`/`data-ch` necesita `id`** para que el foco y el cursor vuelvan a su lugar. Las ventanas que se actualizan usan `redlg()`. Las secciones plegables (`<details>`) tienen que recordar si estaban abiertas.
- Después de un cambio de interfaz, corré la prueba de "escribir en todos los campos" (escribe `5,9` tecla por tecla en cada campo de cada pantalla y ventana y verifica que el cursor no salte).
- Números en campos: `nd()` (decimales, acepta coma y miles con punto) y `nm()` (plata).
- WhatsApp de la tienda: `waNorm()` (igual en `admin-core.js` y `Codigo.gs`) lo deja como `549` + característica sin 0 + número sin 15. El panel lo normaliza al guardar y no deja guardar uno sin característica; `cfg()` también lo normaliza al leer.
- Medición: `GA_ID` y `META_PIXEL_ID` al principio de `index.html` (ya cargados). `trkInit()` arranca apenas carga la página (no espera a la planilla) y **mide siempre, también con el link de vista previa** (lo pidió el dueño para probar en modo de prueba); esos eventos (menos PageView, que va sin datos para que Meta lo tome como estándar) llevan `modo:"prueba"`. `?no_medir=1` apaga la medición en un aparato (`?no_medir=0` la vuelve a prender). Con la tienda cerrada al público solo se registra la visita. Compras: la web manda `Purchase` (`eventID compra-<pedido>`) para tarjeta al volver de Mercado Pago, y `AddPaymentInfo` al reservar por transferencia. Además **`Codigo.gs` avisa la compra a Meta por la API de Conversiones** (`compraMeta`) cuando un pedido queda pagado: `marcarPagado` (transferencia o a mano, también en lote) y `procesarPago` (webhook de tarjeta), con el mismo `event_id` para que Meta deduplique. Datos del cliente con SHA-256. Token en la propiedad del script `META_CAPI_TOKEN` (nunca en el repo); config `meta_pixel_id` y `meta_test_code` (código de "Probar eventos", solo mientras se prueba). Si Meta falla, el pago se registra igual y el error se ve en Configuración (botón "Probar conexión", acción `probarMeta`, que exige código de prueba).
- Commits en español, explicando el cambio para el dueño.

## Cómo probar

```bash
node dev/test-backend.js                      # prueba del backend (taller, compras, tandas, etc.)
node dev/test-oficina.js                      # pantalla Hoy: etapas, lotes, avisos y resumen diario (con reloj simulado)
node dev/test-meta.js                         # aviso de compras a Meta (API de Conversiones), con Meta simulado
node dev/test-cero.js                         # "Empezar de cero": borra solo lo de prueba, respaldo y conteo real
node dev/test-tablero.js                      # Tablero: ventas con comparación, transferencias, días de stock, Google Analytics simulado
node dev/test-avisos.js                       # "Avisame cuando vuelva" automático (tienda abierta + stock, límite de mails)
node dev/test-venta.js                        # Nueva venta (por fuera de la web): mails, entrega en mano, Andreani, stock, Tablero, nada a Meta
node dev/gas-emu.js Codigo.gs 8787 dev/seed-store.js   # levanta el backend emulado en :8787 con una tienda de ejemplo
```

`dev/pw-lib.js` abre páginas del repo con Playwright y redirige las llamadas a Apps Script al emulador
(`open(browser, url, viewport)`). `dev/seed-oficina.js` siembra pedidos en todas las etapas de Hoy. Contraseña del panel en el emulador: `test`.
El dueño puede exportar sus datos del taller (sin datos de clientes) con el botón **"Descargar datos del taller"** del panel; con ese JSON se puede sembrar el emulador para probar con datos reales.

## Estado actual

- **Listo para lanzar** (8/11/2026): el dueño ya hizo "Empezar de cero" (stock de fundas en 0), revisó la configuración (código de prueba de Meta vacío, mail, alias, WhatsApp, Andreani) y conectó Google Analytics al Tablero. La tienda abre cuando reciba la primera tanda de fundas (la semana siguiente); ahí arranca la primera campaña de Meta.
- Herramienta para borrar datos de prueba: **Configuración → Empezar de cero** (acciones `ceroPreview` / `dejarEnCero` con `confirmar:'BORRAR'`). Guarda la planilla completa como .xlsx en la carpeta de Drive "Los Perrines - Respaldos" (no `makeCopy`, que duplica el Apps Script vinculado) y recién después borra Pedidos, Carritos y Bajas (y Avisos/Cupones solo si los tilda). No toca el taller, la configuración, las fotos ni los Movimientos. Con el conteo real de fundas agrega un ajuste para que el stock quede en ese número. Prueba: `node dev/test-cero.js`.
- Medición configurada: píxel de Meta + verificación de dominio (metaetiqueta en `index.html`) + Google Analytics 4 + API de Conversiones de Meta (token cargado por el dueño en Apps Script; probado con "Probar eventos"). El correo del negocio en Meta es un alias de Gmail con "+" (Meta no aceptaba el principal).
- Panel y web: el dueño está conforme con cómo están.

## Oficina de operaciones (v4: Hoy y resumen; v5: confirmación de entrega)

- **Etapas** (las calcula `etapaDe`/`alertaDe` en `Codigo.gs`; panel y mail usan lo mismo): *Confirmar pago* (reserva, o transferencia vencida hace < 3 días) → *Preparar* (pagado sin `preparado`) → *Etiquetar* (pagado y preparado) → *Despachar* (exportado) → *En camino* (despachado, o con un problema sin resolver) → *Entregado* (entregado hace < 7 días). Estado nuevo `entregado` (cuenta como venta: está en `VENDIDO`).
- Columnas nuevas al final de Pedidos: `pagado_el`, `preparado`, `despachado_el`, `entregado_el`, `consulta_el`, `problema_el`. Config nueva: `resumen_hora` (20; vacío = no manda), `alerta_despacho_dias` (2), `consulta_entrega_dias` (5; vacío = no pregunta), `instagram` (`losperrines_`).
- **Entrega**: el dueño no tiene contrato con Andreani (hace falta ~200 envíos/mes), así que no hay API de seguimiento. A los `consulta_entrega_dias` del despacho, `tareaHoraria` le manda al cliente "¿Ya te llegó?" con dos links firmados (`?entrega=ID&r=si|problema&t=firma`). El link abre una página con un botón de confirmar (`ok=1`) para que los antivirus de correo que abren links solos no marquen nada. "Sí" → entregado + mail de gracias pidiendo foto de la mascota en el auto + Instagram. "Problema" (con detalle opcional) → `problema_el`, nota y mail URGENTE al dueño; queda en rojo en En camino hasta "Problema resuelto".
- Avisos: reserva que vence en ≤ 12 h (amarillo) o ya vencida (rojo); pagado hace ≥ `alerta_despacho_dias` sin salir (rojo); exportado hace > 1 día sin seguimiento (amarillo); problema de entrega (rojo); despachado hace ≥ `consulta_entrega_dias` + 2 días sin confirmar (amarillo).
- Acciones: `pagadoLote`, `preparado` (con `valor:false` vuelve atrás), `despacharLote`, `exportar` con `ids` (sin ids exporta todos los pagados, como Envíos), `entregado` (lote; `valor:false` vuelve a En camino), `problemaResuelto`, `resumenAhora`. Los lotes devuelven `{hechos, errores}`.
- Resumen diario: lo manda `tareaHoraria` (una vez por día, la primera corrida desde `resumen_hora`, o sea entre las 20 y las 21). "Nuevo" = desde el último resumen automático (propiedad `resumen_ultimo`).

## Publicidad (pantalla del panel)

- Acción `publicidad` `{dias: 1|7|30, forzar}` → `leerMetaAds` (Insights de Meta a nivel cuenta y campaña, guardado 10 min en caché) + `ventasPeriodo` (ventas reales por fecha de pago). Token de lectura en `META_ADS_TOKEN` (usuario del sistema con `ads_read`); si no está, prueba con `META_CAPI_TOKEN` y explica que falta el permiso. Cuenta en config `meta_ad_account`.
- Compras de Meta: toma la primera de `omni_purchase` / `purchase` / `fb_pixel_purchase` (no las suma, son la misma compra).
- Veredicto por campaña según costo por venta vs ganancia por funda (`rent(p).gMix`): ≥ ganancia "Pierde plata", ≥ 60% "Deja poco", si no "Anda bien"; avisos por frecuencia ≥ 3,5 y CTR < 1%.
- El resumen de las 20 h suma una línea "Publicidad hoy" cuando hay gasto o ventas.
- Estado: token de lectura cargado (`META_ADS_TOKEN`, del "Conversions API System User" con la cuenta publicitaria en "Ver rendimiento" y la app "Panel Los Perrines" con el caso de uso de la API de marketing). Todavía no hay campañas: las arranca al abrir la tienda.
- Ojo: "Revocar tokens" en ese usuario del sistema anula también `META_CAPI_TOKEN`.

## Tablero (pantalla del panel)

- Acción `tablero` `{dias, forzar}`: `ventasEntre` (actual y período anterior, por fecha de pago), `reservasEntre` (transferencias del período: pagadas/esperando/vencidas), días de stock (disponible ÷ ventas por día de los últimos 30), Meta (`leerMetaAds`) y Google Analytics (`leerGA`, caché 30 min).
- Google Analytics usa el **servicio avanzado "Google Analytics Data API"** de Apps Script (`AnalyticsData.Properties.batchRunReports`, corre con el usuario del dueño, sin token) y el config `ga_property_id` (número de propiedad, no el G-). Sin servicio → `{falta:'servicio'}`; sin propiedad → `{falta:'propiedad'}`; la pantalla muestra los pasos.
- `leerGA` hace un segundo pedido a Analytics: `sessionSource`/`sessionMedium` (el panel los agrupa en Instagram/Facebook con y sin anuncio, Google, Directo o WhatsApp; `fuenteDe` en `admin-tablero.js`), todas las provincias y las ciudades. Provincias y ciudades **solo de Argentina** (filtro `countryId = AR`, `soloAR`): las de afuera eran los centros de datos de Meta (Luleå/Suecia, Fort Worth/Texas, Nebraska) revisando los links. Caché `ga3_`.
- **¿Dónde vendés?** (`zonasEntre`): ventas reales por provincia y ciudad sacadas de `prov_loc_cp` ("PROVINCIA / LOCALIDAD / CP"), cruzadas con las visitas de Analytics. `claveProv` une nombres: en Analytics "Buenos Aires" a secas es la Ciudad y "Buenos Aires Province" es la provincia; los barrios de Capital se juntan en "Ciudad de Buenos Aires". "Qué mirar" avisa la provincia que convierte ≥ 1,5 veces el promedio (≥ 50 visitas y ≥ 2 ventas) y la que tiene ≥ 100 visitas sin ventas (salvo Capital: en Argentina los celulares con datos móviles salen a internet por Buenos Aires y Analytics los ubica ahí; el dueño lo vio con sus propias pruebas desde San Luis).
- Para que los anuncios de Meta salgan separados en Analytics, el dueño tiene que poner en cada anuncio los Parámetros de URL `utm_source={{site_source_name}}&utm_medium=paid` (el Tablero lo recuerda).
- En el emulador, los servicios avanzados se simulan con `makeEnv({extra: {AnalyticsData: ...}})`. Prueba: `node dev/test-tablero.js`.
- Estado: conectado (servicio agregado e ID de propiedad cargado en Configuración).

## Dónde quedamos (sesión del 9/11/2026) y qué sigue

- **Pendiente del dueño:** pegar el último `Codigo.gs`, **ejecutar `instalar()`** (crea las columnas de las ventas por fuera de la web) y publicar nueva versión (trae Nueva venta, "¿Dónde vendés?", las fuentes de Instagram/Facebook en el Tablero, el WhatsApp que se acomoda solo y los avisos automáticos de "Avisame cuando vuelva") y publicar nueva versión; pagar a Casa Natalia y cargar el pago; subir fotos reales cuando lleguen las fundas (panel → Fotos y videos).
- **Lanzamiento:** cuando reciba la tanda (la semana del 9/11): recibirla, abrir la tienda, avisar a los de "avisame cuando vuelva" (ahora están en Recuperar ventas), compra real con tarjeta y devolverla.
- **Ofrecido y pendiente de armar:** guía paso a paso de la primera campaña de Meta (objetivo, público, presupuesto chico de prueba, parámetros de URL que están en Publicidad → "Para pegar en cada anuncio"); sección "Perrines viajando" con fotos de clientes; catálogo de productos para Instagram/Meta (feed con precio y stock); combo "dos autos"; precio mayorista para veterinarias.
- **Precios y envío (9/11/2026):** el dueño bajó los precios a propósito para ganar por cantidad y no por pocas ventas caras. El envío cargado en el costo es lo que de verdad le cobra Andreani; el valor tachado de la web (`valor_envio`) es la referencia de lo que cobran otras tiendas, no su costo. Cuando abra la tienda quiere que lo guíes paso a paso con la primera campaña de Meta.
- **Criterios que acordamos:** la publicidad NO va en el costo de la funda (se ve aparte en Tablero y Publicidad); crear campañas se hace en Meta, el panel solo lee; para decidir zonas manda la columna Ventas (las visitas de Analytics por provincia son aproximadas).

## Avisame cuando vuelva (automático, 9/11/2026)

- `avisarStockAuto()` en `Codigo.gs` manda el mail "¡Volvieron las fundas!" solo cuando la tienda está abierta al público (`tienda_abierta = SI`) y hay fundas disponibles. Se llama al recibir una tanda (`tandaRecibir`), al cargar stock (`movimiento`), al abrir la tienda (`guardarConfig` con `tienda_abierta: 'SI'`) y en `tareaHoraria` (levanta los que quedaron por el límite diario de mails). Al dueño le llega un mail con cuántos avisó. Si falla, no frena la acción. El botón manual de Recuperar ventas sigue. Prueba: `node dev/test-avisos.js`.

## Ventas por fuera de la web (Ventas → Nueva venta, 10/11/2026)

- Lo pidió el dueño: vende también por WhatsApp/Instagram/en mano y quiere registrarlas. **Para el cliente tiene que ser igual que comprar en la web** (mismos datos, mismos mails, misma imagen); cambia solo la gestión.
- Acción `ventaManual` → fila normal en Pedidos con columnas nuevas al final: `origen` (`fuera`; vacío = web), `canal` (WhatsApp, Instagram, Conocido, Veterinaria, Feria…), `medio` (efectivo/transferencia/tarjeta/otro; `pago` queda `tarjeta` o `transferencia` para la comisión) y `bonificacion` (texto que ve el cliente; `descuento` = diferencia con el precio de la web). `resumen().ventaManual === 1` (si falta, la pantalla pide pegar el `Codigo.gs`).
- Precio libre por unidad (arranca en el de la web según el medio). Mail obligatorio; DNI obligatorio solo si va por Andreani. Valida stock.
- Entrega: `domicilio`/`sucursal` (igual que la web: entra a `exportarAndreani`, despacho con seguimiento, "¿Ya te llegó?") o `mano` (nueva): no va a Andreani ni a Envíos; en Hoy pasa Preparar → En camino ("lista para entregar") → Entregado (`marcarEntregado` acepta `pagado` si es en mano). A los 2 días de entregada, `enviarFotosMano` (en `tareaHoraria`) le manda "¿Cómo le quedó la funda?" con `pedidoFoto` (usa `consulta_el` para no repetir).
- "Todavía no me pagó": queda `reserva` sin `vence` (no se vence sola, aparta stock en `stock()`), en Confirmar pago sin alerta; el mail lleva los datos para transferir si el medio es transferencia.
- Mails: `mailVentaFuera` (gracias por la compra, según estado/entrega), `mailPagoFuera` (al marcarla pagada), `mailFotoMano`; `detalle()` muestra medio, bonificación y "En mano". **No se avisa a Meta** (`marcarPagado` corta antes de `compraMeta`) y no cuenta en Publicidad (`ventasPeriodo`) ni en "Compras por transferencia"; el Tablero las suma en ventas/cobrado (con `fuera` = cuántas) y en "Te quedó" devuelve el envío de las entregadas en mano (`sinEnvio` × `TALLER.envioFunda`); la conversión de la web y el costo por venta usan solo las de la web.
- Prueba: `node dev/test-venta.js`.

## Siguientes pasos posibles

- Confirmar transferencias automáticamente consultando Mercado Pago; que el cliente suba el comprobante en la web; etiquetas de Andreani por API (requiere credenciales de Andreani); atención por WhatsApp con IA (requiere WhatsApp Business API).

## Otros pendientes

- Web: fotos reales del producto (si no hay fotos subidas muestra una ilustración). La foto de cada tarjeta de producto se muestra **entera** (`.m-img`, `object-fit:contain`) sobre una copia desenfocada de la misma foto (`.m-fondo`) que rellena lo que sobra, así sirven fotos de cualquier forma (lo pidió el dueño: no quería recortes). Recuadro 3:2 en computadora y cuadrado (1:1) en celular (el dueño lo eligió viendo su foto vertical). La foto de portada (`.illus .foto`) usa lo mismo: cuando carga, el recuadro toma la forma de la foto (`--ar`, como mucho cuadrado), se esconde la ilustración y lo que sobra se rellena con `.foto-fondo` desenfocada. Con 2 o más fotos, la tarjeta del producto es un carrusel (`fotoCard()`: `.m-track` con scroll-snap, puntitos `.m-dots` y contador "2 / 5"); se desliza con el dedo, en la compu tiene flechitas al pasar el mouse (`data-mfl`), y tocar una foto abre la galería grande en esa misma foto (cada `.m-slide` tiene su `data-i`). Ideas ofrecidas al dueño: sección "Perrines viajando" con fotos de clientes, catálogo de productos para Instagram, combo dos autos.
- Web en celular (9/11/2026, < 900 px): la franja amarilla es de un renglón y se va al bajar (el header sticky tiene `top` negativo); el WhatsApp va dentro de la barra de abajo (`.wa-in`), no flotando; la barra de abajo (`bbUpdate()`) esconde "Ver productos" cuando ya se ven los productos o el botón del inicio, pasa a "Ver carrito (N)" si hay algo en el carrito; el texto al lado del WhatsApp es **siempre** "Elegí tu funda · Envío gratis · N cuotas" (lo pidió el dueño, no lo cambies según dónde esté mirando); "Medidas y detalles" de cada producto es plegable; las secciones de tela, "Hecha acá" y features son carruseles deslizables. Pasó de ~16 a ~12 pantallas. En la computadora no cambió nada.
- Al abrir: recibir la tanda (Taller → Tandas → Recibir), abrir la tienda, avisar a los de "avisame cuando vuelva", hacer una compra real con tarjeta y devolverla, lanzar la primera campaña y mirar Tablero/Publicidad a los 2-3 días.
- Permisos: `.claude/settings.json` (lo creó el dueño) permite git add/commit/push a main, pull/fetch/status/log/diff y `node dev/*` sin preguntar.
- Taller revisado con el dueño (9/11/2026, con su exportación): recetas, medidas de la web, correas (6 en la doble) y laterales están bien. El bies se pasó todo a "Cinta Gross" (se toman como un solo insumo). La bolsa de guardado sigue desactivada a propósito (está evaluando si la confecciona). Confección de la 1 plaza estimada más baja que la doble (a confirmar con la costurera). Pendiente del dueño: pagar las compras del 8/11 a Casa Natalia. La bolsa de envío archivada ya está en 0 (hecho el 9/11).
- Segunda revisión del taller (9/11/2026 tarde, el dueño dijo "no hagamos nada por ahora"): en la 1 plaza las medidas dicen 2 correas pero la receta lleva 4 hebillas (en la doble es 1 hebilla por correa); la bolsa de guardado de la doble usa un insumo de tela que ya no existe (`IN-752EE035`, no afecta mientras esté desactivada); en la 1 plaza el matelaseado está a mano (0,85 m) y el corte da 0,87 m; laterales de la 1 plaza invertidos respecto de la doble (40×42 vs 42×40); preguntar si el precio cargado del matelaseado coincide con lo pagado.
- Ojo al revisar exportaciones: los textos de `medidas1`/`medidas2` en `CONFIG_DEF` son solo los de la instalación; lo que ve el cliente está en la hoja Config. Y la exportación omite las medidas que coinciden con `MED_DEF`.
- Ideas ofrecidas: aviso cuando una receta usa un insumo archivado; catálogo de productos para Instagram/Facebook.
