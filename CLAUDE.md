# Los Perrines · notas para Claude

Tienda online de fundas tipo canasto para mascotas (asiento trasero del auto), hecha en San Luis.
Dueño: no es programador. **Hablale en español rioplatense, simple, paso a paso, sin jerga técnica**;
muchas veces trabaja desde el celular. Explicá el "por qué" con ejemplos y números concretos.
El repositorio es **público**: no escribas acá datos sensibles (costos, márgenes, datos de clientes, claves).

## Cómo está armado

| Archivo | Qué es |
|---|---|
| `index.html` | La tienda pública (GitHub Pages, dominio `www.losperrines.com.ar`, ver `CNAME`). |
| `admin.html` | Cascarón del panel: estilos + carga `admin-core.js`, `admin-hoy.js`, `admin-taller.js`, `admin-publicidad.js` y `admin-tablero.js` con `?v=Date.now()` (para que el navegador nunca use una copia vieja). |
| `admin-core.js` | Núcleo del panel: sesión, navegación por áreas, vistas de Ventas y Tienda. Expone `window.LP`. |
| `admin-hoy.js` | Pantalla **Hoy** (la "oficina"): pedidos por etapa, acciones en lote, hoja de preparación, WhatsApp prearmado y hora del resumen diario. |
| `admin-tablero.js` | Pantalla **Tablero** (primera de Números): "Qué mirar" (conclusiones escritas), ventas/cobrado/ganancia con comparación al período anterior, días de stock, transferencias pagadas, visitas de Google Analytics (canales, aparato, provincias, embudo) y resumen de Meta. |
| `admin-publicidad.js` | Pantalla **Publicidad** (grupo Números): inversión en Meta vs ventas reales de la planilla y ganancia después de anuncios (usa `TALLER.costoFunda`/`gananciaFunda`), embudo y campañas con veredicto. |
| `admin-taller.js` | Taller: insumos, productos (medidas + receta + bolsa), tandas, proveedores y pagos, planificar, rentabilidad, importación. Define `window.PANEL_VERSION` (se muestra abajo del menú). |
| `corte.html` | Plano de corte e impresión de la ficha para la costurera. Con `#panel` toma las medidas que le pasa el panel por `sessionStorage`. |
| `Codigo.gs` | Backend en Google Apps Script sobre una planilla de Google. **No se publica solo**: el dueño lo pega en Apps Script, ejecuta `instalar()` y hace *Implementar → Administrar implementaciones → Editar → Nueva versión*. |
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
- Tandas: mientras están "en confección" reservan insumos; al **recibir** se descuentan insumos, se suman fundas a la tienda y se anota la confección a pagar.
- Las transferencias de los clientes llegan a **Mercado Pago**.

## Convenciones de código (importante)

- Cada vez que cambies el panel, **subí `window.PANEL_VERSION`** en `admin-taller.js` y decile al dueño qué número buscar abajo del menú.
- Las vistas se redibujan enteras al tipear: **todo `<input>`/`<select>` con `data-in`/`data-ch` necesita `id`** para que el foco y el cursor vuelvan a su lugar. Las ventanas que se actualizan usan `redlg()`. Las secciones plegables (`<details>`) tienen que recordar si estaban abiertas.
- Después de un cambio de interfaz, corré la prueba de "escribir en todos los campos" (escribe `5,9` tecla por tecla en cada campo de cada pantalla y ventana y verifica que el cursor no salte).
- Números en campos: `nd()` (decimales, acepta coma y miles con punto) y `nm()` (plata).
- Medición: `GA_ID` y `META_PIXEL_ID` al principio de `index.html` (ya cargados). `trkInit()` arranca apenas carga la página (no espera a la planilla) y **mide siempre, también con el link de vista previa** (lo pidió el dueño para probar en modo de prueba); esos eventos (menos PageView, que va sin datos para que Meta lo tome como estándar) llevan `modo:"prueba"`. `?no_medir=1` apaga la medición en un aparato (`?no_medir=0` la vuelve a prender). Con la tienda cerrada al público solo se registra la visita. Compras: la web manda `Purchase` (`eventID compra-<pedido>`) para tarjeta al volver de Mercado Pago, y `AddPaymentInfo` al reservar por transferencia. Además **`Codigo.gs` avisa la compra a Meta por la API de Conversiones** (`compraMeta`) cuando un pedido queda pagado: `marcarPagado` (transferencia o a mano, también en lote) y `procesarPago` (webhook de tarjeta), con el mismo `event_id` para que Meta deduplique. Datos del cliente con SHA-256. Token en la propiedad del script `META_CAPI_TOKEN` (nunca en el repo); config `meta_pixel_id` y `meta_test_code` (código de "Probar eventos", solo mientras se prueba). Si Meta falla, el pago se registra igual y el error se ve en Configuración (botón "Probar conexión", acción `probarMeta`, que exige código de prueba).
- Commits en español, explicando el cambio para el dueño.

