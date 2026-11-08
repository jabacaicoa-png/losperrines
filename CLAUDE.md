# Los Perrines · notas para Claude

Tienda online de fundas tipo canasto para mascotas (asiento trasero del auto), hecha en San Luis.
Dueño: no es programador. **Hablale en español rioplatense, simple, paso a paso, sin jerga técnica**;
muchas veces trabaja desde el celular. Explicá el "por qué" con ejemplos y números concretos.
El repositorio es **público**: no escribas acá datos sensibles (costos, márgenes, datos de clientes, claves).

## Cómo está armado

| Archivo | Qué es |
|---|---|
| `index.html` | La tienda pública (GitHub Pages, dominio `www.losperrines.com.ar`, ver `CNAME`). |
| `admin.html` | Cascarón del panel: estilos + carga `admin-core.js`, `admin-hoy.js` y `admin-taller.js` con `?v=Date.now()` (para que el navegador nunca use una copia vieja). |
| `admin-core.js` | Núcleo del panel: sesión, navegación por áreas, vistas de Ventas y Tienda. Expone `window.LP`. |
| `admin-hoy.js` | Pantalla **Hoy** (la "oficina"): pedidos por etapa, acciones en lote, hoja de preparación, WhatsApp prearmado y hora del resumen diario. |
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
- Medición: `GA_ID` y `META_PIXEL_ID` al principio de `index.html` (ya cargados). No se mide la vista previa salvo con `&probar_medicion=1`. Con la tienda cerrada solo se registra la visita.
- Commits en español, explicando el cambio para el dueño.

## Cómo probar

```bash
node dev/test-backend.js                      # prueba del backend (taller, compras, tandas, etc.)
node dev/test-oficina.js                      # pantalla Hoy: etapas, lotes, avisos y resumen diario (con reloj simulado)
node dev/gas-emu.js Codigo.gs 8787 dev/seed-store.js   # levanta el backend emulado en :8787 con una tienda de ejemplo
```

`dev/pw-lib.js` abre páginas del repo con Playwright y redirige las llamadas a Apps Script al emulador
(`open(browser, url, viewport)`). `dev/seed-oficina.js` siembra pedidos en todas las etapas de Hoy. Contraseña del panel en el emulador: `test`.
El dueño puede exportar sus datos del taller (sin datos de clientes) con el botón **"Descargar datos del taller"** del panel; con ese JSON se puede sembrar el emulador para probar con datos reales.

## Estado actual

- Tienda **cerrada** (en desarrollo). Hay **pedidos y stock de prueba**: antes de abrir hay que "dejar en cero" (borrar pedidos/ventas/carritos/avisos/cupones de prueba, conservar insumos, recetas, proveedores, compras y pagos, y ajustar el stock real de fundas).
- Medición configurada: píxel de Meta + verificación de dominio (metaetiqueta en `index.html`) + Google Analytics 4.
- Panel y web: el dueño está conforme con cómo están.

## Oficina de operaciones (v4: Hoy y resumen; v5: confirmación de entrega)

- **Etapas** (las calcula `etapaDe`/`alertaDe` en `Codigo.gs`; panel y mail usan lo mismo): *Confirmar pago* (reserva, o transferencia vencida hace < 3 días) → *Preparar* (pagado sin `preparado`) → *Etiquetar* (pagado y preparado) → *Despachar* (exportado) → *En camino* (despachado, o con un problema sin resolver) → *Entregado* (entregado hace < 7 días). Estado nuevo `entregado` (cuenta como venta: está en `VENDIDO`).
- Columnas nuevas al final de Pedidos: `pagado_el`, `preparado`, `despachado_el`, `entregado_el`, `consulta_el`, `problema_el`. Config nueva: `resumen_hora` (20; vacío = no manda), `alerta_despacho_dias` (2), `consulta_entrega_dias` (5; vacío = no pregunta), `instagram` (`losperrines_`).
- **Entrega**: el dueño no tiene contrato con Andreani (hace falta ~200 envíos/mes), así que no hay API de seguimiento. A los `consulta_entrega_dias` del despacho, `tareaHoraria` le manda al cliente "¿Ya te llegó?" con dos links firmados (`?entrega=ID&r=si|problema&t=firma`). El link abre una página con un botón de confirmar (`ok=1`) para que los antivirus de correo que abren links solos no marquen nada. "Sí" → entregado + mail de gracias pidiendo foto de la mascota en el auto + Instagram. "Problema" (con detalle opcional) → `problema_el`, nota y mail URGENTE al dueño; queda en rojo en En camino hasta "Problema resuelto".
- Avisos: reserva que vence en ≤ 12 h (amarillo) o ya vencida (rojo); pagado hace ≥ `alerta_despacho_dias` sin salir (rojo); exportado hace > 1 día sin seguimiento (amarillo); problema de entrega (rojo); despachado hace ≥ `consulta_entrega_dias` + 2 días sin confirmar (amarillo).
- Acciones: `pagadoLote`, `preparado` (con `valor:false` vuelve atrás), `despacharLote`, `exportar` con `ids` (sin ids exporta todos los pagados, como Envíos), `entregado` (lote; `valor:false` vuelve a En camino), `problemaResuelto`, `resumenAhora`. Los lotes devuelven `{hechos, errores}`.
- Resumen diario: lo manda `tareaHoraria` (una vez por día, la primera corrida desde `resumen_hora`, o sea entre las 20 y las 21). "Nuevo" = desde el último resumen automático (propiedad `resumen_ultimo`).

## Siguientes pasos posibles

- Confirmar transferencias automáticamente consultando Mercado Pago; que el cliente suba el comprobante en la web; etiquetas de Andreani por API (requiere credenciales de Andreani); atención por WhatsApp con IA (requiere WhatsApp Business API).

## Otros pendientes

- Web: fotos reales del producto (si no hay fotos subidas muestra una ilustración); que las medidas publicadas salgan de la ficha del producto (hoy están desparejas); arreglos en celular (barra fija que tapa contenido, botón de WhatsApp encima del texto, "Ver productos" repetido, página muy larga).
- Antes de abrir: compra de prueba de punta a punta (transferencia y tarjeta), completar configuración (email de avisos, token de Mercado Pago, plantilla de Andreani), "dejar en cero".
- Datos del taller que el dueño tenía que revisar: forro de la individual (usaba un insumo archivado), tela tracker lisa cargada en "u" en vez de "m", medidas incompletas de la individual, cinta de la individual (2 m cargados vs 4 m según medidas), hebillas/deslizadores ("mínimo 100" pero envase de 150).
- Ideas ofrecidas: aviso cuando una receta usa un insumo archivado; catálogo de productos para Instagram/Facebook.
