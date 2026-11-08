/* Los Perrines · Panel · Tablero
 * Lo que sirve para decidir, en una sola pantalla: ventas y ganancia reales (planilla), cuánto dura el stock,
 * cuántas transferencias se pagan, anuncios (Meta) y tráfico (Google Analytics). Arriba, "Qué mirar":
 * conclusiones escritas a partir de esos números. Backend: acción `tablero` en Codigo.gs.
 */
(function () {
"use strict";
const L = window.LP, esc = L.esc, money = L.money;
const TB = {dias: 7, datos: {}, cargando: false, forzar: false};
const n0 = v => new Intl.NumberFormat("es-AR").format(Math.round(v || 0));
const pc = (a, b) => b > 0 ? a / b * 100 : 0;
const pcTxt = v => String(Math.round(v * 10) / 10).replace(".", ",") + "%";
const CANAL = {"Direct": "Directo (dirección o link guardado)", "Organic Social": "Redes sin anuncio (Instagram, Facebook)", "Paid Social": "Anuncios en redes",
  "Organic Search": "Búsqueda en Google", "Paid Search": "Anuncios en Google", "Referral": "Otros sitios", "Email": "Mail", "Organic Video": "Videos", "Unassigned": "Sin identificar", "(other)": "Otros"};
const DISP = {mobile: "Celular", desktop: "Computadora", tablet: "Tablet"};

function cargar() {
  if (TB.cargando || TB.datos[TB.dias]) return;
  const forzar = TB.forzar; TB.cargando = true; TB.forzar = false;
  L.api("tablero", {dias: TB.dias, forzar: forzar}).then(r => { TB.datos[r.dias] = r; })
    .catch(e => { TB.datos[TB.dias] = {error: /desconocida/i.test(e.message) ? "backend" : e.message}; })
    .then(() => { TB.cargando = false; L.render(); });
}
function delta(a, b) {
  if (!b) return a ? '<span class="pos">nuevo</span>' : '<span class="muted">igual</span>';
  const d = (a - b) / b * 100;
  if (Math.abs(d) < 1) return '<span class="muted">igual</span>';
  return '<span class="' + (d > 0 ? "pos" : "neg") + '">' + (d > 0 ? "▲ " : "▼ ") + pcTxt(Math.abs(d)) + '</span>';
}
function lista(items, total, nombre) {
  if (!items || !items.length) return '<p class="muted small" style="margin:0">Sin datos todavía.</p>';
  return '<div class="embudo">' + items.map(x => '<div class="paso"><span>' + esc(nombre(x.nombre)) + '</span><div class="barra"><i style="width:' + Math.max(1, pc(x.sesiones, total)) + '%"></i></div><b>' + pcTxt(pc(x.sesiones, total)) + '</b></div>').join("") + '</div>';
}
function conclusiones(d, ctx) {
  const out = [], v = d.ventas, a = d.anterior, g = d.ga && d.ga.total ? d.ga : null, per = TB.dias === 1 ? "hoy" : "en estos " + TB.dias + " días";
  Object.keys(d.stock || {}).forEach(id => { const s = d.stock[id];
    if (s.disponible <= 0) out.push(["bad", "No hay stock de " + s.nombre + ": en la web aparece “Avisame cuando vuelva”. Recibí la próxima tanda o cargá las fundas en Stock."]);
    else if (s.dias != null && s.dias < 14) out.push([s.dias < 7 ? "bad" : "warn", "De " + s.nombre + " quedan " + s.disponible + ": al ritmo del último mes alcanzan para unos " + s.dias + " días. Planificá la próxima tanda ya."]); });
  if (v.pedidos || a.pedidos) {
    if (v.pedidos > a.pedidos) out.push(["ok", "Vendiste " + v.pedidos + " " + per + ", " + (v.pedidos - a.pedidos) + " más que en el período anterior."]);
    else if (v.pedidos < a.pedidos) out.push(["warn", "Vendiste " + v.pedidos + " " + per + ", " + (a.pedidos - v.pedidos) + " menos que en el período anterior."]);
  } else out.push(["info", "Todavía no hay ventas " + per + "."]);
  if (ctx.queda != null && v.pedidos && ctx.queda < 0) out.push(["bad", "En este período perdiste plata: lo invertido en anuncios supera lo que dejaron las ventas."]);
  if (d.meta && d.meta.inversion && v.pedidos && ctx.gan > 0) { const cpv = d.meta.inversion / v.pedidos;
    out.push(cpv < ctx.gan ? ["ok", "Cada venta te costó " + money(cpv) + " de anuncios y una funda te deja " + money(ctx.gan) + ": los anuncios rinden."] : ["bad", "Cada venta te costó " + money(cpv) + " de anuncios, más de lo que te deja una funda (" + money(ctx.gan) + "): revisá las campañas en Publicidad."]); }
  const R = d.reservas; if (R.total >= 3 && R.pagadas / R.total < 0.6) out.push(["warn", "De " + R.total + " compras por transferencia se pagaron " + R.pagadas + ". Escribiles por WhatsApp desde Hoy apenas reservan: es plata que se pierde."]);
  if (g) {
    const ses = g.total.actual.sesiones;
    if (ses >= 100) { const conv = pc(v.pedidos, ses);
      if (conv < 0.5) out.push(["warn", "De cada 100 visitas compra menos de 1 (" + pcTxt(conv) + "). Revisá fotos, precio y medidas en la web."]);
      else out.push(["ok", "De cada 100 visitas compran " + String(Math.round(conv * 10) / 10).replace(".", ",") + ": está muy bien para una tienda online (lo común es 1 a 2)."]); }
    const top = (g.canales || [])[0]; if (top && ses >= 30) out.push(["info", "La mayoría llega por " + (CANAL[top.nombre] || top.nombre).split(" (")[0].toLowerCase() + " (" + pcTxt(pc(top.sesiones, ses)) + " de las visitas)."]);
    const cel = (g.dispositivos || []).find(x => x.nombre === "mobile"); if (cel && ses >= 30 && pc(cel.sesiones, ses) >= 75) out.push(["info", "El " + pcTxt(pc(cel.sesiones, ses)) + " entra desde el celular: lo que más importa es cómo se ve la web en el teléfono."]);
  }
  return out;
}
function setupGA(f) {
  return '<div class="block"><h3>Conectar Google Analytics</h3>'
    + (f === "servicio" ? '<div class="note warn" style="margin-top:0">Falta agregar el servicio de Analytics en Apps Script (paso 2).</div>' : f && f !== "propiedad" ? '<div class="note bad" style="margin-top:0">' + esc(f) + '</div>' : '')
    + '<p class="muted small" style="margin:0 0 6px">Para ver acá de dónde viene la gente, desde qué aparato y en qué paso abandona. Se hace una sola vez:</p><ol style="margin:0;padding-left:20px;line-height:1.6">'
    + '<li>En <b>analytics.google.com</b> tocá el engranaje <b>Administrar</b> (abajo a la izquierda) → <b>Detalles de la propiedad</b>. Copiá el <b>ID de propiedad</b> (solo números, por ejemplo 471234567; no es el que empieza con G-).</li>'
    + '<li>En <b>Apps Script</b>, a la izquierda, al lado de <b>Servicios</b> tocá el <b>+</b> → buscá <b>Google Analytics Data API</b> → <b>Agregar</b>.</li>'
    + '<li>Ejecutá <b>instalar</b>: Google te va a pedir permiso para leer Analytics → aceptá. Después <b>Implementar → Administrar implementaciones → Editar → Nueva versión</b>.</li>'
    + '<li>Pegá el ID en <button class="linkb" data-go="config">Configuración → Medición (Google Analytics)</button>, guardá y volvé acá.</li></ol></div>';
}
function vTablero() {
  cargar();
  const d = TB.datos[TB.dias], T = window.TALLER;
  let h = '<div class="ph"><div><h2>Tablero</h2><p class="sub">Lo que importa para decidir, en una sola pantalla: ventas, ganancia, stock, anuncios y visitas.</p></div>'
    + '<button class="btn ghost sm" data-a="tbRecargar">↻ Actualizar</button></div>'
    + '<div class="filters">' + [[1, "Hoy"], [7, "Últimos 7 días"], [30, "Últimos 30 días"]].map(x => '<button class="chip" data-a="tbDias" data-d="' + x[0] + '" aria-pressed="' + (TB.dias === x[0]) + '">' + x[1] + '</button>').join("") + '</div>';
  if (!d) return h + '<p class="muted"><span class="spinner"></span> Juntando los números…</p>';
  if (d.error === "backend") return h + '<div class="note bad"><b>Falta actualizar el backend.</b> Pegá el nuevo <code>Codigo.gs</code> en Apps Script y publicá una nueva versión. Después tocá ↻.</div>';
  if (d.error) return h + '<div class="note bad">' + esc(d.error) + '</div>';
  const v = d.ventas, a = d.anterior, inv = d.meta && d.meta.inversion || 0, g = d.ga && d.ga.total ? d.ga : null;
  const costoU = id => (T && T.costoFunda ? T.costoFunda(id) : 0), gan = T && T.gananciaFunda ? T.gananciaFunda("doble") : 0;
  const hayCostos = costoU("doble") > 0, queda = hayCostos ? v.neto - v.porProducto.doble * costoU("doble") - v.porProducto.individual * costoU("individual") - inv : null;
  const C = conclusiones(d, {gan: gan, queda: queda}), compTxt = TB.dias === 1 ? "vs ayer" : "vs los " + TB.dias + " días anteriores";
  h += '<div class="block" style="margin-top:0"><h3>Qué mirar</h3><ul class="todo">' + C.map(x => '<li class="' + x[0] + '"><span>' + esc(x[1]) + '</span></li>').join("") + '</ul></div>';
  h += '<h3 style="margin:18px 0 0">La plata</h3><div class="cards">'
    + '<div class="kpi"><small>Ventas</small><b>' + v.pedidos + '</b><span class="k2">' + v.unidades + ' funda' + (v.unidades === 1 ? "" : "s") + ' · ' + delta(v.pedidos, a.pedidos) + ' ' + compTxt + '</span></div>'
    + '<div class="kpi"><small>Cobrado</small><b>' + money(v.facturado) + '</b><span class="k2">' + delta(v.facturado, a.facturado) + ' · ' + v.tarjeta + ' tarjeta, ' + v.transferencia + ' transf.</span></div>'
    + '<div class="kpi' + (queda == null || !v.pedidos ? "" : queda >= 0 ? " ok" : " bad") + '"><small>Te quedó</small><b>' + (queda == null ? "—" : money(queda)) + '</b><span class="k2">' + (queda == null ? "faltan costos del taller" : "después de comisión, fundas" + (inv ? " y " + money(inv) + " de anuncios" : "")) + '</span></div>'
    + '<div class="kpi"><small>Venta promedio</small><b>' + (v.pedidos ? money(v.facturado / v.pedidos) : "—") + '</b><span class="k2">por pedido</span></div></div>';
  const S = d.stock || {};
  h += '<div class="cols2" style="margin-top:14px"><div class="block"><h3>¿Hasta cuándo te alcanza el stock?</h3><p class="muted small" style="margin:-4px 0 10px">Al ritmo de ventas de los últimos 30 días.</p>'
    + Object.keys(S).map(id => { const s = S[id], cl = s.disponible <= 0 ? "bad" : s.dias == null ? "mute" : s.dias < 7 ? "bad" : s.dias != null && s.dias < 14 ? "warn" : "ok";
      return '<div class="cfg-row" style="display:flex;justify-content:space-between;gap:10px;align-items:center"><span><b>' + esc(s.nombre) + '</b><br><span class="muted small">' + s.disponible + ' disponibles · ' + (s.porDia ? String(s.porDia).replace(".", ",") + ' por día' : 'sin ventas en 30 días') + '</span></span><span class="pill ' + cl + '">' + (s.disponible <= 0 ? "Sin stock" : s.dias == null ? "—" : "~" + s.dias + " días") + '</span></div>'; }).join("") + '</div>'
    + '<div class="block"><h3>Compras por transferencia</h3><p class="muted small" style="margin:-4px 0 10px">De las que se hicieron en este período, cuántas se pagaron.</p>'
    + (d.reservas.total ? '<div style="font-size:1.6rem;font-weight:800">' + d.reservas.pagadas + ' de ' + d.reservas.total + ' <span class="muted" style="font-size:1rem;font-weight:600">(' + pcTxt(pc(d.reservas.pagadas, d.reservas.total)) + ')</span></div><p class="muted small" style="margin:6px 0 0">' + d.reservas.esperando + ' esperando pago · ' + d.reservas.vencidas + ' vencidas o canceladas</p>' : '<p class="muted" style="margin:0">Ninguna en este período.</p>')
    + '</div></div>';
  h += '<h3 style="margin:18px 0 0">Las visitas <span class="muted small" style="font-weight:600">· Google Analytics</span></h3>';
  if (!g) h += setupGA(d.ga && (d.ga.falta || d.ga.error));
  else {
    const t = g.total.actual, tp = g.total.anterior, ev = g.eventos || {};
    h += '<div class="cards">'
      + '<div class="kpi"><small>Visitas</small><b>' + n0(t.sesiones) + '</b><span class="k2">' + delta(t.sesiones, tp.sesiones) + ' ' + compTxt + '</span></div>'
      + '<div class="kpi"><small>Personas</small><b>' + n0(t.personas) + '</b><span class="k2">' + n0(t.nuevas) + ' nuevas</span></div>'
      + '<div class="kpi"><small>De cada 100 visitas compran</small><b>' + (t.sesiones ? String(Math.round(pc(v.pedidos, t.sesiones) * 10) / 10).replace(".", ",") : "—") + '</b><span class="k2">lo común: 1 a 2</span></div>'
      + '<div class="kpi"><small>Agregaron al carrito</small><b>' + n0(ev.add_to_cart) + '</b><span class="k2">' + (t.sesiones ? pcTxt(pc(ev.add_to_cart || 0, t.sesiones)) + ' de las visitas' : "") + '</span></div></div>';
    const P = [["Entraron a la web", t.sesiones], ["Vieron las fundas", ev.view_item_list || 0], ["Agregaron al carrito", ev.add_to_cart || 0], ["Empezaron a comprar", ev.begin_checkout || 0], ["Compraron (planilla)", v.pedidos]].filter((x, i) => i !== 1 || x[1] > 0);
    let peor = -1, caida = -1; P.forEach((x, i) => { if (i && P[i - 1][1] > 0) { const c = 1 - x[1] / P[i - 1][1]; if (c > caida) { caida = c; peor = i; } } });
    h += '<div class="block"><h3>Dónde abandona la gente</h3><p class="muted small" style="margin:-4px 0 10px">Todas las visitas, vengan de donde vengan. En naranja, el paso donde más se pierde.</p><div class="embudo">'
      + P.map((x, i) => '<div class="paso' + (i === peor ? " peor" : "") + '"><span>' + esc(x[0]) + '</span><div class="barra"><i style="width:' + Math.max(1, pc(x[1], P[0][1] || 1)) + '%"></i></div><b>' + n0(x[1]) + (i && P[i - 1][1] ? ' <span class="muted small">(' + pcTxt(pc(x[1], P[i - 1][1])) + ')</span>' : "") + '</b></div>').join("") + '</div></div>';
    h += '<div class="cols2" style="margin-top:14px"><div class="block"><h3>¿De dónde llegan?</h3>' + lista(g.canales, t.sesiones, x => CANAL[x] || x) + '</div>'
      + '<div class="block"><h3>¿Desde qué aparato?</h3>' + lista(g.dispositivos, t.sesiones, x => DISP[x] || x)
      + '<h3 style="margin-top:16px">¿Desde dónde?</h3>' + lista(g.regiones, t.sesiones, x => String(x).replace(/ Province$/, "").replace("(not set)", "Sin identificar")) + '</div></div>';
  }
  h += '<h3 style="margin:18px 0 0">Los anuncios <span class="muted small" style="font-weight:600">· Meta</span></h3>'
    + '<div class="block" style="margin-top:10px">' + (d.meta && d.meta.inversion != null && !d.meta.falta
      ? '<div style="display:flex;gap:24px;flex-wrap:wrap"><span><span class="muted small">Invertido</span><br><b style="font-size:1.3rem">' + money(inv) + '</b></span><span><span class="muted small">Costo por venta</span><br><b style="font-size:1.3rem">' + (inv && v.pedidos ? money(inv / v.pedidos) : "—") + '</b></span><span><span class="muted small">Tocaron el anuncio</span><br><b style="font-size:1.3rem">' + n0(d.meta.clics) + '</b></span></div>'
      : '<p class="muted" style="margin:0">' + (d.meta && d.meta.falta === "token" ? "Falta conectar Meta." : "Sin datos de anuncios en este período.") + '</p>')
    + '<p style="margin:10px 0 0"><button class="linkb" data-go="publicidad">Ver el detalle por campaña en Publicidad →</button></p></div>';
  h += '<p class="muted small" style="margin:14px 0 0">Período: ' + esc(d.periodo.since.split("-").reverse().join("/") + " al " + d.periodo.until.split("-").reverse().join("/")) + '. Ventas y stock, al momento; Meta se actualiza cada 10 minutos y Google Analytics cada 30 (y Google tarda unas horas en procesar las visitas).</p>';
  return h;
}
L.CLICK.tbDias = t => { TB.dias = +t.dataset.d; L.render(); };
L.CLICK.tbRecargar = () => { delete TB.datos[TB.dias]; TB.forzar = true; L.render(); };
L.vista("tablero", "Números", "Tablero", vTablero, null, "rentabilidad");
})();