## Cómo probar

```bash
node dev/test-backend.js                      # prueba del backend (taller, compras, tandas, etc.)
node dev/test-oficina.js                      # pantalla Hoy: etapas, lotes, avisos y resumen diario (con reloj simulado)
node dev/test-meta.js                         # aviso de compras a Meta (API de Conversiones), con Meta simulado
node dev/test-cero.js                         # "Empezar de cero": borra solo lo de prueba, respaldo y conteo real
node dev/test-tablero.js                      # Tablero: ventas con comparación, transferencias, días de stock, Google Analytics simulado
node dev/gas-emu.js Codigo.gs 8787 dev/seed-store.js   # levanta el backend emulado en :8787 con una tienda de ejemplo
```

`dev/pw-lib.js` abre páginas del repo con Playwright y redirige las llamadas a Apps Script al emulador
(`open(browser, url, viewport)`). `dev/seed-oficina.js` siembra pedidos en todas las etapas de Hoy. Contraseña del panel en el emulador: `test`.
El dueño puede exportar sus datos del taller (sin datos de clientes) con el botón **"Descargar datos del taller"** del panel; con ese JSON se puede sembrar el emulador para probar con datos reales.

## Estado actual

- Tienda **cerrada** (en desarrollo). Hay **pedidos y stock de prueba**: antes de abrir, el dueño usa **Configuración → Empezar de cero** (acciones `ceroPreview` / `dejarEnCero` con `confirmar:'BORRAR'`). Hace una copia completa de la planilla en Drive y recién después borra Pedidos, Carritos y Bajas (y Avisos/Cupones solo si los tilda). No toca el taller, la configuración, las fotos ni los Movimientos. Con el conteo real de fundas agrega un ajuste para que el stock quede en ese número. Prueba: `node dev/test-cero.js`.
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
- En el emulador, los servicios avanzados se simulan con `makeEnv({extra: {AnalyticsData: ...}})`. Prueba: `node dev/test-tablero.js`.
- Estado: falta que el dueño agregue el servicio y cargue el ID de propiedad.

## Siguientes pasos posibles

- Confirmar transferencias automáticamente consultando Mercado Pago; que el cliente suba el comprobante en la web; etiquetas de Andreani por API (requiere credenciales de Andreani); atención por WhatsApp con IA (requiere WhatsApp Business API).

## Otros pendientes

- Web: fotos reales del producto (si no hay fotos subidas muestra una ilustración); que las medidas publicadas salgan de la ficha del producto (hoy están desparejas); arreglos en celular (barra fija que tapa contenido, botón de WhatsApp encima del texto, "Ver productos" repetido, página muy larga).
- Antes de abrir: compra de prueba de punta a punta (transferencia y tarjeta), completar configuración (email de avisos, token de Mercado Pago, plantilla de Andreani), "dejar en cero".
- Datos del taller que el dueño tenía que revisar: forro de la individual (usaba un insumo archivado), tela tracker lisa cargada en "u" en vez de "m", medidas incompletas de la individual, cinta de la individual (2 m cargados vs 4 m según medidas), hebillas/deslizadores ("mínimo 100" pero envase de 150).
- Ideas ofrecidas: aviso cuando una receta usa un insumo archivado; catálogo de productos para Instagram/Facebook.
