/* Los Perrines · Panel · Publicidad
 * Lo que invertís en anuncios de Meta contra lo que vendés de verdad y lo que te queda.
 * Meta no conoce tus costos: la ganancia sale de las ventas reales de la planilla y del costo
 * por funda de Precios y rentabilidad (admin-taller.js → TALLER.costoFunda / gananciaFunda).
 */
(function () {
"use strict";
const L = window.LP, S = L.S, esc = L.esc, money = L.money;
const PUB = {dias: 7, datos: {}, cargando: false, forzar: false};

function cargar() {
  if (PUB.cargando || PUB.datos[PUB.dias]) return;
  const forzar = PUB.forzar; PUB.cargando = true; PUB.forzar = false;
  L.api("publicidad", {dias: PUB.dias, forzar: !!forzar}).then(r => { PUB.datos[r.dias] = r; })
    .catch(e => { PUB.datos[PUB.dias] = {error: /desconocida/i.test(e.message) ? "backend" : e.message}; })
    .then(() => { PUB.cargando = false; L.render(); });
}
const pct = (a, b) => b > 0 ? Math.round(a / b * 1000) / 10 : 0;
const n0 = v => new Intl.NumberFormat("es-AR").format(Math.round(v || 0));

function pasos() {
  return '<ol style="margin:6px 0 0;padding-left:20px;line-height:1.6">'
    + '<li>Entrá a <b>business.facebook.com/settings</b> → <b>Usuarios → Usuarios del sistema</b> → <b>Agregar</b>. Nombre: “Panel Los Perrines”, rol <b>Empleado</b>.</li>'
    + '<li>Con ese usuario elegido tocá <b>Asignar activos</b> → <b>Cuentas publicitarias</b> → elegí tu cuenta → marcá <b>Ver rendimiento</b> → Guardar.</li>'
    + '<li>Tocá <b>Generar token</b>: elegí la app que aparezca, vencimiento <b>Nunca</b> y marcá el permiso <b>ads_read</b>. Copiá el token (Meta lo muestra una sola vez).</li>'
    + '<li>En Apps Script → ⚙️ <b>Configuración del proyecto</b> → <b>Propiedades del script</b> → agregá <code>META_ADS_TOKEN</code> con ese valor. <b>No lo pegues en el chat ni en la planilla.</b></li>'
    + '<li>Volvé acá y tocá ↻.</li></ol>';
}
function veredicto(c, gan) {
  if (c.inversion <= 0) return ["mute", "Sin gasto"];
  if (!c.compras) return c.inversion > gan && gan > 0 ? ["bad", "Gastó sin vender: apagala o cambiala"] : ["mute", "Todavía sin ventas"];
  const cpv = c.inversion / c.compras;
  if (gan > 0 && cpv >= gan) return ["bad", "Pierde plata"];
  if (gan > 0 && cpv >= gan * 0.6) return ["warn", "Deja poco: ajustala"];
  return ["ok", "Anda bien: seguí"];
}
function consejos(c) {
  const t = [];
  if (c.frecuencia >= 3.5) t.push("La gente ya la vio " + String(c.frecuencia).replace(".", ",") + " veces: cambiá la imagen o el texto.");
  if (c.impresiones >= 1000 && c.ctr > 0 && c.ctr < 1) t.push("Pocos la tocan (" + String(c.ctr).replace(".", ",") + "%): el anuncio no engancha.");
  return t;
}
function embudo(m) {
  const P = [["Tocaron el anuncio", m.clics], ["Llegaron a la web", m.visitas || 0], ["Agregaron al carrito", m.carrito], ["Iniciaron el pago", m.pago], ["Compraron", m.compras]].filter((x, i) => i !== 1 || x[1] > 0);
  const base = P[0][1] || 0;
  if (!base) return '<p class="muted small" style="margin:0">Cuando tus anuncios tengan clics, acá vas a ver en qué paso se pierde la gente.</p>';
  let peor = -1, peorCaida = -1;
  P.forEach((x, i) => { if (i && P[i - 1][1] > 0) { const caida = 1 - x[1] / P[i - 1][1]; if (caida > peorCaida) { peorCaida = caida; peor = i; } } });
  const diag = peor < 0 ? "" : ({"Llegaron a la web": "Muchos tocan pero no llegan a ver la página: puede ser que tarde en cargar en el celular.",
    "Agregaron al carrito": "Llegan a la web pero no agregan al carrito: el anuncio atrae a quien no corresponde, o la página no convence (fotos, precio, medidas).",
    "Iniciaron el pago": "Agregan al carrito pero no avanzan: revisá que el carrito sea claro y que el envío gratis se vea bien.",
    "Compraron": "Empiezan a pagar pero no terminan: puede ser el medio de pago, desconfianza o que esperan la transferencia."})[P[peor][0]] || "";
  return '<div class="embudo">' + P.map((x, i) => '<div class="paso' + (i === peor ? " peor" : "") + '"><span>' + esc(x[0]) + '</span><div class="barra"><i style="width:' + Math.max(1, pct(x[1], base)) + '%"></i></div><b>' + n0(x[1])
    + (i ? ' <span class="muted small">(' + String(pct(x[1], P[i - 1][1])).replace(".", ",") + '%)</span>' : "") + '</b></div>').join("") + '</div>'
    + (diag && P[peor][1] < P[peor - 1][1] ? '<div class="note warn">' + esc(diag) + '</div>' : "");
}
function vPublicidad() {
  cargar();
  const d = PUB.datos[PUB.dias], T = window.TALLER;
  let h = '<div class="ph"><div><h2>Publicidad</h2><p class="sub">Lo que invertís en anuncios de Meta contra lo que vendés de verdad y lo que te queda en el bolsillo.</p></div>'
    + '<button class="btn ghost sm" data-a="pubRecargar" aria-label="Actualizar datos de Meta">↻ Actualizar</button></div>'
    + '<div class="filters">' + [[1, "Hoy"], [7, "Últimos 7 días"], [30, "Últimos 30 días"]].map(x => '<button class="chip" data-a="pubDias" data-d="' + x[0] + '" aria-pressed="' + (PUB.dias === x[0]) + '">' + x[1] + '</button>').join("") + '</div>';
  if (!d) return h + '<p class="muted"><span class="spinner"></span> Consultando a Meta…</p>';
  if (d.error === "backend") return h + '<div class="note bad"><b>Falta actualizar el backend.</b> Pegá el nuevo <code>Codigo.gs</code> en Apps Script y publicá una nueva versión. Después tocá ↻.</div>';
  if (d.error) return h + '<div class="note bad">' + esc(d.error) + '</div>';
  const m = d.meta || {}, v = d.ventas || {pedidos: 0, facturado: 0, neto: 0, unidades: {}};
  const costoU = id => (T && T.costoFunda ? T.costoFunda(id) : 0), gan = T && T.gananciaFunda ? T.gananciaFunda("doble") : 0;
  const costoVentas = (v.unidades.doble || 0) * costoU("doble") + (v.unidades.individual || 0) * costoU("individual"), hayCostos = !!(T && costoU("doble") > 0);
  // configuración pendiente
  if (m.falta || (m.error && /permiso/i.test(m.error))) {
    h += '<div class="block" style="margin-top:0"><h3>Conectar los resultados de Meta</h3>'
      + (m.error ? '<div class="note warn" style="margin-top:0">' + esc(m.error) + '</div>' : m.falta === "cuenta" ? '<div class="note warn" style="margin-top:0">Falta el número de la cuenta publicitaria en <button class="linkb" data-go="config">Configuración → Medición (Meta)</button>.</div>' : '')
      + '<p class="muted small" style="margin:8px 0 0">El token que ya cargaste sirve para <b>mandarle</b> las ventas a Meta. Para <b>leer</b> cuánto gastaste y qué trajo cada anuncio hace falta otro, con permiso de lectura. Se saca una sola vez:</p>' + pasos() + '</div>';
  } else if (m.error) {
    h += '<div class="note bad" style="margin-top:0">Meta respondió: ' + esc(m.error) + '</div>';
  }
  const t = m.total || {inversion: 0, compras: 0, facturado: 0, clics: 0, carrito: 0, pago: 0, impresiones: 0};
  const inv = t.inversion || 0, cpv = v.pedidos ? inv / v.pedidos : 0, queda = v.neto - costoVentas - inv;
  h += '<div class="cards" style="margin-top:' + (m.total ? "0" : "14px") + '">'
    + '<div class="kpi"><small>Invertido en anuncios</small><b>' + money(inv) + '</b><span class="k2">' + (m.total ? n0(t.impresiones) + ' veces que se vio' : "sin datos de Meta") + '</span></div>'
    + '<div class="kpi"><small>Ventas reales</small><b>' + v.pedidos + '</b><span class="k2">' + money(v.facturado) + ' cobrado (planilla)</span></div>'
    + '<div class="kpi' + (inv && v.pedidos && gan > 0 ? (cpv < gan ? " ok" : " bad") : "") + '"><small>Costo por venta</small><b>' + (inv && v.pedidos ? money(cpv) : "—") + '</b><span class="k2">' + (gan > 0 ? 'cada funda te deja ' + money(gan) + ' antes de anuncios' : "cargá costos en el taller") + '</span></div>'
    + '<div class="kpi' + (hayCostos && v.pedidos ? (queda >= 0 ? " ok" : " bad") : "") + '"><small>Te quedó después de anuncios</small><b>' + (hayCostos ? money(queda) : "—") + '</b><span class="k2">' + (hayCostos ? 'cobrado − comisión − fundas − anuncios' : "faltan costos del taller") + '</span></div></div>';
  h += '<div class="block"><h3>La regla de oro</h3><p style="margin:0">Mientras <b>conseguir una venta te cueste menos de lo que te deja una funda</b>' + (gan > 0 ? ' (hoy ' + money(gan) + ', según Precios y rentabilidad)' : '') + ', los anuncios te hacen ganar plata. Si cuesta más, cada venta te hace perder, aunque Meta muestre “muchos resultados”.</p>'
    + (m.total && t.compras ? '<p class="muted small" style="margin:8px 0 0">Meta se atribuye <b>' + t.compras + '</b> compra' + (t.compras === 1 ? "" : "s") + ' por ' + money(t.facturado) + (inv ? ' (devuelve ' + String(Math.round(t.facturado / inv * 10) / 10).replace(".", ",") + ' pesos por cada peso invertido)' : "") + '. Puede no coincidir con tus ventas reales: Meta cuenta solo las de gente que vio un anuncio, y las ventas reales incluyen las que llegaron solas (Instagram, boca en boca).</p>' : "")
    + '</div>';
  if (m.total) {
    h += '<div class="block"><h3>Dónde se pierde la gente</h3><p class="muted small" style="margin:-4px 0 10px">De la gente que llegó por los anuncios. El % es sobre el paso anterior; en naranja, el paso donde más se cae.</p>' + embudo(t) + '</div>';
    const C = m.campanas || [];
    h += '<div class="block"><h3>Campañas</h3>' + (!C.length ? '<p class="muted" style="margin:0">Todavía no hay anuncios en este período. Cuando arranques una campaña en el Administrador de anuncios, acá vas a ver cuánto gastó cada una, cuántas ventas trajo y si conviene seguir, ajustar o apagar.</p>'
      : '<div class="tw"><table><thead><tr><th>Campaña</th><th class="n">Invertido</th><th class="n">Compras</th><th class="n">Costo por venta</th><th class="n">Toques</th><th class="n">Veces que la vio cada uno</th><th>¿Qué hago?</th></tr></thead><tbody>'
      + C.map(c => { const vv = veredicto(c, gan), tips = consejos(c); return '<tr><td><b>' + esc(c.nombre) + '</b>' + (tips.length ? '<br><span class="small" style="color:var(--warn)">' + tips.map(esc).join("<br>") + '</span>' : "") + '</td><td class="n">' + money(c.inversion) + '</td><td class="n">' + n0(c.compras) + '</td><td class="n">' + (c.compras ? money(c.inversion / c.compras) : "—") + '</td><td class="n">' + String(c.ctr).replace(".", ",") + '%</td><td class="n">' + String(c.frecuencia).replace(".", ",") + '</td><td><span class="pill ' + vv[0] + '">' + esc(vv[1]) + '</span></td></tr>'; }).join("")
      + '</tbody></table></div><p class="muted small" style="margin:10px 0 0"><b>Toques</b>: de cada 100 que vieron el anuncio, cuántos lo tocaron (menos de 1% = no engancha). <b>Veces que la vio cada uno</b>: más de 3,5 = la gente se cansa, cambiá la imagen.</p>')
      + '</div>';
  }
  h += '<p class="muted small" style="margin:14px 0 0">Período: ' + esc(m.periodo ? m.periodo.since.split("-").reverse().join("/") + " al " + m.periodo.until.split("-").reverse().join("/") : "") + '. Los datos de Meta se actualizan cada 10 minutos; las ventas, al momento.</p>';
  return h;
}
L.CLICK.pubDias = t => { PUB.dias = +t.dataset.d; L.render(); };
L.CLICK.pubRecargar = () => { delete PUB.datos[PUB.dias]; PUB.forzar = true; L.render(); };   // trae datos frescos de Meta, sin lo guardado
L.vista("publicidad", "Números", "Publicidad", vPublicidad);
})();
