# Los Perrines · notas para Claude

Tienda online de fundas tipo canasto para mascotas (asiento trasero del auto), hecha en San Luis.
Dueño: no es programador. **Hablale en español rioplatense, simple, paso a paso, sin jerga técnica**;
muchas veces trabaja desde el celular. Explicá el "por qué" con ejemplos y números concretos.
El repositorio es **público**: no escribas acá datos sensibles (costos, márgenes, datos de clientes, claves).

> **Detalle completo** de cada cambio, decisión y medida (hasta el 16/11/2026): `NOTAS-HISTORIA.md`. No se carga solo: buscá ahí (grep) cuando necesites el porqué o el nombre exacto de algo. Este archivo es el resumen: mantenelo corto (el dueño pidió cuidar el contexto) y actualizalo **una vez al final de cada tema**, no en cada cambio.

## Cómo está armado

| Archivo | Qué es |
|---|---|
| `index.html` | La tienda (GitHub Pages, `www.losperrines.com.ar`). Tarda unos minutos en publicarse; si el dueño ve algo viejo, que recargue. |
| `admin.html` + `admin-*.js` | Panel. `admin-core.js` (núcleo, Ventas, Tienda, Recuperar ventas y Códigos de descuento; expone `window.LP`), `admin-hoy.js` (Hoy), `admin-venta.js` (Nueva venta y **Vendedores**), `admin-taller.js` (Taller, Precios y rentabilidad; define `window.PANEL_VERSION`), `admin-publicidad.js`, `admin-tablero.js`. |
| `Codigo.gs` | Backend en Google Apps Script sobre una planilla. Se instala con el botón del panel (ver abajo). |
| `corte.html` | Plano de corte y ficha para la costurera. |
| `ig/`, `pet/`, `fb/`, `wa/` | Links cortos con utm (Instagram bio, veterinarias, Marketplace/Facebook, WhatsApp). |
| `vendedores-mensajes.md` | Mensajes de WhatsApp para invitar vendedores. |
| `privacidad/` | Política de privacidad (la pidió Google). |
| `dev/` | Emulador de Apps Script, pruebas y helpers de Playwright; `dev/instagram/` placas (lanzamiento, semana, **vendedor.js**); `dev/video/` scripts ffmpeg de Reels. |
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
- **Códigos de descuento:** solo con transferencia, una vez por cliente (opcional). Pueden ser **% o monto fijo en $ por funda** (columna `monto` de Cupones; manda sobre el %).
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

## La web hoy (16/11)

- **Precios:** Canasto de 2 plazas **$83.000 tarjeta / $75.000 transferencia**; Canasto de 1 plaza **$61.000 / $55.000**; 3 cuotas; envío cargado ~$13.000 ("te ahorrás"). 1 plaza sin stock.
- **Celular, primera pantalla** (todo entra sin bajar en su celular): foto de portada 16:10 (recorte calibrado a la foto de los dos perros), título en 2 renglones, píldoras **💧 Impermeable · 🛋️ Acolchada · 💪 Antidesgarro**, tarjetas de precio (precio por transferencia grande, 10% OFF arriba a la derecha, circulito con flecha) y franja de envío con logo de Andreani + "Llega entre mié… y vie…".
- **Tarjeta de cada funda en el celular** (al tocar el precio): entra en una pantalla con COMPRAR a la vista; cartel 💧 IMPERMEABLE sobre la foto; garantías debajo del botón, fuera de la pantalla. Recuadro de envío: "🚚 ENVÍO GRATIS / Llega entre… / Te ahorrás $X" (sin "A todo el país por Andreani").
- **Cuándo llega:** "Llega entre el X y el Y" = 2 a 4 días hábiles desde el día siguiente, **corte a las 17 h**, saltea fines de semana y `FERIADOS` (en `index.html`; **agregar los de 2027 trasladables y puentes** cuando salgan).
- En la compu casi nada cambió. Detalle de clases y medidas: NOTAS-HISTORIA.md.

## Estado y pendientes (actualizar al cerrar cada tema)

- **Instalado:** `Codigo.gs` **16/11/2026 · 3** (pantalla Vendedores y pagos; el dueño confirmó el 16/11 que anda). Panel **16/11 · 6**. Listo para arrancar con vendedores.
- **Vendedores:** EMILIANO creado ($2.000 por funda). Mensajes en `vendedores-mensajes.md` (comisión $2.000; **EMILIANO hay que recrearlo con comisión 2000**) y placa `estado-en-blanco.png` (el vendedor escribe su código encima). Para cada vendedor nuevo: crear código con mail y comisión.
- **Susana (16/11):** las 6 de 1 plaza salieron **mal**; dejó de trabajar y el dueño retiró el material de las 15 dobles. **Decidió no pagarle** (tema cerrado) y usar esa plata para **arreglar las 6**. Pasos dados en el panel: editar la tanda a 8 dobles (libera el material de las 15) y dejar pendientes las 6 chicas; cuando estén arregladas, recibirlas con confección **$0** y cargar el arreglo como gasto del costurero nuevo. Cuenta saldada: los $80.000 adelantados pagaron justo las 8 dobles; no se le debe nada. El dueño **siempre paga contra entrega** (con Susana fue la excepción).
- **Costurero nuevo (16/11):** está haciendo **una funda de prueba**; después charlan precio y condiciones. Cuando arranque: cargarlo como proveedor y nueva tanda.
- **URGENTE sin respuesta:** la compra de prueba con tarjeta del 13/11 (LP-261113-002) quedó vencida sin pago: preguntar si pagó (si pagó, el webhook de Mercado Pago no llega).
- **Planilla al 15/11:** 0 ventas web reales. Conclusión dada: primero **confianza** (fotos reales, opiniones) antes de más anuncios.
- **Pendientes del dueño:** subir fotos reales (panel → Fotos y videos); actualizar precio en Marketplace y plantillas; revisar valor del envío vs Andreani; "Ventas con tarjeta" a 50%; comisión real de Mercado Pago; confirmar si Analytics dejó de dar "Exhausted"; margen de costura en 1; renovar dominio en nic.ar si es el de la tienda; pagar compras del 8/11 a Casa Natalia.
- **Anuncio:** Reel promocionado (terminaba ~19/11, $20.000): pedirle resultados.
- **Ofrecido y sin hacer:** página personal del vendedor; botón "Compartir por WhatsApp" en la web; "precio de lanzamiento hasta el 30/11"; plan para las primeras 36 ventas; botón "Corregir precio" de ventas por fuera; sección "Perrines viajando"; perfil de Google Maps.
- **Material:** fotos en Google Drive, carpeta **FOTOS REDES** (no van al repo). Canva conectado (lo que había es de Deco-Tools: no usar). Gmail conectado: nunca mandar mails sin su OK.
- **Competencia:** fundas hamaca importadas en Mercado Libre (~$44.000, Lubbi). Estrategia: no competir por precio; canasto cerrado, hecho en San Luis, atención directa. No afirmar cosas de la competencia que no sean ciertas para todas; no inventar precios tachados.
