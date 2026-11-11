/* Los Perrines · Panel · Tablero
 * Lo que sirve para decidir, en una sola pantalla: ventas y ganancia reales (planilla), cuánto dura el stock,
 * cuántas transferencias se pagan, anuncios (Meta) y tráfico (Google Analytics). Arriba, "Qué mirar":
 * conclusiones escritas a partir de esos números. Backend: acción `tablero` en Codigo.gs.
 */
(function () {
"use strict";
const web = v => v.pedidos - (v.fuera || 0);   // las vendidas en la web (las de afuera no pasaron por la página ni por un anuncio)
const L = window.LP, esc = L.esc, money = L.money;
const TB = {dias: 7, datos: {}, cargando: false, forzar: false, abiertos: {}};
const diasDe = k => k === "mes" ? new Date().getDate() : k;   // "Este mes" = los días que van del mes
const n0 = v => new Intl.NumberFormat("es-AR").format(Math.round(v || 0));
const pc = (a, b) => b > 0 ? a / b * 100 : 0;
const pcTxt = v => String(Math.round(v * 10) / 10).replace(".", ",") + "%";
const CANAL = {"Direct": "Directo (dirección o link guardado)", "Organic Social": "Redes sin anuncio (Instagram, Facebook)", "Paid Social": "Anuncios en redes",
  "Organic Search": "Búsqueda en Google", "Paid Search": "Anuncios en Google", "Referral": "Otros sitios", "Email": "Mail", "Organic Video": "Videos", "Unassigned": "Sin identificar", "(other)": "Otros"};
const DISP = {mobile: "Celular", desktop: "Computadora", tablet: "Tablet"};
const PAGO = /^(paid|cpc|ppc|ads?|paidsocial|paid_social|cpm)$/i;
function fuenteDe(f) {   // "l.instagram.com / referral" → "Instagram (sin anuncio)"; "ig / paid" → "Instagram (anuncio)"
  const s = String(f.fuente || "").toLowerCase(), m = String(f.medio || "").toLowerCase(), pago = PAGO.test(m);
  if (/instagram|^ig$/.test(s)) return pago ? "Instagram (anuncio)" : "Instagram (sin anuncio)";
  if (/facebook|^fb$|^an$|^msg$|messenger/.test(s)) return pago ? "Facebook (anuncio)" : "Facebook (sin anuncio)";
  if (/whatsapp|wa\.me/.test(s)) return "WhatsApp";
  if (/google/.test(s)) return pago ? "Google (anuncio)" : "Búsqueda en Google";
  if (s === "(direct)" || m === "(none)") return "Directo o WhatsApp (link guardado, escrito o compartido)";
  return "Otros sitios";
}
function fuentes(g) {
  if (!g.fuentes || !g.fuentes.length) return null;
  const o = {}; g.fuentes.forEach(f => { const k = fuenteDe(f); o[k] = (o[k] || 0) + f.sesiones; });
  return Object.keys(o).map(k => ({nombre: k, sesiones: o[k]})).sort((a, b) => b.sesiones - a.sesiones);
}
const PROV = {"capital federal": "Ciudad de Buenos Aires", "buenos aires": "Provincia de Buenos Aires", "cordoba": "Córdoba", "neuquen": "Neuquén", "rio negro": "Río Negro", "tucuman": "Tucumán", "entre rios": "Entre Ríos"};
function nombreProv(z) { return PROV[z.clave] || z.clave.replace(/(^|\s)\S/g, x => x.toUpperCase()); }
const ACENTOS = {"cordoba": "Córdoba", "neuquen": "Neuquén", "tucuman": "Tucumán", "rio cuarto": "Río Cuarto", "san martin": "San Martín", "san nicolas": "San Nicolás", "general roca": "General Roca"};
function nombreCiudad(x) { const s = String(x.nombre).toLowerCase(); return ACENTOS[s] || s.replace(/(^|\s)\S/g, c => c.toUpperCase()); }
function tablaZonas(lista, nombre, hayGA) {   // Ventas primero: es la columna que manda
  if (!lista.length) return '<p class="muted small" style="margin:0">Sin datos todavía.</p>';
  return '<div class="tw"><table><thead><tr><th>' + (nombre === nombreProv ? "Provincia" : "Ciudad") + '</th><th class="n">Ventas</th>' + (hayGA ? '<th class="n">Visitas</th><th class="n">% compra</th>' : '<th class="n">Cobrado</th>') + '</tr></thead><tbody>'
    + lista.map(z => { const conv = z.visitas >= 20 ? pc(z.ventas, z.visitas) : null;
      return '<tr><td>' + esc(nombre(z)) + '</td><td class="n"><b>' + z.ventas + '</b></td>'
        + (hayGA ? '<td class="n">' + n0(z.visitas) + '</td><td class="n">' + (conv == null ? '<span class="muted small">—</span>' : pcTxt(conv)) + '</td>' : '<td class="n">' + money(z.cobrado) + '</td>') + '</tr>'; }).join("")
    + '</tbody></table></div>';
}

function cargar() {
  if (TB.cargando || TB.datos[TB.dias]) return;
  const forzar = TB.forzar, k = TB.dias, pide = diasDe(k); TB.cargando = true; TB.forzar = false;
  L.api("tablero", {dias: pide, forzar: forzar}).then(r => { TB.datos[k] = r.dias === pide ? r : {error: "backendMes"}; })
    .catch(e => { TB.datos[k] = {error: /desconocida/i.test(e.message) ? "backend" : e.message}; })
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
// "Qué mirar": solo lo que pide hacer algo (lo que ya se ve en un número de abajo no se repite). Máximo 4, lo más urgente primero.
function conclusiones(d, ctx) {
  const out = [], v = d.ventas, g = d.ga && d.ga.total ? d.ga : null;
  Object.keys(d.stock || {}).forEach(id => { const s = d.stock[id];
    if (s.disponible <= 0) out.push(["bad", "No hay stock de " + s.nombre + ": en la web aparece “Avisame cuando vuelva”. Recibí la próxima tanda o cargá las fundas en Stock."]);
    else if (s.dias != null && s.dias < 14) out.push([s.dias < 7 ? "bad" : "warn", "De " + s.nombre + " quedan " + s.disponible + ": alcanzan para unos " + s.dias + " días. Planificá la próxima tanda ya."]); });
  if (ctx.queda != null && v.pedidos && ctx.queda < 0) out.push(["bad", "En este período perdiste plata: lo invertido en anuncios supera lo que dejaron las ventas."]);
  if (d.meta && d.meta.inversion && v.pedidos && ctx.gan > 0) { const cpv = d.meta.inversion / Math.max(1, web(v));
    if (cpv >= ctx.gan) out.push(["bad", "Cada venta te costó " + money(cpv) + " de anuncios, más de lo que te deja una funda (" + money(ctx.gan) + "): revisá las campañas en Publicidad."]); }
  const R = d.reservas; if (R.esperando > 0) out.push(["warn", R.esperando + (R.esperando === 1 ? " transferencia está esperando el pago" : " transferencias están esperando el pago") + ": escribiles por WhatsApp desde Hoy → Confirmar pago."]);
  if (g) {
    const ses = g.total.actual.sesiones, convT = pc(web(v), ses);
    if (ses >= 100 && convT < 0.5) out.push(["warn", "De cada 100 visitas compra menos de 1 (" + pcTxt(convT) + "). Revisá fotos, precio y medidas en la web."]);
    const Z = (d.zonas && d.zonas.provincias || []).filter(z => z.visitas >= 50);
    if (convT > 0) {
      const mejor = Z.filter(z => z.ventas >= 2).map(z => Object.assign({c: pc(z.ventas, z.visitas)}, z)).sort((a, b) => b.c - a.c)[0];
      if (mejor && mejor.c >= convT * 1.5) out.push(["ok", nombreProv(mejor) + " compra " + String(Math.round(mejor.c / convT * 10) / 10).replace(".", ",") + " veces más que el promedio: probá una campaña apuntada ahí."]);
    }
    const fria = Z.filter(z => z.visitas >= 100 && z.ventas === 0 && z.clave !== "capital federal").sort((a, b) => b.visitas - a.visitas)[0];
    if (fria) out.push(["warn", "De " + nombreProv(fria) + " entraron " + n0(fria.visitas) + " visitas y ninguna compró. Si tenés anuncios apuntados ahí, revisalos."]);
  }
  const orden = {bad: 0, warn: 1, ok: 2, info: 3};
  return out.sort((x, y) => orden[x[0]] - orden[y[0]]).slice(0, 4);
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
function plegable(id, titulo, cuerpo) {   // recuerda si estaba abierto al redibujar
  return '<details class="tb-pl" id="' + id + '"' + (TB.abiertos[id] ? " open" : "") + '><summary>' + titulo + '</summary><div class="tb-pl-in">' + cuerpo + '</div></details>';
}
function vTablero() {
  cargar();
  const d = TB.datos[TB.dias], T = window.TALLER;
  let h = '<div class="ph"><div><h2>Tablero</h2></div><button class="btn ghost sm" data-a="tbRecargar">↻ Actualizar</button></div>'
    + '<div class="filters">' + [[1, "Hoy"], [7, "7 días"], ["mes", "Este mes"], [30, "30 días"]].map(x => '<button class="chip" data-a="tbDias" data-d="' + x[0] + '" aria-pressed="' + (TB.dias === x[0]) + '">' + x[1] + '</button>').join("") + '</div>';
  if (!d) return h + '<p class="muted"><span class="spinner"></span> Juntando los números…</p>';
  if (d.error === "backend") return h + '<div class="note bad"><b>Falta actualizar el backend.</b> Pegá el nuevo <code>Codigo.gs</code> en Apps Script y publicá una nueva versión. Después tocá ↻.</div>';
  if (d.error === "backendMes") return h + '<div class="note info"><b>Para ver “Este mes” falta actualizar el backend.</b> Pegá el nuevo <code>Codigo.gs</code> en Apps Script, ejecutá <code>instalar()</code> y publicá una nueva versión. Mientras tanto usá 7 o 30 días.</div>';
  if (d.error) return h + '<div class="note bad">' + esc(d.error) + '</div>';
  const v = d.ventas, a = d.anterior, inv = d.meta && d.meta.inversion || 0, g = d.ga && d.ga.total ? d.ga : null;
  const costoU = id => (T && T.costoFunda ? T.costoFunda(id) : 0), gan = T && T.gananciaFunda ? T.gananciaFunda("doble") : 0;
  const envU = id => (T && T.envioFunda ? T.envioFunda(id) : 0), sinEnv = v.sinEnvio || {doble: 0, individual: 0};   // entregadas en mano: no pagaste el envío
  const hayCostos = costoU("doble") > 0, queda = hayCostos ? v.neto - v.porProducto.doble * costoU("doble") - v.porProducto.individual * costoU("individual") + sinEnv.doble * envU("doble") + sinEnv.individual * envU("individual") - inv : null;
  const C = conclusiones(d, {gan: gan, queda: queda}), nd = diasDe(TB.dias), compTxt = TB.dias === 1 ? "vs ayer" : "vs los " + nd + " días anteriores";
  // 1 · Qué mirar
  h += '<div class="block" style="margin-top:0"><h3>Qué mirar</h3>' + (C.length ? '<ul class="todo">' + C.map(x => '<li class="' + x[0] + '"><span>' + esc(x[1]) + '</span></li>').join("") + '</ul>' : '<p class="muted" style="margin:0">Nada urgente: todo en orden.</p>') + '</div>';
  // 2 · La plata
  const R = d.reservas;
  h += '<h3 style="margin:18px 0 0">La plata</h3><div class="cards">'
    + '<div class="kpi"><small>Ventas</small><b>' + v.pedidos + '</b><span class="k2">' + v.unidades + ' funda' + (v.unidades === 1 ? "" : "s") + ' · ' + delta(v.pedidos, a.pedidos) + ' ' + compTxt + (v.fuera ? '<br>' + (v.pedidos - v.fuera) + ' en la web · ' + v.fuera + ' por fuera' : '') + '</span></div>'
    + '<div class="kpi"><small>Cobrado</small><b>' + money(v.facturado) + '</b><span class="k2">' + delta(v.facturado, a.facturado) + ' · ' + v.tarjeta + ' tarjeta, ' + v.transferencia + ' transf.' + (v.pedidos ? '<br>' + money(v.facturado / v.pedidos) + ' por pedido' : '') + '</span></div>'
    + '<div class="kpi' + (queda == null || !v.pedidos ? "" : queda >= 0 ? " ok" : " bad") + '"><small>Te quedó</small><b>' + (queda == null ? "—" : money(queda)) + '</b><span class="k2">' + (queda == null ? "faltan costos del taller" : "después de comisión, fundas" + (inv ? " y " + money(inv) + " de anuncios" : "")) + '</span></div>'
    + '<div class="kpi' + (R.total && R.pagadas / R.total < 0.6 ? " warn" : "") + '"><small>Transferencias pagadas</small><b>' + (R.total ? R.pagadas + ' de ' + R.total : "—") + '</b><span class="k2">' + (R.total ? (R.esperando ? R.esperando + ' esperando pago' : 'ninguna esperando') + (R.vencidas ? ' · ' + R.vencidas + ' vencidas' : '') : 'ninguna en el período') + '</span></div></div>';
  // 3 · Stock (una línea por funda)
  const S = d.stock || {};
  h += '<div class="block"><h3>Stock <span class="muted small" style="font-weight:600">· al ritmo de los últimos 30 días</span></h3>'
    + Object.keys(S).map(id => { const s = S[id], cl = s.disponible <= 0 ? "bad" : s.dias == null ? "mute" : s.dias < 7 ? "bad" : s.dias < 14 ? "warn" : "ok";
      return '<div class="tb-st"><span><b>' + esc(s.nombre) + '</b> <span class="muted small">' + s.disponible + ' disponibles' + (s.porDia ? ' · ' + String(s.porDia).replace(".", ",") + ' por día' : '') + '</span></span><span class="pill ' + cl + '">' + (s.disponible <= 0 ? "Sin stock" : s.dias == null ? "sin ventas" : "~" + s.dias + " días") + '</span></div>'; }).join("") + '</div>';
  // 4 · Visitas: un número + el embudo (con la conversión al final)
  h += '<h3 style="margin:18px 0 0">Las visitas <span class="muted small" style="font-weight:600">· Google Analytics</span></h3>';
  if (!g) h += setupGA(d.ga && (d.ga.falta || d.ga.error));
  else {
    const t = g.total.actual, tp = g.total.anterior, ev = g.eventos || {};
    const P = [["Entraron a la web", t.sesiones], ["Vieron las fundas", ev.view_item_list || 0], ["Agregaron al carrito", ev.add_to_cart || 0], ["Empezaron a comprar", ev.begin_checkout || 0], ["Compraron", web(v)]].filter((x, i) => i !== 1 || x[1] > 0);
    let peor = -1, caida = -1; P.forEach((x, i) => { if (i && P[i - 1][1] > 0) { const c = 1 - x[1] / P[i - 1][1]; if (c > caida) { caida = c; peor = i; } } });
    h += '<div class="block" style="margin-top:10px"><div class="tb-vis"><b>' + n0(t.sesiones) + '</b> visitas <span class="small">' + delta(t.sesiones, tp.sesiones) + ' ' + compTxt + '</span>'
      + (t.sesiones ? '<span class="tb-conv">Compran <b>' + String(Math.round(pc(web(v), t.sesiones) * 10) / 10).replace(".", ",") + '</b> de cada 100 <span class="muted small">(lo común: 1 a 2)</span></span>' : '') + '</div>'
      + '<p class="muted small" style="margin:8px 0 10px">Dónde abandona la gente: en naranja, el paso donde más se pierde.</p><div class="embudo">'
      + P.map((x, i) => '<div class="paso' + (i === peor ? " peor" : "") + '"><span>' + esc(x[0]) + '</span><div class="barra"><i style="width:' + Math.max(1, pc(x[1], P[0][1] || 1)) + '%"></i></div><b>' + n0(x[1]) + (i && P[i - 1][1] ? ' <span class="muted small">(' + pcTxt(pc(x[1], P[i - 1][1])) + ')</span>' : "") + '</b></div>').join("") + '</div></div>';
    const F = fuentes(g);
    h += '<div class="cols2" style="margin-top:14px"><div class="block"><h3>¿De dónde llegan?</h3>' + (F ? lista(F, t.sesiones, x => x) : lista(g.canales, t.sesiones, x => CANAL[x] || x)) + '</div>'
      + '<div class="block"><h3>¿Desde qué aparato?</h3>' + lista(g.dispositivos, t.sesiones, x => DISP[x] || x) + '</div></div>';
  }
  // 5 · Dónde vendés: manda la columna Ventas; ciudades y la explicación, plegadas
  const Z = d.zonas || {provincias: [], ciudades: []}, hayGA = !!g, porVentas = (x, y) => y.ventas - x.ventas || (y.visitas || 0) - (x.visitas || 0);
  h += '<h3 style="margin:18px 0 0">¿Dónde vendés?</h3><div class="block" style="margin-top:10px">' + tablaZonas(Z.provincias.slice().sort(porVentas).slice(0, 12), nombreProv, hayGA)
    + plegable("tbCiudades", "Ver por ciudad", tablaZonas(Z.ciudades.slice().sort(porVentas).slice(0, 10), nombreCiudad, hayGA))
    + plegable("tbZonasAyuda", "¿Cómo leer esta tabla?", '<p class="muted small" style="margin:0">Las <b>ventas</b> salen de la dirección de envío de cada pedido: son exactas. Las <b>visitas</b> son de Google Analytics, solo desde Argentina (las de afuera son robots de Meta y Google), y la ubicación es aproximada: en celulares con datos móviles suele ubicar a la gente en Buenos Aires aunque esté en otra provincia. Para decidir, mirá sobre todo la columna Ventas. “% compra” es de cada 100 visitas cuántas compraron; con menos de 20 visitas engaña, por eso sale “—”.</p>')
    + '</div>';
  // 6 · Anuncios: un renglón (el detalle está en Publicidad)
  const hayMeta = d.meta && d.meta.inversion != null && !d.meta.falta;
  h += '<div class="block tb-ads"><span><b>Anuncios</b> · ' + (hayMeta ? 'invertiste <b>' + money(inv) + '</b>' + (inv && web(v) ? ' · cada venta te costó <b>' + money(inv / web(v)) + '</b>' : '') : (d.meta && d.meta.falta === "token" ? "falta conectar Meta" : "sin anuncios en este período")) + '</span><button class="linkb" data-go="publicidad">Ver Publicidad →</button></div>';
  h += plegable("tbAyuda", "¿De dónde salen estos números?", '<p class="muted small" style="margin:0">Período: ' + esc(d.periodo.since.split("-").reverse().join("/") + " al " + d.periodo.until.split("-").reverse().join("/")) + '. Ventas y stock, al momento; Meta se actualiza cada 10 minutos y Google Analytics cada 30 (Google tarda unas horas en procesar las visitas). Los links que se mandan por WhatsApp casi siempre figuran como “Directo”. Para que los anuncios de Meta salgan separados en “¿De dónde llegan?”, poné los Parámetros de URL que te da la pantalla Publicidad.</p>');
  return h;
}
document.addEventListener("toggle", e => { const t = e.target; if (t && t.classList && t.classList.contains("tb-pl")) TB.abiertos[t.id] = t.open; }, true);
L.CLICK.tbDias = t => { TB.dias = t.dataset.d === "mes" ? "mes" : +t.dataset.d; L.render(); };
L.CLICK.tbRecargar = () => { delete TB.datos[TB.dias]; TB.forzar = true; L.render(); };
L.vista("tablero", "Números", "Tablero", vTablero, null, "publicidad");
})();
