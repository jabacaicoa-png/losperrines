/* Los Perrines · Panel · Taller
 * Insumos, productos (medidas + receta), tandas de producción, proveedores y pagos,
 * planificación y rentabilidad. Todo sale de un único catálogo, así los números
 * no se desparejan entre una pantalla y otra.
 */
window.PANEL_VERSION = "24/11 · 4";
(function () {
"use strict";
const L = window.LP, S = L.S, esc = L.esc, money = L.money, q = L.q, nd = L.nd, nm = L.nm, $ = L.$, $$ = L.$$;
const PRODS = ["doble", "individual"];
const MED_DEF = {
  doble: {an: 125, t1: 48, t2: 40, t3: 38, la: 40, lb: 38, nl: 2, nc: 6, tf: 10, tr: 60, bt: 10, ab: 20},
  individual: {an: 60, t1: 48, t2: 40, t3: 38, la: 40, lb: 38, nl: 2, nc: 4, tf: 10, tr: 60, bt: 10, ab: 20}
};
const MED_LBL = [["an", "Ancho"], ["t3", "Respaldo delantero"], ["t2", "Asiento"], ["t1", "Respaldo trasero"], ["la", "Lateral: largo junto al asiento"], ["lb", "Lateral: alto (hacia la puerta)"], ["nl", "Laterales"], ["nc", "Correas (hebillas)"], ["tf", "Tira fija"], ["tr", "Tira regulable"], ["bt", "Cintas: distancia desde el borde"], ["ab", "Abertura del cinturón: largo"], ["ad", "Abertura: distancia desde el borde"]];
const MED_NUEVAS = ["bt", "ab", "ad"];   // 15/11/2026: necesitan el Codigo.gs nuevo para guardarse
const AUTO_TXT = {tela: "sale del corte", correas: "1 por correa", cinta: "correas × (tira fija + regulable)"};
const ESTADO = {planificada: ["Planificada", "mute"], en_confeccion: ["En confección", "warn"], recibida: ["Recibida", "ok"], cancelada: ["Cancelada", "mute"]};

/* ================= calculadora de corte (misma lógica que corte.html) ================= */
/* Criterio del dueño (10/11/2026), igual que corte.html: cuerpo ancho sin margen (gross); largo = tramos + 4 márgenes
   (2 en el pliegue con el respaldo delantero y 2 en la unión con el trasero); lateral: lado del asiento sin margen, alto + 1 margen. */
function piezas(md, mg) { return {CW: md.an, CL: md.t1 + md.t2 + md.t3 + 4 * mg, LA: md.la, LB: md.lb + mg, nl: Math.max(0, Math.round(md.nl))}; }
function fit(w, l, LA, LB) { const a = Math.floor(w / LA) * Math.floor(l / LB), b = Math.floor(w / LB) * Math.floor(l / LA); return a >= b ? {n: a} : {n: b}; }
function bloque(n, P, RW, giro) {
  const cA = giro ? P.CL : P.CW, cL = giro ? P.CW : P.CL; if (cA > RW || cA <= 0 || cL <= 0) return null;
  const k = Math.floor(RW / cA), filas = []; let resta = n; while (resta > 0) { const m = Math.min(k, resta); filas.push(m); resta -= m; }
  const need = n * P.nl; let cap = 0; filas.forEach(m => { const f = fit(RW - m * cA, cL, P.LA, P.LB); cap += Math.min(f.n, Math.max(0, need - cap)); });
  const rem = Math.max(0, need - cap); let fr = {per: 0, y: 0};
  if (rem > 0) { const o1 = {per: Math.floor(RW / P.LA), y: P.LB}, o2 = {per: Math.floor(RW / P.LB), y: P.LA}; const c1 = o1.per ? o1.y / o1.per : 1e9, c2 = o2.per ? o2.y / o2.per : 1e9; fr = c1 <= c2 ? o1 : o2; if (!fr.per) return null; }
  return {n: n, len: filas.length * cL + (rem > 0 ? Math.ceil(rem / fr.per) : 0) * fr.y};
}
function mejor(n, P, RW) { const a = bloque(n, P, RW, false), b = bloque(n, P, RW, true); if (!a) return b; if (!b) return a; return b.len < a.len ? b : a; }
function analizar(md, RW, mg) { const P = piezas(md, mg), tabla = {}; let best = null; for (let n = 1; n <= 12; n++) { const b = mejor(n, P, RW); tabla[n] = b; if (b && (!best || b.len / n < best.len / best.n - 1e-9)) best = b; } return {P: P, tabla: tabla, best: best}; }
function largoPara(n, A) { if (!A.best || n <= 0) return 0; const bn = A.best.n, full = Math.floor(n / bn), r = n % bn; return full * A.best.len + (r ? A.tabla[r].len : 0); }
function porLargo(A, cm) { if (!A.best || cm <= 0) return 0; const bn = A.best.n, k = Math.floor(cm / A.best.len); let u = k * bn; const rest = cm - k * A.best.len; for (let n = bn - 1; n >= 1; n--) { if (A.tabla[n] && A.tabla[n].len <= rest) { u += n; break; } } return u; }

/* ================= modelo ================= */
const T = () => S.taller;
function conf(k, def) { const t = T(); const v = t && t.config ? t.config[k] : ""; return v === "" || v == null ? def : nd(v); }
function cfgTienda() { return (S.data && S.data.config) || {}; }
function ins(id) { return T().insumos.find(i => i.id === id); }
function prov(id) { return T().proveedores.find(p => p.id === id); }
function provNombre(id) { const p = prov(id); return p ? p.nombre : "Sin proveedor"; }
function nombreP(p) { const x = (T() && T().productos || []).find(y => y.id === p); return x ? x.nombre : (p === "individual" ? "Funda individual" : "Funda doble"); }
function corto(p, n) { return p === "doble" ? (n === 1 ? "doble" : "dobles") : (n === 1 ? "individual" : "individuales"); }
function activos(lista) { return lista.filter(x => x.activo !== false); }
function fichaGuardada(p) {
  const f = T() && T().fichas.find(x => x.producto === p);
  return f || {producto: p, medidas: {}, receta: [], confeccion: 0, envio: 0, otros: [], notas: "", _nueva: true};
}
function med(f) { const m = Object.assign({}, MED_DEF[f.producto]); Object.keys(f.medidas || {}).forEach(k => { if (f.medidas[k] !== "" && f.medidas[k] != null) m[k] = nd(f.medidas[k]); }); return m; }
function corteDe(f) { return analizar(med(f), conf("rollo_ancho", 150), conf("margen_costura", 1)); }
function telaU(f) { const A = corteDe(f); return A.best ? Math.ceil(A.best.len / A.best.n - 1e-9) / 100 : 0; }
function autoUso(f, auto) { const m = med(f); if (auto === "tela") return telaU(f); if (auto === "correas") return m.nc; if (auto === "cinta") return Math.round(m.nc * (m.tf + m.tr)) / 100; return 0; }
function esAuto(r) { return !!r.auto && (r.uso === "" || r.uso == null); }
function usoDe(f, r) { return esAuto(r) ? autoUso(f, r.auto) : nd(r.uso); }
function precioU(i) { return i && i.contenido > 0 ? i.precio / i.contenido : 0; }
function gastosTot(lista) { return (lista || T().gastos).filter(g => g.activo !== false).reduce((a, g) => a + nm(g.total), 0); }
/* ---------- bolsa de guardado: una pieza doblada ----------
   Terminada ancho × alto (el ancho es el lado de la abertura; el alto se duplica al doblar).
   Corte = (2 × alto + 2 × costura) × (ancho + 2 × costura). */
const BOLSA_CALC = {tela: "Tela: sale del corte", abertura: "Largo de la abertura", fija: "Cantidad fija"};
function bolsaActiva(f) { return !!(f && f.bolsa && f.bolsa.activa !== false); }
function bolsaCorte(b) { const c = nd(b.costura); return {largo: 2 * nd(b.alto) + 2 * c, ancho: nd(b.ancho) + 2 * c}; }
function bolsaRollo(b) { return nd(b.rollo) || conf("rollo_ancho", 150); }
function bolsaTela(b) { // metros de tela por bolsa, con la mejor ubicación en el ancho del rollo
  const P = bolsaCorte(b), RW = bolsaRollo(b); if (!(P.largo > 0 && P.ancho > 0)) return {m: 0, porFila: 0, giro: false};
  const k1 = Math.floor(RW / P.largo), k2 = Math.floor(RW / P.ancho);
  const o1 = k1 ? P.ancho / k1 : Infinity, o2 = k2 ? P.largo / k2 : Infinity;
  if (o1 === Infinity && o2 === Infinity) return {m: 0, porFila: 0, noEntra: true};
  return o1 <= o2 ? {m: Math.ceil(o1 - 1e-9) / 100, porFila: k1, atravesado: "largo"} : {m: Math.ceil(o2 - 1e-9) / 100, porFila: k2, atravesado: "ancho"};
}
/* cuántas bolsas salen de un largo de tela, y cuánta tela hace falta para N bolsas (por filas enteras) */
function bolsaFila(b) { const P = bolsaCorte(b), t = bolsaTela(b); return t.porFila ? {k: t.porFila, cm: t.atravesado === "largo" ? P.ancho : P.largo} : null; }
function bolsasDe(b, metros) { const f = bolsaFila(b); return f ? Math.floor(metros * 100 / f.cm + 1e-9) * f.k : 0; }
function metrosPara(b, n) { const f = bolsaFila(b); return f && n > 0 ? Math.ceil(n / f.k - 1e-9) * f.cm / 100 : 0; }
function bolsaUso(b, x) { if (x.calc === "tela") return bolsaTela(b).m; if (x.calc === "abertura") return nd(b.ancho) / 100; return nd(x.uso); }
function bolsaCosto(f, verIgual) {   // verIgual: el costo para mostrar aunque no se sume a la funda
  if (!f.bolsa || (!verIgual && !bolsaActiva(f))) return {mat: 0, conf: 0, serv: 0, total: 0};
  const b = f.bolsa, mat = (b.items || []).reduce((a, x) => a + bolsaUso(b, x) * precioU(ins(x.insumo)), 0);
  const cf = nm(b.confeccion), sv = (b.servicios || []).reduce((a, x) => a + nm(x.monto), 0);
  return {mat: mat, conf: cf, serv: sv, total: mat + cf + sv};
}
function confU(f) { return nm(f.confeccion) + (bolsaActiva(f) ? nm(f.bolsa.confeccion) : 0); } // lo que se le paga a Susana por funda
function bolsaDefault(p) {
  const buscar = re => (activos(T().insumos).find(i => re.test(i.nombre)) || {}).id || "";
  const tela = buscar(/tracker.*lis|lis.*tracker|tracker.*com[uú]n/i) || buscar(/forro|tracker/i);
  const items = [{insumo: tela, calc: "tela", uso: null}, {insumo: buscar(/hilo/i), calc: "fija", uso: 15}, {insumo: buscar(/cierre/i), calc: "abertura", uso: null}];
  const desl = buscar(/desliz/i); if (desl) items.push({insumo: desl, calc: "fija", uso: 1});
  return {activa: true, ancho: p === "doble" ? 60 : 50, alto: p === "doble" ? 50 : 30, costura: 1, rollo: "", items: items.filter(x => x.insumo), confeccion: 0, servicios: [{concepto: "Sublimación", monto: 0}]};
}
function costo(f, gastos) {
  const mat = (f.receta || []).reduce((a, r) => a + usoDe(f, r) * precioU(ins(r.insumo)), 0);
  const rl = conf("rollo_largo", 60), gas = rl > 0 ? gastosTot(gastos) / rl * telaU(f) : 0;
  const otros = (f.otros || []).reduce((a, o) => a + nm(o.monto), 0);
  const c = nm(f.confeccion), env = nm(f.envio), bol = bolsaCosto(f).total;
  return {mat: mat, conf: c, gastos: gas, otros: otros, envio: env, bolsa: bol, total: mat + c + gas + otros + env + bol};
}
/* insumos que consume una cantidad de fundas: {insumoId: cantidad} */
function consumos(f, n, out) {
  out = out || {}; if (!(n > 0)) return out;
  (f.receta || []).forEach(r => { if (!r.insumo) return; const v = r.auto === "tela" && esAuto(r) ? largoPara(n, corteDe(f)) / 100 : usoDe(f, r) * n; out[r.insumo] = (out[r.insumo] || 0) + v; });
  if (bolsaActiva(f)) (f.bolsa.items || []).forEach(x => { if (x.insumo) out[x.insumo] = (out[x.insumo] || 0) + bolsaUso(f.bolsa, x) * n; });
  return out;
}
/* Plata de lo que falta entregar de una tanda: confección a pagar al recibir, lo que entra si se vende todo (mezcla
   tarjeta/transferencia de Precios y rentabilidad), costo total y ganancia. Misma cuenta que Planificar tanda. */
function plataTanda(t, cant) {   // cant: {producto: n}; si no se pasa, lo que falta entregar
  initRS(); const pend = cant || pendienteTanda(t), o = {fundas: 0, conf: 0, ingreso: 0, costo: 0, gan: 0};
  PRODS.forEach(p => { const n = pend[p] || 0; if (!n) return; const f = fichaGuardada(p), r = rent(p);
    o.fundas += n; o.conf += n * confU(f); o.costo += n * costo(f).total; o.ingreso += n * (r.mix * r.recT + (1 - r.mix) * r.px); o.gan += n * r.gMix; });
  return o;
}
function pendienteTanda(t) { const o = {}; (t.items || []).forEach(it => { o[it.producto] = Math.max(0, it.cantidad - ((t.recibido || {})[it.producto] || 0)); }); return o; }
function reservado() { // lo que tiene el taller para tandas en confección
  const out = {};
  T().tandas.filter(t => t.estado === "en_confeccion").forEach(t => { const pend = pendienteTanda(t); PRODS.forEach(p => consumos(fichaGuardada(p), pend[p] || 0, out)); });
  return out;
}
function disponible(i, res) { res = res || reservado(); return Math.round((i.stock - (res[i.id] || 0)) * 1000) / 1000; }
function telaId() { for (const p of PRODS) { const r = (fichaGuardada(p).receta || []).find(x => x.auto === "tela"); if (r) return r.insumo; } return null; }
function saldos() {
  const s = {}; T().proveedores.forEach(p => { s[p.id] = {cargos: 0, pagos: 0, saldo: 0}; });
  T().compras.forEach(c => { if (!s[c.proveedor]) s[c.proveedor] = {cargos: 0, pagos: 0, saldo: 0}; s[c.proveedor].cargos += c.total; });
  T().pagos.forEach(p => { if (!s[p.proveedor]) s[p.proveedor] = {cargos: 0, pagos: 0, saldo: 0}; s[p.proveedor].pagos += p.monto; });
  Object.keys(s).forEach(k => { s[k].saldo = s[k].cargos - s[k].pagos; });
  return s;
}
function bajoMinimo() { const res = reservado(); return activos(T().insumos).filter(i => i.minimo > 0 && disponible(i, res) < i.minimo); }

/* ================= rentabilidad ================= */
// Rentabilidad = ganancia / costo (como la calculás vos).
const RS = {init: false};
function initRS() {
  if (RS.init) return; const c = cfgTienda(), t = T(), v = t.ventas || {}, tot = (v.tarjeta || 0) + (v.transferencia || 0);
  RS.precios = {doble: {t: c.precio_tarjeta || "", x: c.precio_transferencia || ""}, individual: {t: c.precio2_tarjeta || "", x: c.precio2_transferencia || ""}};
  RS.comision = String(conf("comision_mp", 20)); RS.objetivo = String(conf("rentabilidad_objetivo", 60));
  RS.mixReal = tot >= 5 ? Math.round(v.tarjeta / tot * 100) : null; RS.ventas = tot;
  RS.mix = String(conf("mix_tarjeta", 50)); RS.init = true;  // manda siempre el % que guardaste; el de las ventas es solo referencia
}
function rent(p, precios) {
  initRS(); precios = precios || RS.precios[p]; const f = fichaGuardada(p), C = costo(f).total;
  const pt = nm(precios.t), px = nm(precios.x), com = nd(RS.comision) / 100, mix = nd(RS.mix) / 100, obj = nd(RS.objetivo) / 100;
  const recT = pt * (1 - com), gT = recT - C, gX = px - C, rT = C > 0 ? gT / C : 0, rX = C > 0 ? gX / C : 0;
  const rMix = mix * rT + (1 - mix) * rX, gMix = mix * gT + (1 - mix) * gX;
  const d = pt > 0 ? 1 - px / pt : 0, den = mix * (1 - com) + (1 - mix) * (1 - d);
  const minLista = den > 0 ? C * (1 + obj) / den : 0;
  const minTransf = rX > rT ? Math.max(0, Math.min(1, (obj - rT) / (rX - rT))) : null;
  return {C: C, pt: pt, px: px, recT: recT, gT: gT, gX: gX, rT: rT, rX: rX, rMix: rMix, gMix: gMix, obj: obj, d: d, minLista: minLista, minTransf: minTransf, mix: mix};
}
function pct(x) { return q(x * 100) + "%"; }
function pillR(r, obj) { return '<span class="pill ' + (r >= obj ? "ok" : r >= obj - 0.1 ? "warn" : "bad") + '">' + pct(r) + "</span>"; }

/* ================= utilidades de vista ================= */
function hoyISO() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function fFecha(s) { if (!s) return ""; const p = String(s).split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : s; }
function opts(lista, sel, vacio) { return (vacio != null ? '<option value="">' + esc(vacio) + "</option>" : "") + lista.map(x => '<option value="' + esc(x.id) + '"' + (x.id === sel ? " selected" : "") + ">" + esc(x.nombre) + "</option>").join(""); }
function envTxt(i, cant) { return i && i.contenido > 0 && i.contenido !== 1 ? " (" + q(cant / i.contenido) + " " + esc(i.envase) + ")" : ""; }
function guard() {
  if (S.tallerError === "backend") return '<div class="note bad"><b>Falta actualizar el backend.</b> Pegá el nuevo <code>Codigo.gs</code> en Apps Script y publicá una nueva versión (Implementar → Administrar implementaciones → Editar → Nueva versión). Después tocá ↻ Actualizar.</div>';
  if (!T()) return '<div class="note bad">No pude cargar los datos del taller' + (S.tallerError ? ": " + esc(S.tallerError) : "") + '. Tocá ↻ Actualizar.</div>';
  return "";
}
function sinDatos() { return !T().insumos.length; }
function bannerMigrar() {
  if (!sinDatos()) return "";
  const v = T().viejos || {}, hay = v.costos || v.insumos || v.pagos || v.corte;
  return '<div class="note info" style="margin:0 0 14px"><b>' + (hay ? "Importá tus datos de las herramientas anteriores." : "Empezá cargando tus insumos.") + "</b> "
    + (hay ? "Junto lo que tenés en Costos, Insumos, Corte y Pagos en un solo catálogo. Antes de guardar te muestro un resumen para revisar." : "Cargá los insumos y después armá la receta de cada funda en Productos y recetas.")
    + '<div class="acts" style="margin-top:10px">' + (hay ? '<button class="btn main" data-a="tMigrar">Revisar e importar</button>' : '<button class="btn main" data-a="insNuevo">＋ Nuevo insumo</button>') + "</div></div>";
}
/* re-dibuja el diálogo sin perder el foco */
function redlg(html, wide) {
  const a = document.activeElement, id = a && a.id; let pos = null; try { pos = a && a.selectionStart; } catch (e) {}
  const box = $("#dlgIn"), y = box ? box.parentNode.scrollTop : 0;
  L.dlg(html, wide);
  const d = $("#dlg"); d.scrollTop = y;
  if (id) { const el = document.getElementById(id); if (el) { el.focus({preventScroll: true}); try { if (pos != null) el.setSelectionRange(pos, pos); } catch (e) {} } }
}
function cabecera(titulo, sub, acciones) {
  return '<div class="ph"><div><h2>' + esc(titulo) + "</h2>" + (sub ? '<p class="sub">' + sub + "</p>" : "") + "</div>" + (acciones ? '<div class="acts">' + acciones + "</div>" : "") + "</div>";
}

/* ================= INICIO (bloque del taller) ================= */
function inicio() {
  if (!T()) return "";
  initRS();
  const enConf = T().tandas.filter(t => t.estado === "en_confeccion"), fundas = enConf.reduce((a, t) => { const p = pendienteTanda(t); return a + PRODS.reduce((b, x) => b + (p[x] || 0), 0); }, 0);
  const bajos = bajoMinimo(), sal = saldos(), deuda = Object.keys(sal).reduce((a, k) => a + Math.max(0, sal[k].saldo), 0);
  const prods = PRODS.filter(p => T().fichas.some(f => f.producto === p));
  let h = '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:22px;flex-wrap:wrap"><h3 style="margin:0">Taller y números</h3><button class="btn ghost sm" data-a="tExport">Descargar datos del taller</button></div><div class="cards">'
    + (pc => '<div class="kpi' + (fundas ? " warn" : "") + '"><small>En confección</small><b>' + fundas + '</b><span class="k2">' + (enConf.length ? enConf.length + " tanda" + (enConf.length > 1 ? "s" : "") + " · confección " + money(pc.conf) + " · venden " + money(pc.ingreso) : "Ninguna tanda") + "</span></div>")(enConf.reduce((a, t) => { const x = plataTanda(t); a.conf += x.conf; a.ingreso += x.ingreso; return a; }, {conf: 0, ingreso: 0}))
    + '<div class="kpi' + (bajos.length ? " bad" : " ok") + '"><small>Insumos bajo el mínimo</small><b>' + bajos.length + '</b><span class="k2">' + (bajos.length ? esc(bajos.slice(0, 2).map(i => i.nombre).join(", ")) : "Todo en orden") + "</span></div>"
    + '<div class="kpi' + (deuda ? " warn" : "") + '"><small>Debés a proveedores</small><b>' + money(deuda) + '</b><span class="k2">Compras y confección sin pagar</span></div>';
  if (prods.length) {
    const rs = prods.map(p => rent(p)), obj = nd(RS.objetivo) / 100, prom = rs.reduce((a, r) => a + r.rMix, 0) / rs.length;
    h += '<div class="kpi' + (prom >= obj ? " ok" : " bad") + '"><small>Rentabilidad (promedio de las fundas)</small><b>' + pct(prom) + '</b><span class="k2">Objetivo ' + esc(RS.objetivo) + "% · " + esc(RS.mix) + "% con tarjeta</span></div>";
  } else h += '<div class="kpi"><small>Rentabilidad</small><b>—</b><span class="k2">Cargá las recetas</span></div>';
  return h + "</div>";
}
function pendientes() {
  const out = [];
  if (S.tallerError === "backend") { out.push(["bad", "El panel nuevo necesita el backend actualizado (Codigo.gs).", "insumos", "Ver cómo"]); return out; }
  if (!T()) return out;
  if (sinDatos()) out.push(["info", "Importá tus datos de Costos, Insumos, Corte y Pagos al taller nuevo.", "insumos", "Importar"]);
  const bajos = bajoMinimo(); if (bajos.length) out.push(["bad", bajos.length + " insumo" + (bajos.length > 1 ? "s" : "") + " por debajo del mínimo: " + bajos.map(i => i.nombre).join(", ") + ".", "insumos", "Ver"]);
  T().tandas.filter(t => t.estado === "en_confeccion").forEach(t => { const p = pendienteTanda(t), d = PRODS.filter(x => p[x]).map(x => p[x] + " " + corto(x, p[x])).join(" + "); if (d) out.push(["info", (provNombre(t.proveedor) !== "Sin proveedor" ? provNombre(t.proveedor) : "El taller") + " tiene en confección " + d + " (tanda " + t.id + ").", "tandas", "Recibir"]); });
  const sal = saldos(); Object.keys(sal).forEach(k => { if (sal[k].saldo > 0) out.push(["warn", "Le debés " + money(sal[k].saldo) + " a " + provNombre(k) + ".", "proveedores", "Ver"]); });
  return out;
}

/* ================= PLANIFICAR ================= */
const PL = {q: {doble: "", individual: ""}, tela: null};
function vPlanificar() {
  const g = guard(); if (g) return cabecera("Planificar tanda") + g;
  const fichas = PRODS.map(fichaGuardada), res = reservado(), tid = telaId(), tIns = tid && ins(tid);
  const telaDisp = tIns ? disponible(tIns, res) : 0, telaTengo = PL.tela == null ? telaDisp : nd(PL.tela), RL = telaTengo * 100;
  const cant = p => Math.max(0, Math.floor(nd(PL.q[p])));
  let h = cabecera("Planificar tanda", "Elegí cuántas fundas hacer: te digo cuánta tela usan, qué falta comprar, cuánto ponés y cuánto ganás. La tela y las hebillas salen de las medidas de cada producto.") + bannerMigrar();
  // 1. la tanda
  let usado = 0; const segs = fichas.map(f => { const cm = largoPara(cant(f.producto), corteDe(f)); usado += cm; return {f: f, cm: cm}; });
  const sobra = RL - usado, tot = Math.max(RL, usado) || 1, colores = {doble: "var(--olive)", individual: "var(--ball)"};
  h += '<div style="display:grid;gap:14px" class="plgrid"><div style="min-width:0">';
  h += '<div class="block" style="margin-top:0"><h3>1. La tanda</h3><div class="acts" style="align-items:end;margin-bottom:12px">'
    + '<label class="f" style="margin:0">Tela disponible' + (tIns ? " (" + esc(tIns.nombre) + ")" : "") + '<span class="unitw"><input class="inp sm" id="plTela" data-in="plTela" inputmode="decimal" value="' + esc(PL.tela == null ? L.qi(telaDisp) : PL.tela) + '"> m</span></label>'
    + (PL.tela != null ? '<button class="linkb" data-a="plTelaReal">Usar el stock real (' + q(telaDisp) + " m)</button>" : (tIns && res[tid] ? '<span class="muted small">Descontados ' + q(res[tid]) + " m que tiene el taller</span>" : ""))
    + "</div>"
    + '<div style="height:28px;border-radius:8px;display:flex;overflow:hidden;border:1px solid var(--line);background:repeating-linear-gradient(45deg,var(--field) 0 6px,var(--line) 6px 7px)" role="img" aria-label="Uso de la tela">'
    + segs.map(s => s.cm ? '<i style="display:block;width:' + (s.cm / tot * 100) + "%;background:" + colores[s.f.producto] + '"></i>' : "").join("") + (sobra < 0 ? '<i style="display:block;width:' + (-sobra / tot * 100) + '%;background:var(--bad)"></i>' : "") + "</div>"
    + '<p class="small" style="margin:6px 0 0">' + segs.map(s => '<span style="display:inline-block;margin-right:14px"><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + colores[s.f.producto] + '"></i> ' + esc(nombreP(s.f.producto)) + ": " + q(s.cm / 100) + " m</span>").join("")
    + (sobra >= 0 ? '<span class="muted">Sobran ' + q(sobra / 100) + " m</span>" : '<b class="neg">Faltan ' + q(-sobra / 100) + " m de tela</b>") + "</p>"
    + '<div class="cols2" style="margin-top:14px">' + fichas.map(f => {
      const p = f.producto, A = corteDe(f), otros = segs.filter(s => s.f !== f).reduce((a, s) => a + s.cm, 0), maxAhora = porLargo(A, Math.max(0, RL - otros));
      return '<div style="border:1.5px solid var(--line);border-radius:14px;padding:14px;min-width:0"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><b>' + esc(nombreP(p)) + "</b>"
        + '<span class="unitw"><button class="btn ghost sm" data-a="plMenos" data-p="' + p + '" aria-label="Una menos">−</button><input class="inp xs" style="width:64px;text-align:center;font-weight:800" id="plq-' + p + '" data-in="plQ" data-p="' + p + '" inputmode="numeric" value="' + esc(PL.q[p]) + '" placeholder="0" aria-label="Cantidad"><button class="btn ghost sm" data-a="plMas" data-p="' + p + '" aria-label="Una más">+</button></span></div>'
        + '<p class="small muted" style="margin:8px 0 0">' + q(telaU(f)) + " m de tela por funda · conviene cortar de a " + (A.best ? A.best.n : "—") + " · con un rollo de " + q(conf("rollo_largo", 60)) + " m: hasta " + porLargo(A, conf("rollo_largo", 60) * 100) + "</p>"
        + '<div class="acts" style="margin-top:8px"><button class="linkb" data-a="plLlenar" data-p="' + p + '" data-v="' + maxAhora + '">Usar la tela que queda: ' + maxAhora + " " + corto(p, maxAhora) + "</button>" + (f._nueva ? ' <span class="pill warn">Sin receta</span>' : "") + "</div></div>";
    }).join("") + "</div></div>";
  // 2. qué comprar
  const nec = {}; fichas.forEach(f => consumos(f, cant(f.producto), nec));
  const filas = Object.keys(nec).map(id => { const i = ins(id); if (!i) return null; const disp = id === tid ? telaTengo : disponible(i, res), falta = Math.max(0, nec[id] - disp), env = i.contenido > 0 ? Math.ceil(falta / i.contenido - 1e-9) : 0; return {i: i, nec: nec[id], disp: disp, falta: falta, env: env, costo: env * i.precio, sobra: disp + env * i.contenido - nec[id]}; }).filter(Boolean);
  const compraTot = filas.reduce((a, x) => a + x.costo, 0), faltan = filas.filter(x => x.falta > 0);
  h += '<div class="block"><h3>2. Qué comprar</h3>';
  if (!filas.length) h += '<p class="muted" style="margin:0">' + (fichas.some(f => f.receta.length) ? "Poné cuántas fundas querés hacer." : "Todavía no cargaste las recetas de los productos.") + "</p>";
  else {
    h += '<div class="note ' + (faltan.length ? "bad" : "ok") + '" style="margin:0 0 6px"><b>' + (faltan.length ? "Te faltan " + faltan.length + " insumo" + (faltan.length > 1 ? "s" : "") + ". Compra: " + money(compraTot) : "Tenés todo lo necesario para esta tanda.") + "</b></div>";
    const porProv = {}; filas.forEach(x => { (porProv[x.i.proveedor] = porProv[x.i.proveedor] || []).push(x); });
    Object.keys(porProv).forEach(pv => { const arr = porProv[pv], sub = arr.reduce((a, x) => a + x.costo, 0);
      h += '<div style="border:1px solid var(--line);border-radius:14px;margin-top:10px;overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;background:var(--field);flex-wrap:wrap"><b>' + esc(provNombre(pv)) + "</b>"
        + (sub ? '<span class="acts"><b>' + money(sub) + '</b><button class="btn main sm" data-a="plComprar" data-prov="' + esc(pv) + '">Registrar esta compra</button></span>' : '<span class="pill ok">Completo</span>') + '</div><div class="tw"><table><thead><tr><th>Insumo</th><th class="n">Necesitás</th><th class="n">Tenés</th><th>Comprar</th></tr></thead><tbody>'
        + arr.map(x => { const u = esc(x.i.unidad); return "<tr><td><b>" + esc(x.i.nombre) + '</b></td><td class="n">' + q(x.nec) + " " + u + '</td><td class="n">' + q(x.disp) + " " + u + "</td><td>"
          + (x.falta > 0 ? '<span class="pill bad">' + x.env + " × " + esc(x.i.envase) + "</span> " + money(x.costo) + '<br><span class="muted small">faltan ' + q(x.falta) + " " + u + ", después sobran " + q(x.sobra) + "</span>" : '<span class="pill ok">Alcanza</span> <span class="muted small">sobran ' + q(x.sobra) + " " + u + "</span>") + "</td></tr>"; }).join("")
        + "</tbody></table></div></div>"; });
  }
  h += '<p class="muted small" style="margin:10px 0 0">“Tenés” descuenta lo que ya está reservado para tandas en confección.</p></div>';
  // resumen
  initRS();
  const u = PRODS.reduce((a, p) => a + cant(p), 0);
  let confT = 0, ingreso = 0, costoT = 0, gan = 0;
  PRODS.forEach(p => { const n = cant(p); if (!n) return; const f = fichaGuardada(p), c = costo(f), r = rent(p); confT += n * confU(f); costoT += n * c.total; ingreso += n * (r.mix * r.recT + (1 - r.mix) * r.px); gan += n * r.gMix; });
  const poner = compraTot + confT, rTanda = costoT > 0 ? gan / costoT : 0, obj = nd(RS.objetivo) / 100;
  h += '</div><aside style="min-width:0"><div class="block" style="margin-top:0;background:var(--olive);color:var(--on-olive);border:0;position:sticky;top:16px"><h3>Resumen de la tanda</h3>'
    + kv("Fundas", "<b style='font-size:1.4rem'>" + u + "</b>") + '<p class="small" style="margin:-2px 0 6px;opacity:.85">' + (PRODS.filter(p => cant(p)).map(p => cant(p) + " " + corto(p, cant(p))).join(" + ") || "Elegí cantidades") + "</p>"
    + kv("Tela", q(usado / 100) + " de " + q(telaTengo) + " m") + kv("Insumos que faltan comprar", compraTot ? money(compraTot) : "Nada: tenés todo ✓") + kv("Confección (al recibir)", money(confT))
    + kv("<b>Plata que ponés</b><br><span class='small' style='opacity:.85'>insumos que faltan + confección</span>", "<b>" + money(poner) + "</b>", true) + kv("Recibís si vendés todo", money(ingreso)) + kv("Costo total de la tanda<br><span class='small' style='opacity:.85'>incluye lo que ya tenés pagado</span>", money(costoT))
    + kv("<b>Ganancia</b>", "<b style='font-size:1.3rem'>" + money(gan) + "</b>", true) + kv("Rentabilidad", u ? pct(rTanda) + (rTanda >= obj ? " ✓" : " · objetivo " + esc(RS.objetivo) + "%") : "—")
    + '<p class="small" style="margin:8px 0 0;opacity:.8">Con los precios de la web y ' + esc(RS.mix) + "% de ventas con tarjeta (comisión " + esc(RS.comision) + "%). El costo incluye materiales, confección, gastos compartidos y envío.</p>"
    + '<button class="btn ball big" style="width:100%;margin-top:12px" data-a="plCrear"' + (u ? "" : " disabled") + ">Crear tanda</button></div></aside></div>"
    + "<style>@media(min-width:1100px){.plgrid{grid-template-columns:minmax(0,1fr) 300px;align-items:start}}</style>";
  return h;
}
function kv(a, b, hl) { return '<div style="display:flex;justify-content:space-between;gap:10px;padding:6px ' + (hl ? "8px" : "0") + ";border-top:1px solid rgba(242,243,236,.18);" + (hl ? "background:rgba(217,225,90,.16);border-radius:8px;border-top-color:transparent;margin:2px -8px" : "") + '"><span style="opacity:.9">' + a + "</span><span>" + b + "</span></div>"; }

/* ================= TANDAS ================= */
function vTandas() {
  const g = guard(); if (g) return cabecera("Tandas") + g;
  const L2 = T().tandas.slice().sort((a, b) => { const o = {en_confeccion: 0, planificada: 1, recibida: 2, cancelada: 3}; return (o[a.estado] - o[b.estado]) || (a.fecha < b.fecha ? 1 : -1); });
  let h = cabecera("Tandas", "Cada pedido de fundas al taller. Mientras está en confección, sus insumos quedan reservados. Al recibir las fundas se descuentan los insumos, las fundas se suman a la tienda y queda anotado lo que tenés que pagar por la confección.", '<button class="btn main" data-go="planificar">＋ Nueva tanda</button>');
  if (!L2.length) return h + '<div class="empty">Todavía no hay tandas. Armá la primera desde Planificar tanda.</div>';
  return h + L2.map(t => {
    const e = ESTADO[t.estado] || [t.estado, "mute"], rec = t.recibido || {};
    return '<div class="block"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start"><div><b style="font-size:1.08rem">Tanda ' + esc(t.id) + '</b> <span class="pill ' + e[1] + '">' + e[0] + '</span><div class="muted small">' + fFecha(t.fecha) + (t.proveedor ? " · " + esc(provNombre(t.proveedor)) : "") + (t.notas ? " · " + esc(t.notas) : "") + "</div></div>"
      + '<div class="acts">' + (t.estado === "planificada" ? '<button class="btn main sm" data-a="tdEstado" data-id="' + esc(t.id) + '" data-v="en_confeccion">Ya se la pedí al taller</button>' : "")
      + (t.estado === "en_confeccion" ? '<button class="btn main sm" data-a="tdRecibir" data-id="' + esc(t.id) + '">Recibir fundas</button>' : "")
      + (t.estado === "planificada" || t.estado === "en_confeccion" ? '<button class="btn ghost sm" data-a="tdEditar" data-id="' + esc(t.id) + '">Editar</button>' : "")
      + (t.estado === "planificada" || (t.estado === "en_confeccion" && !Object.keys(rec).length) ? '<button class="btn ghost sm" data-a="tdEstado" data-id="' + esc(t.id) + '" data-v="cancelada">Cancelar</button>' : "")
      + (t.estado === "en_confeccion" && Object.keys(rec).length ? '<button class="btn ghost sm" data-a="tdEstado" data-id="' + esc(t.id) + '" data-v="recibida">Cerrar sin recibir el resto</button>' : "") + "</div></div>"
      + ((t.estado === "en_confeccion" || t.estado === "planificada") ? (pt => pt.fundas ? '<div class="note" style="margin:10px 0 0"><b>Falta entregar: ' + pt.fundas + ' funda' + (pt.fundas > 1 ? "s" : "") + '</b><br>Confección a pagar al recibir: <b>' + money(pt.conf) + '</b><br>Si las vendés todas, recibís: <b>' + money(pt.ingreso) + '</b><br>Costo total (materiales, confección y envío): ' + money(pt.costo) + '<br>Ganancia: <b>' + money(pt.gan) + '</b></div>' : "")(plataTanda(t)) : "")
      // lo ya recibido (15/11/2026, lo pidió el dueño): misma cuenta, con las fundas que ya entraron a la tienda
      + (pr => pr.fundas ? '<div class="note ok" style="margin:10px 0 0"><b>Recibidas: ' + pr.fundas + ' funda' + (pr.fundas > 1 ? "s" : "") + '</b><br>Costo total (materiales, confección y envío): ' + money(pr.costo) + '<br>Si las vendés todas, recibís: <b>' + money(pr.ingreso) + '</b><br>Ganancia: <b>' + money(pr.gan) + '</b> · rentabilidad <b>' + (pr.costo ? Math.round(pr.gan / pr.costo * 100) : 0) + '%</b><br><span class="muted small">Con los precios de hoy y la mezcla tarjeta/transferencia de Precios y rentabilidad. Sin publicidad.</span></div>' : "")(plataTanda(t, rec))
      + '<div class="g2" style="margin-top:10px">' + (t.items || []).map(it => { const r = rec[it.producto] || 0, pc = Math.min(100, r / it.cantidad * 100);
        return '<div><div style="display:flex;justify-content:space-between" class="small"><span>' + esc(nombreP(it.producto)) + "</span><b>" + r + " de " + it.cantidad + ' recibidas</b></div><div style="height:8px;border-radius:6px;background:var(--field);border:1px solid var(--line);overflow:hidden;margin-top:4px"><i style="display:block;height:100%;width:' + pc + '%;background:var(--ok)"></i></div></div>'; }).join("") + "</div></div>";
  }).join("");
}
let RCB = null; // recepción en curso
function recibirDlg() {
  const t = T().tandas.find(x => x.id === RCB.id), pend = pendienteTanda(t), cons = {};
  let confTot = 0;
  PRODS.forEach(p => { const n = Math.max(0, Math.floor(nd(RCB.q[p]))); if (n) { consumos(fichaGuardada(p), n, cons); confTot += n * confU(fichaGuardada(p)); } });
  if (RCB.conf == null) RCB.confAuto = true;
  const montoConf = RCB.confAuto ? confTot : nm(RCB.conf);
  const adel = RCB.prov ? Math.max(0, -((saldos()[RCB.prov] || {}).saldo || 0)) : 0;   // lo que ya le pagó por adelantado
  const res = reservado();
  redlg('<div class="row"><h3>Recibir fundas · tanda ' + esc(t.id) + '</h3><button class="x" data-a="cerrar" aria-label="Cerrar">×</button></div>'
    + '<p class="muted small" style="margin:0 0 10px">Poné cuántas te entregaron ahora. Si te entrega en partes, registrá cada entrega por separado.</p>'
    + '<div class="g2">' + (t.items || []).map(it => '<label class="f">' + esc(nombreP(it.producto)) + ' <span class="muted">(faltan ' + (pend[it.producto] || 0) + ')</span><input id="rcb-' + it.producto + '" data-in="rcbQ" data-p="' + it.producto + '" inputmode="numeric" value="' + esc(RCB.q[it.producto] || "") + '"></label>').join("") + "</div>"
    + "<h3 style='margin-top:6px'>Se descuenta del stock de insumos</h3>"
    + (Object.keys(cons).length ? '<div class="tw"><table><tbody>' + Object.keys(cons).map(id => { const i = ins(id); return i ? "<tr><td>" + esc(i.nombre) + '</td><td class="n">' + q(cons[id]) + " " + esc(i.unidad) + '</td><td class="n muted small">quedan ' + q(i.stock - cons[id]) + "</td></tr>" : ""; }).join("") + "</tbody></table></div>" : '<p class="muted small">Nada (poné cantidades o revisá las recetas).</p>')
    + "<h3 style='margin-top:12px'>Confección a pagar</h3><div class='g2'><label class='f'>Quién la hizo<select id='rcbProv' data-ch='rcbProv'>" + opts(activos(T().proveedores), RCB.prov, "Elegí…") + "</select></label>"
    + "<label class='f'>Monto<input id='rcbConf' data-in='rcbConf' inputmode='numeric' value='" + esc(RCB.confAuto ? Math.round(confTot) : RCB.conf) + "'></label></div>"
    + (RCB.confAuto ? "" : "<p class='muted small' style='margin:-6px 0 8px'>Según la ficha serían " + money(confTot) + ". <button class='linkb' data-a='rcbConfAuto'>Usar ese monto</button></p>")
    + (adel > 0 ? "<div class='note info' style='margin:0 0 10px'>Ya le adelantaste <b>" + money(adel) + "</b> a " + esc(provNombre(RCB.prov)) + ": se descuenta solo de esta confección. <b>Dejá “Ya le pagué” vacío</b>" + (montoConf > adel ? " (o poné solo lo que le pagues ahora de los " + money(montoConf - adel) + " que faltan)" : "") + ".</div>" : "")
    + "<div class='g2'><label class='f'>Ya le pagué" + (adel > 0 ? " ahora" : "") + "<input id='rcbPag' data-in='rcbPag' inputmode='numeric' value='" + esc(RCB.pagado || "") + "' placeholder='" + (adel > 0 ? "vacío = ya está pago con el adelanto" : "vacío = queda como deuda") + "'></label><label class='f'>Medio de pago<select id='rcbMedio' data-ch='rcbMedio'>" + ["Transferencia", "Efectivo", "Mercado Pago"].map(m => "<option" + (RCB.medio === m ? " selected" : "") + ">" + m + "</option>").join("") + "</select></label></div>"
    + (montoConf > 0 && !(adel > 0) && nm(RCB.pagado) !== Math.round(montoConf) ? "<p class='small' style='margin:-6px 0 8px'><button class='linkb' data-a='rcbPagTodo'>Le pagué todo (" + money(montoConf) + ")</button></p>" : "")
    + "<label class='check'><input type='checkbox' id='rcbCerrar' data-ch='rcbCerrar'" + (RCB.cerrar ? " checked" : "") + "> Es la última entrega: cerrar la tanda</label>"
    + '<p class="err" id="rcbErr"></p><div class="acts"><button class="btn ghost" data-a="cerrar">Cancelar</button><button class="btn main" data-a="rcbOk">Confirmar: ' + money(montoConf) + " de confección" + (nm(RCB.pagado) > 0 ? " · pagás " + money(nm(RCB.pagado)) : "") + "</button></div>");
  void res;
}

/* ================= PRODUCTOS Y RECETAS ================= */
const PD = {tab: "doble", draft: {}, gastos: null, rollo: null, dirty: false, calcM: "40", calcN: "12"};
function draft(p) { if (!PD.draft[p]) { const f = JSON.parse(JSON.stringify(fichaGuardada(p))); PD.draft[p] = f; } return PD.draft[p]; }
function gastosDraft() { if (!PD.gastos) PD.gastos = JSON.parse(JSON.stringify(T().gastos)); return PD.gastos; }
function rolloDraft() { if (!PD.rollo) PD.rollo = {rollo_ancho: String(conf("rollo_ancho", 150)), margen_costura: String(conf("margen_costura", 1)), rollo_largo: String(conf("rollo_largo", 60))}; return PD.rollo; }
function vProductos() {
  const g = guard(); if (g) return cabecera("Productos y recetas") + g;
  const p = PD.tab, f = draft(p), m = med(f), A = corteDe(f), c = costo(f, gastosDraft()), cat = activos(T().insumos), rd = rolloDraft();
  const usados = (f.receta || []).map(r => r.insumo);
  let h = cabecera("Productos y recetas", "La ficha de cada funda: medidas de corte, qué lleva y cuánto cuesta. La tela, las hebillas y la cinta se calculan solas a partir de las medidas.") + bannerMigrar()
    + '<div class="filters">' + PRODS.map(x => '<button class="chip" data-a="pdTab" data-p="' + x + '" aria-pressed="' + (x === p) + '">' + esc(nombreP(x)) + "</button>").join("") + "</div>";
  h += '<div class="cols2"><div class="block"><h3>Medidas de corte</h3><div class="g3">' + MED_LBL.map(k => '<label class="f">' + k[1] + '<input id="md-' + k[0] + '" data-in="pdMed" data-k="' + k[0] + '" inputmode="decimal"' + (k[0] === "ad" ? ' placeholder="sola (al 30% del ancho)"' : "") + ' value="' + esc(f.medidas && f.medidas[k[0]] != null ? f.medidas[k[0]] : m[k[0]]) + '"></label>').join("") + "</div>"
    + '<p class="muted small" style="margin:-4px 0 10px"><b>Cintas</b>: a cuántos cm del borde (izquierdo y derecho) se cosen las tiras de los respaldos. <b>Abertura</b>: el largo del hueco para el cinturón y a cuántos cm del borde empieza (vacío = se calcula sola).</p>'
    + (!(T().medidasKeys && MED_NUEVAS.every(k => T().medidasKeys.indexOf(k) >= 0)) ? '<div class="note warn" style="margin:0 0 10px">Para que se <b>guarden</b> los cambios en Cintas y Abertura, volvé a pegar el <b>Codigo.gs</b> en Apps Script (Implementar → Nueva versión). Mientras tanto el plano usa 10 cm y 20 cm.</div>' : "")
    + '<p class="muted small" style="margin:-4px 0 10px">Centímetros. El <b>ancho</b> del cuerpo se corta tal cual (los bordes llevan gross: si querés dejarle lugar a Susana para emprolijar, cargalo con algo de más). Al <b>largo</b> se le suma el margen de costura de cada lado de las dos uniones del asiento (4 márgenes). Al lateral se le suma 1 margen en el alto, por la costura con el asiento.</p>'
    + '<div class="note" style="margin-top:0"><b>' + q(telaU(f)) + ' m de tela por funda</b><br><span class="small">Piezas de corte: cuerpo ' + Math.round(A.P.CW) + " × " + Math.round(A.P.CL) + " · " + A.P.nl + " laterales de " + Math.round(A.P.LA) + " × " + Math.round(A.P.LB) + ". Conviene cortar de a " + (A.best ? A.best.n : "—") + " (" + (A.best ? q(A.best.len / 100) : "—") + " m). Un rollo de " + esc(rd.rollo_largo) + " m rinde " + porLargo(A, nd(rd.rollo_largo) * 100) + " fundas.</span></div>"
    + '<div class="acts" style="margin-top:10px"><button class="btn ghost sm" data-a="pdPlano">Ver plano e imprimir ficha</button></div>'
    + '<details id="pdRolloDet" style="margin-top:12px"' + (PD.rolloAbierto ? " open" : "") + '><summary class="small" style="cursor:pointer;font-weight:700">Margen de costura: ' + q(nd(rd.margen_costura)) + ' cm · rollo de ' + q(nd(rd.rollo_ancho)) + ' cm × ' + q(nd(rd.rollo_largo)) + ' m <span class="muted" style="font-weight:600">(tocá para cambiar · vale para todos los productos)</span></summary><div class="g3" style="margin-top:10px">'
    + '<label class="f">Ancho del rollo (cm)<input id="rl-a" data-in="pdRollo" data-k="rollo_ancho" inputmode="decimal" value="' + esc(rd.rollo_ancho) + '"></label>'
    + '<label class="f">Margen de costura (cm)<input id="rl-m" data-in="pdRollo" data-k="margen_costura" inputmode="decimal" value="' + esc(rd.margen_costura) + '"></label>'
    + '<label class="f">Metros por rollo<input id="rl-l" data-in="pdRollo" data-k="rollo_largo" inputmode="decimal" value="' + esc(rd.rollo_largo) + '"></label></div></details></div>';
  // costo
  initRS(); const r = rentConFicha(p, f, c.total);
  h += '<div class="block"><h3>Costo por funda</h3><div class="tw"><table><tbody>'
    + "<tr><td>Materiales</td><td class='n'>" + money(c.mat) + "</td></tr><tr><td>Confección</td><td class='n'>" + money(c.conf) + "</td></tr>"
    + "<tr><td>Gastos compartidos<br><span class='muted small'>" + money(gastosTot(gastosDraft())) + " ÷ " + esc(rd.rollo_largo) + " m × " + q(telaU(f)) + " m</span></td><td class='n'>" + money(c.gastos) + "</td></tr>"
    + (c.otros ? "<tr><td>Otros</td><td class='n'>" + money(c.otros) + "</td></tr>" : "") + (bolsaActiva(f) ? "<tr><td>Bolsa de guardado</td><td class='n'>" + money(c.bolsa) + "</td></tr>" : "") + "<tr><td>Envío gratis (por venta)</td><td class='n'>" + money(c.envio) + "</td></tr>"
    + "<tr class='tot'><td>Costo total</td><td class='n' style='font-size:1.2rem'>" + money(c.total) + "</td></tr></tbody></table></div>"
    + (r ? '<div class="g2" style="margin-top:10px"><div class="kpi"><small>Con tarjeta (' + money(r.pt) + ')</small><b>' + pct(r.rT) + '</b><span class="k2">recibís ' + money(r.recT) + "</span></div><div class='kpi'><small>Transferencia (" + money(r.px) + ")</small><b>" + pct(r.rX) + '</b><span class="k2">ganás ' + money(r.gX) + "</span></div></div>" : "")
    + '<p class="muted small" style="margin:8px 0 0">Rentabilidad = ganancia ÷ costo, con los precios de la web. Para probar precios andá a <button class="linkb" data-go="rentabilidad">Precios y rentabilidad</button>.</p></div></div>';
  // receta
  h += '<div class="block"><h3>Receta: qué lleva cada funda</h3>';
  if (!cat.length) h += '<p class="muted">Primero cargá los insumos en el catálogo. <button class="linkb" data-go="insumos">Ir a Insumos</button></p>';
  h += '<div class="tw"><table><thead><tr><th>Insumo</th><th class="n">Por funda</th><th class="n">Precio</th><th class="n">Costo</th><th></th></tr></thead><tbody>'
    + (f.receta || []).map((x, ix) => { const i = ins(x.insumo), u = usoDe(f, x), au = esAuto(x);
      return "<tr><td style='min-width:200px'><select class='inp' id='rc-i-" + ix + "' data-ch='pdRecIns' data-ix='" + ix + "' aria-label='Insumo'>" + opts(cat.filter(y => y.id === x.insumo || usados.indexOf(y.id) < 0).concat(i && !i.activo ? [i] : []), x.insumo, "Elegí…") + "</select>"
        + "<div class='small' style='margin-top:4px'>" + "<select class='inp' style='width:auto;padding:3px 6px;font-size:.8rem' id='rc-a-" + ix + "' data-ch='pdRecAuto' data-ix='" + ix + "' aria-label='Cálculo'><option value=''>Cantidad fija</option>" + ["tela", "correas", "cinta"].map(a => "<option value='" + a + "'" + (x.auto === a ? " selected" : "") + ">Automático: " + AUTO_TXT[a] + "</option>").join("") + "</select>"
        + (x.auto && !au ? " <span class='pill warn'>Cambiado a mano</span> <button class='linkb' data-a='pdRecAutoVolver' data-ix='" + ix + "'>volver a " + q(autoUso(f, x.auto)) + "</button>" : "") + "</div></td>"
        + "<td class='n'><span class='unitw'><input class='inp xs' id='rc-u-" + ix + "' data-in='pdRecUso' data-ix='" + ix + "' inputmode='decimal' value='" + esc(au ? L.qi(u) : x.uso) + "' aria-label='Cantidad por funda'> " + esc(i ? i.unidad : "") + "</span></td>"
        + "<td class='n muted small'>" + (i ? money(i.precio) + " / " + esc(i.envase) + (i.contenido !== 1 ? "<br>(" + q(i.contenido) + " " + esc(i.unidad) + ")" : "") : "") + "</td>"
        + "<td class='n'>" + money(u * precioU(i)) + "</td><td><button class='x' data-a='pdRecDel' data-ix='" + ix + "' aria-label='Quitar'>×</button></td></tr>"; }).join("")
    + "<tr class='tot'><td colspan='3'>Materiales</td><td class='n'>" + money(c.mat) + "</td><td></td></tr></tbody></table></div>"
    + '<div class="acts" style="margin-top:8px"><button class="btn ghost sm" data-a="pdRecAdd">＋ Agregar insumo a la receta</button><button class="btn ghost sm" data-a="insNuevo">＋ Insumo nuevo en el catálogo</button></div></div>';
  h += vBolsa(f, cat);
  // otros costos
  h += '<div class="cols2" style="margin-top:14px"><div class="block" style="margin-top:0"><h3>Otros costos por funda</h3><div class="g2">'
    + '<label class="f">Confección (se paga al recibir)<input id="pd-conf" data-in="pdNum" data-k="confeccion" inputmode="numeric" value="' + esc(f.confeccion) + '"></label>'
    + '<label class="f">Envío gratis (lo pagás en cada venta)<input id="pd-env" data-in="pdNum" data-k="envio" inputmode="numeric" value="' + esc(f.envio) + '"></label></div>'
    + (f.otros || []).map((o, ix) => '<div class="g2" style="align-items:end"><label class="f">Concepto<input id="ot-c-' + ix + '" data-in="pdOtro" data-ix="' + ix + '" data-k="concepto" value="' + esc(o.concepto) + '"></label><div class="acts" style="flex-wrap:nowrap;margin-bottom:12px"><input class="inp" id="ot-m-' + ix + '" data-in="pdOtro" data-ix="' + ix + '" data-k="monto" inputmode="numeric" value="' + esc(o.monto) + '" aria-label="Monto"><button class="x" data-a="pdOtroDel" data-ix="' + ix + '" aria-label="Quitar">×</button></div></div>').join("")
    + '<button class="btn ghost sm" data-a="pdOtroAdd">＋ Otro costo por funda</button></div>';
  const gd = gastosDraft();
  h += '<div class="block" style="margin-top:0"><h3>Gastos compartidos</h3><p class="muted small" style="margin:-4px 0 10px">Gastos de todo el rollo (flete, publicación, web). Se reparten entre las fundas según la tela que usa cada una.</p>'
    + gd.map((x, ix) => '<div style="display:grid;grid-template-columns:auto minmax(0,1fr) 110px auto;gap:8px;align-items:center;margin-bottom:8px"><input type="checkbox" id="gs-a-' + ix + '" data-ch="pdGastoAct" data-ix="' + ix + '"' + (x.activo !== false ? " checked" : "") + ' aria-label="Incluir"><input class="inp" id="gs-c-' + ix + '" data-in="pdGasto" data-ix="' + ix + '" data-k="concepto" value="' + esc(x.concepto) + '" aria-label="Concepto"><input class="inp" id="gs-t-' + ix + '" data-in="pdGasto" data-ix="' + ix + '" data-k="total" inputmode="numeric" value="' + esc(x.total) + '" aria-label="Total"><button class="x" data-a="pdGastoDel" data-ix="' + ix + '" aria-label="Quitar">×</button></div>').join("")
    + '<div class="acts"><button class="btn ghost sm" data-a="pdGastoAdd">＋ Gasto compartido</button><b style="margin-left:auto">Total ' + money(gastosTot(gd)) + "</b></div></div></div>";
  h += '<div style="' + (PD.dirty ? "position:sticky;bottom:calc(12px + env(safe-area-inset-bottom,0px));" : "") + 'margin-top:16px;z-index:5"><div class="block acts" style="justify-content:space-between;margin:0;box-shadow:0 6px 24px rgba(0,0,0,.12);' + (PD.dirty ? "border-color:var(--warn)" : "") + '">'
    + "<span>" + (PD.dirty ? "<b>Tenés cambios sin guardar.</b>" : '<span class="muted">Sin cambios.' + (fichaGuardada(p).actualizado ? " Guardado " + esc(fichaGuardada(p).actualizado) : "") + "</span>") + "</span>"
    + '<span class="acts"><button class="btn ghost" data-a="pdDescartar"' + (PD.dirty ? "" : " disabled") + '>Descartar</button><button class="btn main" data-a="pdGuardar"' + (PD.dirty ? "" : " disabled") + ">Guardar</button></span></div></div>";
  return h;
}
function vBolsa(f, cat) {
  const sinBackend = !(T().version >= 3);
  let h = '<div class="block"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h3 style="margin:0">Bolsa de guardado</h3>'
    + (f.bolsa ? '<label class="check small"><input type="checkbox" id="bo-act" data-ch="pdBolsaAct"' + (f.bolsa.activa !== false ? " checked" : "") + "> Sumarla al costo de la funda</label>" : "") + "</div>";
  if (sinBackend) h += '<div class="note warn">Para guardar la bolsa hace falta el <b>Codigo.gs nuevo</b> (versión 3). Pegalo en Apps Script y publicá una nueva versión.</div>';
  if (!f.bolsa) return h + '<p class="muted" style="margin:8px 0 10px">La bolsa con cierre en la que va la funda. Se corta de una pieza doblada y su costo se suma al de la funda, a las compras de la tanda y a lo que se descuenta del stock.</p><button class="btn ghost" data-a="pdBolsaAdd">＋ Agregar bolsa</button></div>';
  const b = f.bolsa, P = bolsaCorte(b), tl = bolsaTela(b), bc = bolsaCosto(f, true), off = b.activa === false;
  h += '<p class="muted small" style="margin:6px 0 10px">Una pieza doblada. El <b>ancho</b> es el lado de la abertura (cierre); el <b>alto</b> se duplica al doblar. Medidas terminadas, en cm.</p>'
    + '<div class="g3" style="grid-template-columns:repeat(4,minmax(0,1fr))">'
    + '<label class="f">Ancho terminado<input id="bo-an" data-in="pdBolsa" data-k="ancho" inputmode="decimal" value="' + esc(b.ancho) + '"></label>'
    + '<label class="f">Alto terminado<input id="bo-al" data-in="pdBolsa" data-k="alto" inputmode="decimal" value="' + esc(b.alto) + '"></label>'
    + '<label class="f">Costura<input id="bo-co" data-in="pdBolsa" data-k="costura" inputmode="decimal" value="' + esc(b.costura) + '"></label>'
    + '<label class="f">Ancho del rollo<input id="bo-ro" data-in="pdBolsa" data-k="rollo" inputmode="decimal" value="' + esc(nd(b.rollo) ? b.rollo : "") + '" placeholder="' + esc(conf("rollo_ancho", 150)) + '"></label></div>'
    + '<div class="note" style="margin-top:0' + (off ? ";opacity:.6" : "") + '"><b>Corte: ' + q(P.largo) + " × " + q(P.ancho) + " cm</b> (una pieza; se dobla al medio y queda " + q(nd(b.ancho)) + " × " + q(nd(b.alto)) + ")"
    + (tl.noEntra ? '<br><span class="neg">La pieza no entra en el ancho del rollo.</span>' : "<br><span class='small'>En un rollo de " + q(bolsaRollo(b)) + " cm entran " + tl.porFila + " por fila (con el lado de " + q(tl.atravesado === "largo" ? P.largo : P.ancho) + " cm a lo ancho del rollo): <b>" + q(tl.m) + " m de tela por bolsa</b>.</span>") + "</div>"
    + (tl.porFila ? bolsaCalc(f) : "")
    + '<div class="tw" style="margin-top:10px"><table><thead><tr><th>Insumo</th><th>Cómo se calcula</th><th class="n">Por bolsa</th><th class="n">Costo</th><th></th></tr></thead><tbody>'
    + (b.items || []).map((x, ix) => { const i = ins(x.insumo), u = bolsaUso(b, x);
      return "<tr><td style='min-width:180px'><select class='inp' id='bi-i-" + ix + "' data-ch='pdBolsaIns' data-ix='" + ix + "' aria-label='Insumo'>" + opts(cat.concat(i && !i.activo ? [i] : []), x.insumo, "Elegí…") + "</select></td>"
        + "<td><select class='inp' style='min-width:170px' id='bi-c-" + ix + "' data-ch='pdBolsaCalc' data-ix='" + ix + "' aria-label='Cómo se calcula'>" + Object.keys(BOLSA_CALC).map(k => "<option value='" + k + "'" + (x.calc === k ? " selected" : "") + ">" + BOLSA_CALC[k] + "</option>").join("") + "</select></td>"
        + "<td class='n'>" + (x.calc === "fija" ? "<span class='unitw'><input class='inp xs' id='bi-u-" + ix + "' data-in='pdBolsaUso' data-ix='" + ix + "' inputmode='decimal' value='" + esc(x.uso == null ? "" : x.uso) + "' aria-label='Cantidad por bolsa'> " + esc(i ? i.unidad : "") + "</span>" : q(u) + " " + esc(i ? i.unidad : "")) + "</td>"
        + "<td class='n'>" + money(u * precioU(i)) + "</td><td><button class='x' data-a='pdBolsaDel' data-ix='" + ix + "' aria-label='Quitar'>×</button></td></tr>"; }).join("")
    + "<tr><td colspan='3'>Materiales de la bolsa</td><td class='n'><b>" + money(bc.mat) + "</b></td><td></td></tr></tbody></table></div>"
    + '<div class="acts" style="margin-top:8px"><button class="btn ghost sm" data-a="pdBolsaItemAdd">＋ Agregar insumo a la bolsa</button></div>'
    + '<div class="g2" style="margin-top:14px"><label class="f">Confección de la bolsa (Susana, por bolsa)<input id="bo-cf" data-in="pdBolsa" data-k="confeccion" inputmode="numeric" value="' + esc(b.confeccion) + '"></label><div></div></div>'
    + (b.servicios || []).map((x, ix) => '<div class="g2" style="align-items:end"><label class="f">Agregado o servicio<input id="bs-c-' + ix + '" data-in="pdBolsaServ" data-ix="' + ix + '" data-k="concepto" value="' + esc(x.concepto) + '"></label><div class="acts" style="flex-wrap:nowrap;margin-bottom:12px"><input class="inp" id="bs-m-' + ix + '" data-in="pdBolsaServ" data-ix="' + ix + '" data-k="monto" inputmode="numeric" value="' + esc(x.monto) + '" aria-label="Costo por bolsa"><button class="x" data-a="pdBolsaServDel" data-ix="' + ix + '" aria-label="Quitar">×</button></div></div>').join("")
    + '<div class="acts" style="justify-content:space-between"><button class="btn ghost sm" data-a="pdBolsaServAdd">＋ Agregado (sublimación, etiqueta…)</button><b>Total bolsa: ' + money(bc.total) + (off ? ' <span class="pill mute">no se suma a la funda</span>' : "") + "</b></div>"
    + '<div class="acts" style="margin-top:10px"><button class="linkb small" data-a="pdBolsaQuitar">Quitar la bolsa de este producto</button></div></div>';
  return h;
}
function bolsaCalc(f) {
  const m = nd(PD.calcM), n = Math.max(0, Math.floor(nd(PD.calcN))), b = f.bolsa;
  const otro = PRODS.filter(p => p !== f.producto).map(p => PD.draft[p] || fichaGuardada(p)).find(x => x.bolsa && bolsaFila(x.bolsa));
  return '<div style="border:1.5px solid var(--line);border-radius:14px;padding:12px 14px;margin-top:10px"><b>¿Cuántas salen?</b>'
    + '<div class="g2" style="margin-top:8px;align-items:start"><div>'
    + '<label class="f" style="margin-bottom:4px">Si comprás<span class="unitw"><input class="inp xs" id="bk-m" data-in="pdCalc" data-k="calcM" inputmode="decimal" value="' + esc(PD.calcM) + '"> metros</span></label>'
    + '<div>salen <b style="font-size:1.25rem">' + bolsasDe(b, m) + "</b> bolsas de " + q(nd(b.ancho)) + " × " + q(nd(b.alto))
    + (otro ? '<br><span class="muted small">o ' + bolsasDe(otro.bolsa, m) + " de " + q(nd(otro.bolsa.ancho)) + " × " + q(nd(otro.bolsa.alto)) + " (" + esc(nombreP(otro.producto)) + ")</span>" : "")
    + '<br><span class="muted small">Un rollo de 100 m: ' + bolsasDe(b, 100) + " bolsas</span></div></div><div>"
    + '<label class="f" style="margin-bottom:4px">Para hacer<span class="unitw"><input class="inp xs" id="bk-n" data-in="pdCalc" data-k="calcN" inputmode="numeric" value="' + esc(PD.calcN) + '"> bolsas</span></label>'
    + '<div>necesitás <b style="font-size:1.25rem">' + q(metrosPara(b, n)) + " m</b>" + (n ? '<br><span class="muted small">' + money(metrosPara(b, n) * precioU(ins((b.items.find(x => x.calc === "tela") || {}).insumo))) + " de tela</span>" : "") + "</div></div></div>"
    + '<p class="muted small" style="margin:8px 0 0">Calculado por filas enteras de ' + bolsaFila(b).k + " bolsas a lo ancho del rollo. Si hacés bolsas de los dos tamaños, en Planificar tanda ves la tela total que lleva la tanda.</p></div>";
}
function rentConFicha(p, f, C) {
  initRS(); const pr = RS.precios[p]; const pt = nm(pr.t), px = nm(pr.x), com = nd(RS.comision) / 100; if (!pt && !px) return null;
  const recT = pt * (1 - com); return {pt: pt, px: px, recT: recT, rT: C > 0 ? (recT - C) / C : 0, rX: C > 0 ? (px - C) / C : 0, gX: px - C};
}
function sucio() { PD.dirty = true; }

/* ================= INSUMOS ================= */
const IV = {archivados: false};
function vInsumos() {
  const g = guard(); if (g) return cabecera("Insumos") + g;
  const res = reservado(), lista = T().insumos.filter(i => IV.archivados || i.activo !== false), bajos = bajoMinimo();
  const valor = activos(T().insumos).reduce((a, i) => a + Math.max(0, i.stock) * precioU(i), 0);
  let h = cabecera("Insumos", "Un solo catálogo para todo: recetas, compras y stock. El stock se mueve solo con cada compra y cada tanda recibida; si algo no coincide, corregilo desde el insumo.",
    '<button class="btn ghost" data-a="stockCargar">Cargar o contar stock</button><button class="btn ghost" data-a="compraNueva">Registrar compra</button><button class="btn main" data-a="insNuevo">＋ Nuevo insumo</button>') + bannerMigrar() + avisoSinStock();
  h += '<div class="cards" style="margin-top:0"><div class="kpi"><small>Insumos</small><b>' + activos(T().insumos).length + '</b></div><div class="kpi' + (bajos.length ? " bad" : " ok") + '"><small>Bajo el mínimo</small><b>' + bajos.length + '</b></div><div class="kpi"><small>Valor del stock</small><b>' + money(valor) + '</b></div><div class="kpi"><small>Reservado para el taller</small><b>' + Object.keys(res).filter(k => res[k] > 0).length + '</b><span class="k2">insumos en tandas en confección</span></div></div>';
  if (!lista.length) return h + '<div class="empty" style="margin-top:14px">Todavía no hay insumos cargados.</div>';
  h += '<div class="block"><div class="tw"><table><thead><tr><th>Insumo</th><th>Proveedor</th><th class="n">Precio</th><th class="n">Stock</th><th class="n">Taller</th><th class="n">Disponible</th><th></th></tr></thead><tbody>'
    + lista.map(i => { const d = disponible(i, res), u = esc(i.unidad), est = i.activo === false ? '<span class="pill mute">Archivado</span>' : d < 0 ? '<span class="pill bad">Negativo</span>' : i.minimo > 0 && d < i.minimo ? '<span class="pill bad">Bajo mínimo</span>' : i.minimo > 0 ? '<span class="pill ok">OK</span>' : "";
      return '<tr class="click' + (i.activo === false ? " off" : "") + '" data-a="insVer" data-id="' + esc(i.id) + '" tabindex="0"><td><b>' + esc(i.nombre) + "</b>" + (i.descripcion ? '<br><span class="muted small">' + esc(i.descripcion) + "</span>" : "") + "</td><td>" + esc(provNombre(i.proveedor)) + '</td><td class="n">' + money(i.precio) + ' <span class="muted small">/ ' + esc(i.envase) + "</span>" + (i.contenido !== 1 ? '<br><span class="muted small">' + money(precioU(i)) + " / " + u + "</span>" : "") + "</td>"
        + '<td class="n">' + q(i.stock) + " " + u + '<br><span class="muted small">' + envTxt(i, i.stock) + "</span></td>" + '<td class="n muted">' + (res[i.id] ? "−" + q(res[i.id]) + " " + u : "—") + '</td><td class="n"><b>' + q(d) + " " + u + "</b>" + (i.minimo ? '<br><span class="muted small">mín. ' + q(i.minimo) + "</span>" : "") + "</td><td>" + est + "</td></tr>"; }).join("")
    + "</tbody></table></div>" + '<label class="check small" style="margin-top:10px"><input type="checkbox" id="insArch" data-ch="insArch"' + (IV.archivados ? " checked" : "") + "> Mostrar archivados</label></div>";
  h += '<div class="block"><h3>Últimos movimientos</h3>' + (T().movimientos.length ? '<div class="tw"><table><thead><tr><th>Fecha</th><th>Insumo</th><th>Tipo</th><th>Detalle</th><th class="n">Cantidad</th></tr></thead><tbody>'
    + T().movimientos.slice(0, 25).map(m => { const i = ins(m.insumo); return "<tr><td>" + esc(m.fecha) + "</td><td>" + esc(i ? i.nombre : m.insumo) + "</td><td>" + esc(m.tipo) + '</td><td class="small">' + esc(m.detalle) + '</td><td class="n ' + (m.cantidad > 0 ? "pos" : "neg") + '">' + (m.cantidad > 0 ? "+" : "") + q(m.cantidad) + " " + esc(i ? i.unidad : "") + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="muted" style="margin:0">Sin movimientos todavía.</p>') + "</div>";
  return h;
}
let ID = null; // insumo en edición
function insDlg() {
  const i = ID, nuevo = !i.id || !ins(i.id), real = !nuevo && ins(i.id), movs = nuevo ? [] : T().movimientos.filter(m => m.insumo === i.id).slice(0, 30);
  const enRecetas = nuevo ? [] : PRODS.filter(p => (fichaGuardada(p).receta || []).some(r => r.insumo === i.id));
  redlg('<div class="row"><h3>' + (nuevo ? "Nuevo insumo" : esc(real.nombre)) + '</h3><button class="x" data-a="cerrar" aria-label="Cerrar">×</button></div>'
    + '<label class="f">Nombre<input id="in-n" data-in="insF" data-k="nombre" value="' + esc(i.nombre) + '" placeholder="Ej. Cinta mochilera 20 mm"></label>'
    + '<label class="f">Descripción (opcional)<input id="in-d" data-in="insF" data-k="descripcion" value="' + esc(i.descripcion) + '" placeholder="Ej. Tracker impermeable + guata + tracker común"></label>'
    + '<label class="f">Proveedor<select id="in-p" data-ch="insProv">' + opts(activos(T().proveedores), i.proveedor, "Sin proveedor") + "</select></label>"
    + '<p class="muted small" style="margin:0 0 6px">Cómo lo comprás. Ejemplos: un rollo de 59 m → <b>rollo · 59 · m</b>. Tela por metro → <b>metro · 1 · m</b>. Hebillas sueltas → <b>unidad · 1 · u</b>. La unidad es la que usa la receta: la tela tiene que ir en <b>m</b>.</p>'
    + '<div class="g3"><label class="f">Se compra por<input id="in-e" data-in="insF" data-k="envase" value="' + esc(i.envase) + '" placeholder="rollo, metro, unidad"></label><label class="f">Cada uno trae<input id="in-c" data-in="insF" data-k="contenido" inputmode="decimal" value="' + esc(i.contenido) + '"></label><label class="f">Unidad<input id="in-u" data-in="insF" data-k="unidad" value="' + esc(i.unidad) + '" placeholder="m, u"></label></div>'
    + '<div class="g2"><label class="f">Precio por ' + esc(i.envase || "envase") + '<input id="in-pr" data-in="insF" data-k="precio" inputmode="numeric" value="' + esc(i.precio) + '"></label><label class="f">Stock mínimo (' + esc(i.unidad || "u") + ')<input id="in-mi" data-in="insF" data-k="minimo" inputmode="decimal" value="' + esc(i.minimo) + '"></label></div>'
    + (nm(i.contenido) > 0 && nm(i.precio) > 0 ? '<p class="muted small" style="margin:-4px 0 8px">Sale ' + money(nm(i.precio) / nd(i.contenido)) + " por " + esc(i.unidad || "unidad") + ".</p>" : "")
    + (enRecetas.length ? '<p class="muted small" style="margin:0 0 8px">Se usa en: ' + enRecetas.map(nombreP).map(esc).join(", ") + ". Si cambiás el precio, cambia el costo de esas fundas.</p>" : "")
    + '<p class="err" id="inErr"></p><div class="acts">' + (nuevo ? "" : '<button class="btn danger" data-a="insBorrar" style="margin-right:auto">' + (real.activo === false ? "Ya está archivado" : "Archivar / borrar") + "</button>") + '<button class="btn ghost" data-a="cerrar">Cancelar</button><button class="btn main" data-a="insGuardar">Guardar</button></div>'
    + (nuevo ? "" : '<hr style="border:0;border-top:1px solid var(--line);margin:18px 0"><h3>Stock: ' + q(real.stock) + " " + esc(real.unidad) + envTxt(real, real.stock) + "</h3>"
      + '<p class="muted small" style="margin:-4px 0 8px">Para cargar el stock inicial o corregirlo si contaste y no coincide. Las compras se cargan con Registrar compra.</p>'
      + '<div class="g2"><label class="f">Stock real contado (' + esc(real.unidad) + ')<input id="aj-n" inputmode="decimal" placeholder="' + esc(q(real.stock)) + '"></label><label class="f">Motivo<input id="aj-m" placeholder="' + (movs.length ? "Ej. Conté y había menos" : "Stock inicial") + '"></label></div>'
      + '<button class="btn ghost" data-a="insAjustar">Guardar stock</button>'
      + (movs.length ? '<div class="tw" style="margin-top:12px"><table><tbody>' + movs.map(m => "<tr><td class='small'>" + esc(m.fecha) + "</td><td class='small'>" + esc(m.tipo) + " · " + esc(m.detalle) + "</td><td class='n " + (m.cantidad > 0 ? "pos" : "neg") + "'>" + (m.cantidad > 0 ? "+" : "") + q(m.cantidad) + "</td></tr>").join("") + "</tbody></table></div>" : "")));
}

function avisoSinStock() {
  const L2 = activos(T().insumos); if (!L2.length || L2.some(i => i.stock !== 0)) return "";
  return '<div class="note warn" style="margin:0 0 14px"><b>Todavía no cargaste el stock de los insumos.</b> Contá lo que tenés (incluido lo que le diste a Susana para la tanda en confección) y cargalo todo junto. Si lo tenías en las herramientas anteriores, lo traigo para que solo lo revises.<div class="acts" style="margin-top:10px"><button class="btn main" data-a="stockCargar">Cargar stock</button></div></div>';
}
/* ---------- cargar o contar el stock de todos los insumos juntos ---------- */
let SC = null;
function stockDlg() {
  const lista = activos(T().insumos);
  if (!lista.length) { redlg('<div class="row"><h3>Cargar o contar stock</h3><button class="x" data-a="cerrar" aria-label="Cerrar">×</button></div>'
    + '<div class="note warn" style="margin:0"><b>Todavía no hay insumos en el catálogo.</b> El stock se carga por insumo, así que primero hay que tenerlos. Importalos de tus herramientas anteriores (trae también el stock que tenías) o cargalos a mano.</div>'
    + '<div class="acts"><button class="btn ghost" data-a="insNuevo">＋ Nuevo insumo</button><button class="btn main" data-a="tMigrar">Importar de las herramientas anteriores</button></div>'); return; }
  redlg('<div class="row"><h3>Cargar o contar stock</h3><button class="x" data-a="cerrar" aria-label="Cerrar">×</button></div>'
    + '<p class="muted" style="margin:0 0 10px">Poné lo que tenés de cada insumo, en la unidad indicada. Incluí lo que le diste a Susana para la tanda que está en confección: el panel lo reserva solo. Dejá en blanco lo que no quieras cambiar.</p>'
    + (SC.fuente ? '<div class="note info" style="margin:0 0 10px">' + SC.fuente + "</div>" : "")
    + '<div class="tw"><table><thead><tr><th>Insumo</th><th class="n">En el sistema</th><th class="n">Lo que tenés</th></tr></thead><tbody>'
    + lista.map(i => { const v = SC.v[i.id] != null ? SC.v[i.id] : "", cambia = v !== "" && Math.abs(nd(v) - i.stock) > 1e-9;
      return "<tr><td><b>" + esc(i.nombre) + "</b>" + (i.contenido !== 1 ? "<br><span class='muted small'>" + esc(i.envase) + " de " + q(i.contenido) + " " + esc(i.unidad) + "</span>" : "") + (SC.viejo[i.id] != null ? "<br><span class='small' style='color:var(--info)'>Valor anterior: " + q(SC.viejo[i.id]) + " " + esc(i.unidad) + "</span>" : "") + "</td>"
        + "<td class='n'>" + q(i.stock) + " " + esc(i.unidad) + "</td><td class='n'><span class='unitw'><input class='inp xs' id='sc-" + esc(i.id) + "' data-in='scV' data-id='" + esc(i.id) + "' inputmode='decimal' value='" + esc(v) + "' placeholder='" + esc(L.qi(i.stock)) + "' aria-label='Stock de " + esc(i.nombre) + "'> " + esc(i.unidad) + "</span>" + (cambia ? "<br><span class='pill " + (nd(v) > i.stock ? "ok" : "warn") + "'>" + (nd(v) > i.stock ? "+" : "") + q(nd(v) - i.stock) + "</span>" : "") + "</td></tr>"; }).join("")
    + '</tbody></table></div><label class="f" style="margin-top:12px">Motivo<input id="sc-m" data-in="scM" value="' + esc(SC.motivo) + '"></label>'
    + '<p class="err" id="scErr"></p><div class="acts"><button class="btn ghost" data-a="cerrar">Cancelar</button><button class="btn main" data-a="scOk">Guardar stock</button></div>', true);
}
/* ================= PROVEEDORES Y PAGOS ================= */
/* ================= PROVEEDORES Y GASTOS (estilo app del banco) =================
   Una sola pantalla con dos pestañas (Proveedores | Gastos). Tocar un proveedor abre su ficha
   (cuánto le debés, Pagar/Compra/WhatsApp e historial por mes). Lo pidió el dueño el 11/11/2026. */
const PV = {tab: "prov", sel: ""};
const GS_TIPO = {insumos: "Insumos", confeccion: "Mano de obra", otro: "Otro gasto"};
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function mesNombre(ym) { const p = String(ym).split("-"); const n = MESES[+p[1] - 1] || ym; return n.charAt(0).toUpperCase() + n.slice(1) + (p[0] !== hoyISO().slice(0, 4) ? " " + p[0] : ""); }
function inicial(n) { return esc((String(n || "?").trim().charAt(0) || "?").toUpperCase()); }
function ddmm(f) { const s = fFecha(f); return String(f).slice(0, 4) === hoyISO().slice(0, 4) ? s.slice(0, 5) : s; }
// cuánto falta pagar de cada compra: los pagos de cada proveedor cubren primero las compras más viejas
function deudaPorCompra() {
  const pagado = {}, falta = {};
  T().pagos.forEach(p => { pagado[p.proveedor] = (pagado[p.proveedor] || 0) + p.monto; });
  T().compras.slice().sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0).forEach(c => {
    const usa = Math.min(c.total, Math.max(0, pagado[c.proveedor] || 0));
    pagado[c.proveedor] = (pagado[c.proveedor] || 0) - usa; falta[c.id] = c.total - usa;
  });
  return falta;
}
const porFecha = (a, b) => a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0;
function porMes(lista, fila, total) { // agrupa por mes (más nuevo primero) con el total del mes en el título
  const g = {}; lista.forEach(x => { const k = String(x.fecha || "").slice(0, 7); (g[k] = g[k] || []).push(x); });
  return Object.keys(g).sort().reverse().map(k => '<div class="bk-mes"><span>' + esc(mesNombre(k)) + "</span><span>" + money(g[k].reduce((a, x) => a + total(x), 0)) + '</span></div><div class="bk-list">' + g[k].map(fila).join("") + "</div>").join("");
}
function notaPago(n) { return String(n || "").replace(/Pago de la compra C-[\w-]+/, "").trim(); } // el código interno de la compra no le dice nada al dueño
// una compra con varios insumos se ve como lista (uno debajo del otro), no todo en un renglón con comas
function detalleCompra(c) {
  const partes = String(c.detalle || "").split(/,\s+/).map(x => x.trim()).filter(Boolean);
  if (partes.length < 2) return "<b>" + esc(c.detalle || GS_TIPO[c.tipo] || "Gasto") + "</b>";
  return "<b>" + (c.tipo === "insumos" ? "Compra de insumos" : "Gasto") + ' <span class="bk-n">(' + partes.length + ")</span></b><ul class=\"bk-ul\">" + partes.map(x => "<li>" + esc(x) + "</li>").join("") + "</ul>";
}
function estadoTxt(f, total) { return f <= 0 ? '<span class="ok">pagado</span>' : '<span class="neg">debés' + (f < total ? " " + money(f) : "") + "</span>"; }
function vProveedores() {
  const g = guard(); if (g) return cabecera("Proveedores y gastos") + g;
  if (PV.sel && !T().proveedores.some(p => p.id === PV.sel && p.activo !== false)) PV.sel = "";
  if (PV.sel) return fichaProv(PV.sel);
  const sal = saldos(), mes = hoyISO().slice(0, 7), deuda = Object.keys(sal).reduce((a, k) => a + Math.max(0, sal[k].saldo), 0);
  const delMes = T().compras.filter(c => String(c.fecha).slice(0, 7) === mes), gastoMes = delMes.reduce((a, c) => a + c.total, 0);
  let h = '<div class="bk">' + cabecera("Proveedores y gastos") + bannerMigrar()
    + '<div class="bk-tabs" role="tablist"><button data-a="pvTab" data-t="prov" aria-pressed="' + (PV.tab === "prov") + '">Proveedores</button><button data-a="pvTab" data-t="gastos" aria-pressed="' + (PV.tab === "gastos") + '">Gastos</button></div>';
  if (PV.tab === "gastos") {
    const falta = deudaPorCompra(), sub = {};
    delMes.forEach(c => { const t = GS_TIPO[c.tipo] || "Otro gasto"; sub[t] = (sub[t] || 0) + c.total; });
    h += '<div class="bk-hero"><small>Gastaste en ' + esc(MESES[+mes.slice(5) - 1]) + "</small><b>" + money(gastoMes) + '</b><div class="s">' + Object.keys(sub).map(k => "<span>" + esc(k) + " <b>" + money(sub[k]) + "</b></span>").join("") + (deuda > 0 ? "<span>Debés <b>" + money(deuda) + "</b></span>" : "") + "</div></div>";
    if (!T().compras.length) return h + '<div class="empty">Todavía no cargaste gastos.</div></div>';
    return h + porMes(T().compras.slice().sort(porFecha), c => '<button class="bk-it" data-a="pvVer" data-prov="' + esc(c.proveedor) + '"><span class="bk-av">' + inicial(provNombre(c.proveedor)) + '</span><span class="bk-tx"><b>' + esc(provNombre(c.proveedor)) + "</b><span>" + ddmm(c.fecha) + " · " + esc(GS_TIPO[c.tipo] || "Otro gasto") + '</span></span><span class="bk-rt"><b>' + money(c.total) + "</b>" + estadoTxt(falta[c.id] || 0, c.total) + "</span></button>", c => c.total) + "</div>";
  }
  h += '<div class="bk-hero' + (deuda > 0 ? "" : " al") + '"><small>Debés en total</small><b>' + money(deuda) + '</b><div class="s"><span>Este mes gastaste <b>' + money(gastoMes) + "</b></span><span>Pagaste <b>" + money(T().pagos.filter(x => String(x.fecha).slice(0, 7) === mes).reduce((a, x) => a + x.monto, 0)) + "</b></span></div></div>"
    + '<div class="bk-acts"><button class="btn main" data-a="compraNueva">＋ Compra</button><button class="btn ghost" data-a="cargoNuevo">＋ Otro gasto</button></div>';
  const lista = T().proveedores.filter(p => p.activo !== false).sort((x, y) => ((sal[y.id] || {}).saldo || 0) - ((sal[x.id] || {}).saldo || 0));
  if (!lista.length) return h + '<div class="empty">Todavía no cargaste proveedores.</div><p class="bk-c"><button class="btn ghost sm" data-a="provNuevo">＋ Nuevo proveedor</button></p></div>';
  const ultima = {}; T().compras.forEach(c => { if (!ultima[c.proveedor] || c.fecha > ultima[c.proveedor]) ultima[c.proveedor] = c.fecha; });
  h += '<div class="bk-list">' + lista.map(p => { const sl = (sal[p.id] || {}).saldo || 0;
    return '<button class="bk-it" data-a="pvVer" data-prov="' + esc(p.id) + '"><span class="bk-av">' + inicial(p.nombre) + '</span><span class="bk-tx"><b>' + esc(p.nombre) + "</b><span>" + (ultima[p.id] ? "Último gasto " + ddmm(ultima[p.id]) : esc(p.lugar || "Sin gastos todavía")) + '</span></span><span class="bk-rt"><b>' + money(Math.abs(sl)) + "</b>" + (sl > 0 ? '<span class="neg">debés</span>' : sl < 0 ? '<span class="info">adelanto</span>' : '<span class="ok">al día</span>') + '</span><span class="bk-chev">›</span></button>'; }).join("") + "</div>"
    + '<p class="bk-c"><button class="btn ghost sm" data-a="provNuevo">＋ Nuevo proveedor</button></p></div>';
  return h;
}
function fichaProv(id) {
  const p = prov(id), s = saldos()[id] || {saldo: 0, cargos: 0, pagos: 0}, tandaAbierta = T().tandas.some(t => t.proveedor === id && t.estado === "en_confeccion"), tel = String(p.telefono || "").replace(/\D/g, ""), falta = deudaPorCompra();
  let h = '<div class="bk"><button class="bk-back" data-a="pvVolver">‹ Proveedores</button>'
    + '<div class="bk-head"><span class="bk-av big">' + inicial(p.nombre) + "</span><div><h2>" + esc(p.nombre) + '</h2><span class="muted small">' + esc([p.lugar, p.telefono].filter(Boolean).join(" · ") || "Sin contacto") + "</span></div></div>"
    + (s.saldo > 0 ? '<div class="bk-hero rojo"><small>Le debés</small><b>' + money(s.saldo) + "</b></div>"
      : s.saldo < 0 ? (tandaAbierta ? '<div class="bk-hero azul"><small>Adelanto a cuenta de la tanda en confección</small><b>' + money(-s.saldo) + '</b><div class="s"><span>Se descuenta solo cuando recibas las fundas en Tandas → Recibir fundas (ahí dejá “Ya le pagué” vacío). No hace falta cargar nada más.</span></div></div>'
        : '<div class="bk-hero azul"><small>Adelanto (pagaste antes de cargar la compra)</small><b>' + money(-s.saldo) + '</b><div class="s"><span>Pagaste ' + money(s.pagos) + " y figuran " + money(s.cargos) + " en compras. Se descuenta cuando cargues la compra.</span></div></div>")
      : '<div class="bk-hero al"><small>Estás al día</small><b>' + money(0) + "</b></div>")
    + '<div class="bk-acts">' + (s.saldo > 0 ? '<button class="btn main" data-a="pagoNuevo" data-prov="' + esc(id) + '">Pagar</button>' : "")
    + (s.saldo < 0 && !tandaAbierta ? '<button class="btn main" data-a="cargoFalta" data-prov="' + esc(id) + '" data-monto="' + Math.round(-s.saldo) + '">Cargar la compra</button>' : "")
    + '<button class="btn ' + (s.saldo > 0 || (s.saldo < 0 && !tandaAbierta) ? "ghost" : "main") + '" data-a="compraNueva" data-prov="' + esc(id) + '">Compra</button>'
    + (s.saldo <= 0 ? '<button class="btn ghost" data-a="pagoNuevo" data-prov="' + esc(id) + '">Pago</button>' : "")
    + (tel ? '<a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/' + esc(tel.length <= 10 ? "549" + tel : tel) + '">WhatsApp</a>' : "") + "</div>";
  const mov = T().compras.filter(c => c.proveedor === id).map(c => ({fecha: c.fecha, c: c})).concat(T().pagos.filter(x => x.proveedor === id).map(x => ({fecha: x.fecha, p: x})))
    .sort((a, b) => a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : (a.p ? -1 : 1));
  h += mov.length ? porMes(mov, m => m.c
      ? '<div class="bk-it"><span class="bk-tx">' + detalleCompra(m.c) + "<span>" + ddmm(m.c.fecha) + " · " + esc(GS_TIPO[m.c.tipo] || "Otro gasto") + '</span></span><span class="bk-rt"><b>' + money(m.c.total) + "</b>" + estadoTxt(falta[m.c.id] || 0, m.c.total) + "</span><button class='x' data-a='cpAnular' data-id='" + esc(m.c.id) + "' aria-label='Anular compra' title='Anular'>×</button></div>"
      : '<div class="bk-it"><span class="bk-tx"><b>Pago</b><span>' + ddmm(m.p.fecha) + (m.p.medio ? " · " + esc(m.p.medio) : "") + (notaPago(m.p.nota) ? " · " + esc(notaPago(m.p.nota)) : "") + '</span></span><span class="bk-rt"><b class="pos">− ' + money(m.p.monto) + "</b></span><button class='x' data-a='pgBorrar' data-id='" + esc(m.p.id) + "' aria-label='Borrar pago' title='Borrar'>×</button></div>",
    m => m.c ? m.c.total : 0) : '<div class="empty">Todavía no hay compras ni pagos con este proveedor.</div>';
  return h + '<p class="bk-c"><button class="btn ghost sm" data-a="provEditar" data-prov="' + esc(id) + '">Editar datos del proveedor</button></p></div>';
}
let CD = null; // compra en curso
function compraDlg() {
  const provs = activos(T().proveedores), delProv = activos(T().insumos).filter(i => i.proveedor === CD.proveedor);
  const ids = delProv.map(i => i.id).concat(CD.extras.filter(id => !delProv.some(i => i.id === id)));
  const otros = activos(T().insumos).filter(i => ids.indexOf(i.id) < 0);
  let total = nm(CD.extra);
  ids.forEach(id => { const x = CD.items[id] || {}; total += nd(x.envases) * nm(x.precio != null ? x.precio : (ins(id) || {}).precio); });
  const esCargo = CD.modo === "cargo";
  redlg('<div class="row"><h3>' + (esCargo ? "Otro gasto o deuda" : "Registrar compra") + '</h3><button class="x" data-a="cerrar" aria-label="Cerrar">×</button></div>'
    + '<div class="g2"><label class="f">Proveedor<select id="cp-p" data-ch="cpProv">' + opts(provs, CD.proveedor, "Elegí…") + '</select></label><label class="f">Fecha<input type="date" id="cp-f" data-in="cpF" data-k="fecha" value="' + esc(CD.fecha) + '"></label></div>'
    + (esCargo ? '<p class="muted small" style="margin:0 0 8px">Queda como deuda con el proveedor <b>sin sumar stock</b>. Usalo para compras viejas cuyo stock ya cargaste a mano, o para gastos que no son insumos (flete, publicidad, intereses).</p>' : "")
    + (esCargo ? '<label class="f">Concepto<input id="cp-d" data-in="cpF" data-k="detalle" value="' + esc(CD.detalle || "") + '" placeholder="Ej. Flete del rollo, publicación"></label><label class="f">Monto<input id="cp-t" data-in="cpF" data-k="total" inputmode="numeric" value="' + esc(CD.total || "") + '"></label>'
      : (CD.proveedor ? (ids.length ? '<div class="tw"><table><thead><tr><th>Insumo</th><th class="n">Cantidad</th><th class="n">Precio c/u</th><th class="n">Subtotal</th></tr></thead><tbody>' + ids.map(id => { const i = ins(id), x = CD.items[id] || {}, pr = x.precio != null ? x.precio : i.precio, sub = nd(x.envases) * nm(pr);
          return "<tr><td><b>" + esc(i.nombre) + "</b><br><span class='muted small'>" + esc(i.envase) + (i.contenido !== 1 ? " de " + q(i.contenido) + " " + esc(i.unidad) : "") + "</span></td><td class='n'><input class='inp xs' id='cp-e-" + esc(id) + "' data-in='cpItem' data-id='" + esc(id) + "' data-k='envases' inputmode='decimal' value='" + esc(x.envases || "") + "' placeholder='0' aria-label='Cantidad'></td><td class='n'><input class='inp xs' style='width:96px' id='cp-pr-" + esc(id) + "' data-in='cpItem' data-id='" + esc(id) + "' data-k='precio' inputmode='numeric' value='" + esc(pr) + "' aria-label='Precio'></td><td class='n'>" + (sub ? money(sub) : "—") + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<p class="muted">Este proveedor no tiene insumos asignados.</p>')
        + (otros.length ? '<label class="f" style="margin-top:10px">Agregar un insumo de otro proveedor<select id="cp-add" data-ch="cpAdd"><option value="">Elegí…</option>' + otros.map(i => '<option value="' + esc(i.id) + '">' + esc(i.nombre) + "</option>").join("") + "</select></label>" : "")
        + '<div class="g2"><label class="f">Envío o recargo<input id="cp-x" data-in="cpF" data-k="extra" inputmode="numeric" value="' + esc(CD.extra || "") + '" placeholder="0"></label><div class="f">Total<b style="font-size:1.4rem;color:var(--ink)">' + money(total) + "</b></div></div>"
        + '<label class="check small"><input type="checkbox" id="cp-ap" data-ch="cpAct"' + (CD.actualizar ? " checked" : "") + "> Actualizar los precios del catálogo con estos</label>"
        + (nm(CD.extra) > 0 && total > nm(CD.extra) ? '<label class="check small" style="margin-top:6px"><input type="checkbox" id="cp-rp" data-ch="cpRep"' + (CD.repartir ? " checked" : "") + "> Sumar el envío al costo de los insumos (cada uno queda " + q(nm(CD.extra) / (total - nm(CD.extra)) * 100) + "% más caro, así la receta refleja lo que te costó de verdad)</label>" : "")
        : '<p class="muted">Elegí el proveedor para ver sus insumos.</p>'))
    + '<div class="g2" style="margin-top:12px"><label class="f">Ya pagué<input id="cp-pg" data-in="cpF" data-k="pagado" inputmode="numeric" value="' + esc(CD.pagado || "") + '" placeholder="0 = queda como deuda"></label><label class="f">Medio de pago<select id="cp-m" data-ch="cpMedio">' + ["Transferencia", "Efectivo", "Tarjeta", "Mercado Pago"].map(m => "<option" + (CD.medio === m ? " selected" : "") + ">" + m + "</option>").join("") + "</select></label></div>"
    + (esCargo ? "" : '<button class="linkb small" data-a="cpPagoTotal" style="margin:-6px 0 8px">Pagué el total (' + money(total) + ")</button>")
    + '<label class="f">Notas<input id="cp-n" data-in="cpF" data-k="notas" value="' + esc(CD.notas || "") + '"></label>'
    + '<p class="err" id="cpErr"></p><div class="acts"><button class="btn ghost" data-a="cerrar">Cancelar</button><button class="btn main" data-a="cpOk">' + (esCargo ? "Guardar" : "Guardar compra y sumar al stock") + "</button></div>", true);
}
function pagoDlg(pv, compra) {
  const s = saldos()[pv] || {saldo: 0}, pend = T().compras.filter(c => c.proveedor === pv);
  L.dlg('<div class="row"><h3>Pago a ' + esc(provNombre(pv)) + '</h3><button class="x" data-a="cerrar" aria-label="Cerrar">×</button></div>'
    + (s.saldo > 0 ? '<p class="muted" style="margin:0 0 10px">Le debés ' + money(s.saldo) + ".</p>" : "")
    + '<div class="g2"><label class="f">Monto<input id="pg-m" inputmode="numeric" value="' + (s.saldo > 0 ? Math.round(s.saldo) : "") + '"></label><label class="f">Fecha<input type="date" id="pg-f" value="' + hoyISO() + '"></label></div>'
    + '<div class="g2"><label class="f">Medio<select id="pg-me"><option>Transferencia</option><option>Efectivo</option><option>Tarjeta</option><option>Mercado Pago</option></select></label><label class="f">Corresponde a<select id="pg-c"><option value="">General</option>' + pend.map(c => '<option value="' + esc(c.id) + '"' + (c.id === compra ? " selected" : "") + ">" + esc(fFecha(c.fecha) + " · " + c.detalle.slice(0, 40) + " · " + money(c.total)) + "</option>").join("") + "</select></label></div>"
    + '<label class="f">Nota<input id="pg-n" placeholder="Ej. Seña, saldo, entrega 1"></label><p class="err" id="pgErr"></p>'
    + '<div class="acts"><button class="btn ghost" data-a="cerrar">Cancelar</button><button class="btn main" data-a="pgOk" data-prov="' + esc(pv) + '">Guardar pago</button></div>');
}
function cuentaDlg(pv) {
  const mov = T().compras.filter(c => c.proveedor === pv).map(c => ({f: c.fecha, t: "c", x: c})).concat(T().pagos.filter(p => p.proveedor === pv).map(p => ({f: p.fecha, t: "p", x: p})))
    .sort((a, b) => a.f < b.f ? -1 : a.f > b.f ? 1 : (a.t === "c" ? -1 : 1));
  let saldo = 0;
  const filas = mov.map(m => { saldo += m.t === "c" ? m.x.total : -m.x.monto; return "<tr><td class='small'>" + fFecha(m.f) + "</td><td>" + (m.t === "c" ? "<b>" + esc(m.x.tipo === "confeccion" ? "Confección" : m.x.tipo === "insumos" ? "Compra" : "Gasto") + "</b> · " + esc(m.x.detalle) : "Pago" + (m.x.medio ? " (" + esc(m.x.medio) + ")" : "") + (m.x.nota ? " · " + esc(m.x.nota) : "")) + "</td><td class='n'>" + (m.t === "c" ? money(m.x.total) : "") + "</td><td class='n pos'>" + (m.t === "p" ? money(m.x.monto) : "") + "</td><td class='n'><b>" + money(saldo) + "</b></td><td>" + (m.t === "c" ? "<button class='x' data-a='cpAnular' data-id='" + esc(m.x.id) + "' aria-label='Anular compra' title='Anular'>×</button>" : "<button class='x' data-a='pgBorrar' data-id='" + esc(m.x.id) + "' aria-label='Borrar pago' title='Borrar'>×</button>") + "</td></tr>"; }).reverse().join("");
  L.dlg('<div class="row"><h3>Cuenta con ' + esc(provNombre(pv)) + '</h3><button class="x" data-a="cerrar" aria-label="Cerrar">×</button></div>'
    + (mov.length ? '<div class="tw"><table><thead><tr><th>Fecha</th><th>Detalle</th><th class="n">Cargo</th><th class="n">Pago</th><th class="n">Saldo</th><th></th></tr></thead><tbody>' + filas + "</tbody></table></div>" : '<p class="muted">Sin movimientos.</p>')
    + '<div class="acts"><button class="btn ghost" data-a="cerrar">Cerrar</button><button class="btn main" data-a="pagoNuevo" data-prov="' + esc(pv) + '">Registrar pago</button></div>', true);
}
function provDlg(p) {
  p = p || {id: "", nombre: "", telefono: "", lugar: "", web: "", notas: ""};
  L.dlg('<div class="row"><h3>' + (p.id ? "Editar proveedor" : "Nuevo proveedor") + '</h3><button class="x" data-a="cerrar" aria-label="Cerrar">×</button></div>'
    + '<label class="f">Nombre<input id="pv-n" value="' + esc(p.nombre) + '" placeholder="Ej. Mercería del Litoral"></label>'
    + '<div class="g2"><label class="f">Teléfono / WhatsApp<input id="pv-t" inputmode="tel" value="' + esc(p.telefono) + '"></label><label class="f">Lugar<input id="pv-l" value="' + esc(p.lugar) + '"></label></div>'
    + '<label class="f">Web o Instagram<input id="pv-w" value="' + esc(p.web) + '"></label><label class="f">Notas<textarea id="pv-o" rows="2" placeholder="Mínimos de compra, formas de pago…">' + esc(p.notas) + "</textarea></label>"
    + '<p class="err" id="pvErr"></p><div class="acts">' + (p.id ? '<button class="btn danger" data-a="provBorrar" data-prov="' + esc(p.id) + '" style="margin-right:auto">Archivar / borrar</button>' : "") + '<button class="btn ghost" data-a="cerrar">Cancelar</button><button class="btn main" data-a="provGuardar" data-prov="' + esc(p.id) + '">Guardar</button></div>');
}

/* ================= PRECIOS Y RENTABILIDAD ================= */
function vRentabilidad() {
  const g = guard(); if (g) return cabecera("Precios y rentabilidad") + g;
  initRS(); const obj = nd(RS.objetivo) / 100, c = cfgTienda();
  let h = cabecera("Precios y rentabilidad", "Probá precios sin tocar la web. La rentabilidad es ganancia sobre costo. Con tarjeta recibís el precio menos la comisión de Mercado Pago; por transferencia, el precio de transferencia. El número que importa es la mezcla de los dos.");
  h += '<div class="block" style="margin-top:0"><div class="acts" style="align-items:end;gap:14px 22px">'
    + '<label class="f" style="margin:0">Comisión Mercado Pago<span class="unitw"><input class="inp xs" id="rs-c" data-in="rsP" data-k="comision" inputmode="decimal" value="' + esc(RS.comision) + '"> %</span></label>'
    + '<label class="f" style="margin:0">Rentabilidad objetivo<span class="unitw"><input class="inp xs" id="rs-o" data-in="rsP" data-k="objetivo" inputmode="decimal" value="' + esc(RS.objetivo) + '"> %</span></label>'
    + '<label class="f" style="margin:0;min-width:240px" for="rs-m">Ventas con tarjeta: <b id="rsMixTxt" style="color:var(--ink)">' + esc(RS.mix) + '%</b><input type="range" id="rs-m" data-in="rsMix" min="0" max="100" step="5" value="' + esc(RS.mix) + '" style="accent-color:var(--olive)"></label>'
    + '<span class="muted small" style="max-width:260px">' + "Se usa el % que guardaste." + (RS.mixReal != null ? " Según tus ventas registradas sería " + RS.mixReal + "% (" + RS.ventas + " fundas, incluye pedidos de prueba). " + (String(RS.mixReal) !== RS.mix ? '<button class="linkb" data-a="rsMixReal">Usar ese</button>' : "") : "") + "</span></div>"
    + '<div class="acts" style="margin-top:12px"><button class="btn ghost sm" data-a="rsGuardarParams">Guardar comisión, objetivo y mezcla</button></div></div>';
  h += '<div class="cols2" style="margin-top:14px" id="rsCards">' + PRODS.map(p => rentCard(p, obj)).join("") + "</div>";
  h += '<div class="block"><b>Venta mayorista:</b> ahora tiene su propia solapa, <button class="linkb" data-go="mayoristas">Números → Mayoristas</button>.</div>';
  const cambios = PRODS.some(p => { const k = p === "doble" ? ["precio_tarjeta", "precio_transferencia"] : ["precio2_tarjeta", "precio2_transferencia"]; return String(nm(RS.precios[p].t)) !== String(nm(c[k[0]])) || String(nm(RS.precios[p].x)) !== String(nm(c[k[1]])); });
  h += '<div class="block acts" style="justify-content:space-between">' + (cambios ? "<b>Estos precios son distintos a los de la web.</b>" : '<span class="muted">Son los precios que está mostrando la web.</span>')
    + '<span class="acts"><button class="btn ghost" data-a="rsReset"' + (cambios ? "" : " disabled") + '>Volver a los de la web</button><button class="btn main" data-a="rsAplicar"' + (cambios ? "" : " disabled") + ">Aplicar precios a la web</button></span></div>";
  return h;
}
/* Venta con código de vendedor (16/11/2026, pedido del dueño): el cliente paga por transferencia con
   $2.000 de descuento (código de monto fijo) y al vendedor se le pagan $2.000 de comisión (bajó de $3.000 el 16/11). Es solo referencia: no entra en la mezcla. */
const VEND_DESC = 2000, VEND_COMISION = 2000;
function filaVendedor(r, obj) {
  const rec = r.px - VEND_DESC - VEND_COMISION, g = rec - r.C;
  return "<tr><td>Código de vendedor<br><span class='muted small'>−" + money(VEND_DESC) + " y " + money(VEND_COMISION) + " de comisión</span></td><td class='n'>" + money(rec) + "</td><td class='n'>" + money(g) + "</td><td class='n'>" + pillR(r.C ? g / r.C : 0, obj) + "</td></tr>";
}
function rentCard(p, obj) {
  const f = fichaGuardada(p), r = rent(p), pr = RS.precios[p];
  if (f._nueva) return '<div class="block" style="margin-top:0"><h3>' + esc(nombreP(p)) + '</h3><p class="muted">Cargá la receta en <button class="linkb" data-go="productos">Productos y recetas</button> para calcular el costo.</p></div>';
  return '<div class="block" style="margin-top:0"><div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><h3>' + esc(nombreP(p)) + '</h3><span class="muted small">Costo ' + money(r.C) + "</span></div>"
    + '<div class="g2"><label class="f">Precio con tarjeta<input id="rs-t-' + p + '" data-in="rsPrecio" data-p="' + p + '" data-k="t" inputmode="numeric" value="' + esc(pr.t) + '"></label><label class="f">Precio por transferencia<input id="rs-x-' + p + '" data-in="rsPrecio" data-p="' + p + '" data-k="x" inputmode="numeric" value="' + esc(pr.x) + '"></label></div>'
    + '<div class="acts" style="margin:-4px 0 10px"><span class="muted small">Tarjeta:</span>' + [-5000, -1000, 1000, 5000].map(d => '<button class="btn ghost sm" data-a="rsMas" data-p="' + p + '" data-d="' + d + '">' + (d > 0 ? "+" : "−") + Math.abs(d / 1000) + "k</button>").join("") + '<span class="muted small">' + (r.d > 0 ? "transferencia " + q(r.d * 100) + "% menos" : "") + "</span></div>"
    + '<div class="tw"><table><thead><tr><th>Pago</th><th class="n">Recibís</th><th class="n">Ganás</th><th class="n">Rentab.</th></tr></thead><tbody>'
    + "<tr><td>Tarjeta<br><span class='muted small'>" + money(r.pt) + " − " + esc(RS.comision) + "%</span></td><td class='n'>" + money(r.recT) + "</td><td class='n'>" + money(r.gT) + "</td><td class='n'>" + pillR(r.rT, obj) + "</td></tr>"
    + "<tr><td>Transferencia</td><td class='n'>" + money(r.px) + "</td><td class='n'>" + money(r.gX) + "</td><td class='n'>" + pillR(r.rX, obj) + "</td></tr>"
    + filaVendedor(r, obj)
    + "<tr class='tot'><td>Mezcla (" + esc(RS.mix) + "% tarjeta)</td><td class='n'></td><td class='n'>" + money(r.gMix) + "</td><td class='n'>" + pillR(r.rMix, obj) + "</td></tr></tbody></table></div>"
    + '<div class="note ' + (r.rMix >= obj ? "ok" : "warn") + '">' + (r.rMix >= obj ? "Con esta mezcla llegás al " + esc(RS.objetivo) + "%." : "Para llegar al " + esc(RS.objetivo) + "% con esta mezcla, el precio con tarjeta tendría que ser <b>" + money(Math.ceil(r.minLista / 100) * 100) + "</b> (manteniendo " + q(r.d * 100) + "% menos por transferencia)"
      + (r.minTransf != null && r.minTransf < 1 ? ", o vender al menos <b>" + Math.ceil(r.minTransf * 100) + "%</b> por transferencia" : "") + ".") + "</div></div>";
}

/* ================= MAYORISTAS (19/11/2026; solapa propia desde el 20/11/2026, pedido del dueño) =================
   Tres partes: Cotizar (calculadora + propuesta en PDF), Consultas (las del formulario de la web) y Pedidos.
   Cotizar: una cantidad por funda; el envío de todo el pedido se reparte igual entre todas las fundas.
   En cada funda se escribe el precio (y se ve la rentabilidad) o la rentabilidad (y se ve el precio): manda
   el último que se escribió. Los precios se guardan solo en este aparato (localStorage), NO en el código:
   el repositorio es público. Costo mayorista = costo de la ficha − envío gratis de una venta común + envío repartido.
   Pedidos: mientras están pendientes no tocan el stock; "Sacar del stock" crea el pedido (origen mayorista)
   que descuenta las fundas y sigue por Hoy. Al negocio no se le manda ningún mail. */
const MAY_KEY = "lp_mayorista";
const MY = {tab: "cotizar", verArch: false, ped: null};
function mayLeer() {
  let m = null; try { m = JSON.parse(localStorage.getItem(MAY_KEY) || "null"); } catch (e) {} m = m || {};
  m.envio = m.envio != null ? m.envio : "20000"; m.validez = m.validez == null ? "30" : m.validez; m.para = m.para || ""; m.consulta = m.consulta || ""; m.cotId = m.cotId || "";
  ["precio", "rent", "cant", "modo"].forEach(k => { m[k] = m[k] || {}; });
  return m;
}
function mayGuardar(m) { try { localStorage.setItem(MAY_KEY, JSON.stringify(m)); } catch (e) {} }
function mayUnidades(m) { return PRODS.reduce((a, p) => a + Math.max(0, Math.floor(nd(m.cant[p]) || 0)), 0); }
function mayCalc(p, m) {
  const f = fichaGuardada(p), c = costo(f), U = mayUnidades(m), n = Math.max(0, Math.floor(nd(m.cant[p]) || 0));
  const envU = U > 0 ? nm(m.envio) / U : 0, C = c.total - c.envio + envU, pv = nm(RS.precios[p].x);
  let pm = nm(m.precio[p]), rent = C > 0 && pm > 0 ? (pm - C) / C : 0;
  if (m.modo[p] === "rent" && String(m.rent[p] || "").trim() !== "") { rent = nd(m.rent[p]) / 100; pm = Math.ceil(C * (1 + rent) / 100) * 100; }
  const gan = pm - C;
  return {f: f, n: n, C: C, envFicha: c.envio, envU: envU, pv: pv, pm: pm, gan: gan, rent: C > 0 && pm > 0 ? gan / C : 0, rev: pv - pm, revR: pm > 0 ? (pv - pm) / pm : 0};
}
function mayDatos() { return S.data && S.data.mayoristas; }
function vMayoristas() {
  const g = guard(); if (g) return cabecera("Mayoristas") + g;
  initRS();
  const D = mayDatos(), nuevas = D ? D.consultas.filter(x => x.estado === "nueva").length : 0, pend = D ? D.pedidos.filter(x => x.estado === "pendiente").length : 0, cots = D ? D.pedidos.filter(x => x.estado === "cotizacion").length : 0;
  let h = cabecera("Mayoristas", "Pet shops, veterinarias y revendedores: cotizá, mirá las consultas de la web y cargá los pedidos.");
  if (!D) h += '<div class="note warn">Para ver las consultas y cargar pedidos falta actualizar el sistema: <b>Configuración → Sistema → Buscar actualización → Actualizar ahora</b>. La calculadora ya funciona.</div>';
  h += '<div class="bk-tabs" role="tablist" style="margin-bottom:12px">' + [["cotizar", "Cotizar"], ["cotizaciones", "Cotizaciones" + (cots ? " (" + cots + ")" : "")], ["consultas", "Consultas" + (nuevas ? " (" + nuevas + ")" : "")], ["pedidos", "Pedidos" + (pend ? " (" + pend + ")" : "")]]
    .map(t => '<button data-a="myTab" data-t="' + t[0] + '" aria-pressed="' + (MY.tab === t[0]) + '">' + t[1] + "</button>").join("") + "</div>";
  if (MY.tab === "consultas") h += myConsultas(D); else if (MY.tab === "pedidos") h += myPedidos(D); else if (MY.tab === "cotizaciones") h += myCotizaciones(D); else h += myCotizar();
  return h;
}
function myCotizar() {
  const m = mayLeer(), U = mayUnidades(m), D = mayDatos(), cot = m.cotId && D ? D.pedidos.find(x => x.id === m.cotId && x.estado === "cotizacion") : null;
  if (m.cotId && D && !cot) { m.cotId = ""; mayGuardar(m); }
  let h = (cot ? '<div class="note" style="margin-bottom:10px">Estás editando la cotización <b>' + esc(cot.id) + "</b>" + (cot.negocio ? " (" + esc(cot.negocio) + ")" : "") + '. Tocá <b>Guardar cambios</b> para actualizarla.</div>' : "")
    + '<div class="block" style="margin-top:0"><div class="g3"><label class="f">Propuesta para (opcional)<input id="my-para" data-in="mayF" data-k="para" placeholder="Nombre del negocio" value="' + esc(m.para) + '"></label>'
    + '<label class="f">Envío de todo el pedido<input id="my-env" data-in="mayF" data-k="envio" inputmode="numeric" value="' + esc(m.envio) + '"></label>'
    + '<label class="f">Precios válidos por (días)<input id="my-val" data-in="mayF" data-k="validez" inputmode="numeric" value="' + esc(m.validez) + '"></label></div>'
    + '<p class="muted small" style="margin:0">El costo de cada funda va sin el envío gratis de una venta común y con su parte del envío del pedido' + (U ? ": " + money(nm(m.envio)) + " ÷ " + U + " fundas = <b>" + money(U ? nm(m.envio) / U : 0) + "</b> cada una." : ". Poné las cantidades para repartirlo.") + "</p></div>";
  h += '<div class="cols2" style="margin-top:14px">' + PRODS.map(p => mayCard(p, m)).join("") + "</div>";
  const rs = PRODS.map(p => fichaGuardada(p)._nueva ? null : mayCalc(p, m)).filter(r => r && r.n > 0 && r.pm > 0);
  if (rs.length) {
    const cob = rs.reduce((a, r) => a + r.pm * r.n, 0), cos = rs.reduce((a, r) => a + r.C * r.n, 0), gan = cob - cos;
    h += '<div class="block"><h3 style="margin-top:0">Todo el pedido · ' + U + " funda" + (U === 1 ? "" : "s") + "</h3>"
      + mayFila("Cobrás", "<b>" + money(cob) + "</b>", rs.map(r => r.n + " × " + money(r.pm)).join(" + "))
      + mayFila("Te cuesta", money(cos), "fundas + " + money(nm(m.envio)) + " de envío")
      + mayFila("Ganás", "<b>" + money(gan) + '</b> <span class="pill">' + pct(cos > 0 ? gan / cos : 0) + "</span>", "rentabilidad del pedido entero") + "</div>";
  }
  h += '<div class="acts" style="margin-top:12px">' + (D ? '<button class="btn main" data-a="myGuardarCoti">💾 ' + (cot ? "Guardar cambios" : "Guardar cotización") + "</button>" : "")
    + '<button class="btn ' + (D ? "ghost" : "main") + '" data-a="mayImprimir">🖨 Imprimir propuesta</button>'
    + (D ? '<button class="btn ghost" data-a="myPedNuevo">Pasar a pedido</button>' : "")
    + '<button class="btn ghost" data-a="myLimpiar">Empezar otra cotización</button></div>'
    + '<p class="muted small">La propuesta se abre en una hoja: elegí "Guardar como PDF" para mandarla por WhatsApp. Si hay cantidades, incluye el detalle del pedido.</p>';
  return h;
}
function mayCard(p, m) {
  const f = fichaGuardada(p);
  if (f._nueva) return '<div class="block" style="margin-top:0"><h3>' + esc(nombreP(p)) + '</h3><p class="muted">Cargá la receta en <button class="linkb" data-go="productos">Productos y recetas</button> para calcular el costo.</p></div>';
  const r = mayCalc(p, m), modoR = m.modo[p] === "rent";
  return '<div class="block" style="margin-top:0"><h3>' + esc(nombreP(p)) + "</h3>"
    + '<div class="g3"><label class="f">Cantidad<input id="my-q-' + p + '" data-in="mayQ" data-p="' + p + '" inputmode="numeric" placeholder="0" value="' + esc(m.cant[p] || "") + '"></label>'
    + '<label class="f">Precio por unidad<input id="my-p-' + p + '" data-in="mayP" data-p="' + p + '" inputmode="numeric" value="' + esc(modoR ? (r.pm ? String(r.pm) : "") : (m.precio[p] || "")) + '"></label>'
    + '<label class="f">Rentabilidad<span class="unitw"><input class="inp" id="my-r-' + p + '" data-in="mayR" data-p="' + p + '" inputmode="decimal" value="' + esc(modoR ? (m.rent[p] || "") : (r.pm ? String(Math.round(r.rent * 1000) / 10).replace(".", ",") : "")) + '"> %</span></label></div>'
    + '<p class="muted small" style="margin:-6px 0 6px">' + (modoR ? "Pusiste la rentabilidad: el precio se calcula solo (redondeado a $100)." : "Pusiste el precio: la rentabilidad se calcula sola.") + " Podés escribir en cualquiera de los dos.</p>"
    + mayFila("Costo por unidad", money(r.C), "sin el envío gratis (" + money(r.envFicha) + ")" + (r.envU ? " y con " + money(r.envU) + " de envío" : ""))
    + (r.pm ? mayFila("Ganás por unidad", "<b>" + money(r.gan) + '</b> <span class="pill">' + pct(r.rent) + "</span>")
      + (r.n ? mayFila(r.n + " funda" + (r.n === 1 ? "" : "s"), "ganás <b>" + money(r.gan * r.n) + "</b>", "cobrás " + money(r.pm * r.n)) : "")
      + mayFila("El revendedor gana", money(r.rev) + " <span class='muted small'>(" + pct(r.revR) + ")</span>", "vendiendo a " + money(r.pv) + ", de contado como la web") : "")
    + "</div>";
}
function mayFila(t, v, sub) { return '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:8px 0;border-top:1px solid var(--line)"><span>' + t + (sub ? '<br><span class="muted small">' + sub + "</span>" : "") + '</span><span style="text-align:right;white-space:nowrap">' + v + "</span></div>"; }
function mayImprimir() {
  const m = mayLeer(), med = (S.data && S.data.media) || [], cfg = cfgTienda(), base = location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "");
  const foto = p => { const l = med.filter(x => x.destino === p && x.tipo === "img"), pr = l.find(x => x.principal) || l[0] || med.find(x => x.destino === "portada" && x.principal && x.tipo === "img"); return pr ? "https://lh3.googleusercontent.com/d/" + pr.drive + "=w900" : ""; };
  const sub = {doble: cfg.sub1 || "Asiento trasero completo", individual: cfg.sub2 || "Un solo asiento, el otro queda libre"};
  const R = {}; PRODS.forEach(p => { if (!fichaGuardada(p)._nueva) R[p] = mayCalc(p, m); });
  const prods = PRODS.filter(p => R[p] && R[p].pm > 0);
  if (!prods.length) { L.toast("Poné el precio mayorista de al menos una funda."); return; }
  const det = prods.filter(p => R[p].n > 0), tot = det.reduce((a, p) => a + R[p].pm * R[p].n, 0);
  const card = p => { const pm = R[p].pm, pv = R[p].pv, fo = foto(p);
    return '<div class="card"><div class="ph">' + (fo ? '<img class="bg" src="' + fo + '"><img class="fg" src="' + fo + '">' : "") + '</div><div class="b"><h2>' + esc(nombreP(p)) + '</h2><p class="sub">' + esc(sub[p]) + "</p>"
      + '<div class="big"><span>Precio mayorista c/u</span><b>' + money(pm) + "</b></div>"
      + '<div class="row"><span>Precio sugerido de venta (contado)</span><b>' + money(pv) + "</b></div>"
      + '<div class="row"><span>Tu ganancia por unidad</span><b class="gan">' + money(pv - pm) + "</b></div></div></div>"; };
  const detalle = det.length ? '<h3>Detalle del pedido</h3><table class="det"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio c/u</th><th>Subtotal</th></tr></thead><tbody>'
    + det.map(p => "<tr><td>" + esc(nombreP(p)) + "</td><td>" + R[p].n + "</td><td>" + money(R[p].pm) + "</td><td>" + money(R[p].pm * R[p].n) + "</td></tr>").join("")
    + '<tr class="tt"><td>Total</td><td>' + det.reduce((a, p) => a + R[p].n, 0) + "</td><td></td><td>" + money(tot) + '</td></tr></tbody></table><p class="nota">Envío incluido a tu local por Andreani.</p>' : "";
  const html = '<!doctype html><html><head><meta charset="utf-8"><title>Los Perrines · Propuesta mayorista</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"><style>'
    + "@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font:400 11.5pt/1.45 Inter,sans-serif;color:#1E2418;-webkit-print-color-adjust:exact;print-color-adjust:exact}"
    + ".page{width:210mm;min-height:297mm;padding:14mm 15mm 12mm;display:flex;flex-direction:column;margin:0 auto}"
    + ".head{display:flex;align-items:center;gap:14px;border-bottom:3px solid #2F3822;padding-bottom:10px}.head img{width:58px;height:58px;border-radius:50%}.head h1{margin:0;font-size:22pt;font-weight:800}.head p{margin:2px 0 0;color:#5E6656}"
    + ".tag{margin-left:auto;background:#2F3822;color:#F2F3EC;font-weight:700;font-size:10pt;padding:6px 12px;border-radius:999px}.intro{margin:12px 0 10px}.para{margin:10px 0 0;font-weight:700;font-size:12.5pt}"
    + ".prods{display:grid;grid-template-columns:repeat(" + prods.length + ",1fr);gap:12px}.card{border:1px solid #D9DCCF;border-radius:10px;overflow:hidden}"
    + ".ph{height:" + (det.length ? 52 : 62) + "mm;background:#1E2418;position:relative;overflow:hidden}.ph img{position:absolute;inset:0;width:100%;height:100%}.ph .bg{object-fit:cover;filter:blur(14px) brightness(.7);transform:scale(1.2)}.ph .fg{object-fit:contain}"
    + ".b{padding:10px 12px 12px}h2{margin:0;font-size:14pt}.sub{margin:1px 0 8px;color:#5E6656;font-size:10pt}"
    + ".big{background:#F4F6DA;border:1px solid #DDE29A;border-radius:8px;padding:8px 10px;margin:4px 0 6px;display:flex;justify-content:space-between;align-items:baseline}.big span{font-size:10pt;font-weight:600}.big b{font-size:19pt;font-weight:800}"
    + ".row{display:flex;justify-content:space-between;padding:4px 0;border-top:1px solid #EEEFE8;font-size:10.5pt}.gan{color:#2F7A3E}"
    + "table.det{width:100%;border-collapse:collapse;font-size:10.5pt}table.det th{text-align:left;color:#5E6656;font-weight:600;border-bottom:1px solid #D9DCCF;padding:5px 6px}table.det td{padding:5px 6px;border-bottom:1px solid #EEEFE8}"
    + "table.det th:not(:first-child),table.det td:not(:first-child){text-align:right}table.det .tt td{font-weight:800;font-size:12pt;border-bottom:0;background:#F4F6DA}.nota{margin:4px 0 0;font-size:10pt;color:#5E6656}"
    + "h3{margin:14px 0 6px;font-size:12pt}.cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}ul{margin:0;padding-left:16px}li{margin:3px 0;font-size:10.5pt}.box{background:#F6F6F3;border-radius:10px;padding:10px 12px}"
    + ".foot{margin-top:auto;display:flex;justify-content:space-between;border-top:1px solid #D9DCCF;padding-top:8px;font-size:10pt;color:#5E6656}.foot b{color:#2F3822;font-size:12pt}"
    + "@media screen{body{background:#ddd}.page{background:#fff;margin:10px auto}}</style></head><body><div class='page'>"
    + '<div class="head"><img src="' + base + 'logo.png"><div><h1>Los Perrines</h1><p>Fundas tipo canasto para mascotas · Industria argentina 🇦🇷</p></div><span class="tag">Propuesta mayorista</span></div>'
    + (m.para ? '<p class="para">Propuesta para ' + esc(m.para) + "</p>" : "")
    + '<p class="intro">Fundas canasto para el asiento trasero del auto: <b>impermeables, acolchadas y antidesgarro</b>, con laterales que cubren las puertas. Un producto con buen margen de reventa.</p>'
    + '<div class="prods">' + prods.map(card).join("") + "</div>" + detalle
    + '<div class="cols"><div><h3>Condiciones</h3><div class="box"><ul><li><b>Precios por cantidad:</b> consultanos por tu pedido.</li><li><b>Envío incluido</b> a tu local por Andreani.</li><li>Pago por <b>transferencia antes del despacho</b>.</li>'
    + "<li>Precio sugerido de venta: <b>el mismo de nuestra web, de contado</b>.</li>" + (nd(m.validez) > 0 ? "<li>Precios válidos por " + esc(m.validez) + " días.</li>" : "") + "</ul></div></div>"
    + '<div><h3>Por qué se vende</h3><div class="box"><ul><li><b>Impermeable:</b> agua, barro y pelos no llegan al tapizado.</li><li><b>Canasto cerrado:</b> cubre asiento, respaldo y puertas.</li><li><b>Cierres en las cuatro esquinas</b> y abertura para el cinturón.</li><li>Viene en su <b>estuche</b> para guardarla.</li><li><b>Garantía de fábrica</b> y atención directa con quien la fabrica.</li></ul></div></div></div>'
    + '<div class="foot"><span>Fotos, videos y medidas: <b>www.losperrines.com.ar</b></span><span>Escribinos para hacer tu pedido</span></div></div>'
    + "<script>window.onload=function(){setTimeout(function(){window.print();},700);};<\/script></body></html>";
  const w = window.open("", "_blank");
  if (!w) { L.toast("El navegador bloqueó la ventana nueva: permitila e intentá de nuevo."); return; }
  w.document.open(); w.document.write(html); w.document.close();
}
/* ---------- consultas de la web ---------- */
const MY_EST = {nueva: ["Nueva", "warn"], respondida: ["Respondida", "ok"], cotizada: ["Cotizada", "ok"], pedido: ["Hizo pedido", "ok"], archivada: ["Archivada", "mute"]};
function waNormL(v) { let d = String(v == null ? "" : v).replace(/\D/g, ""); if (!d) return ""; d = d.replace(/^00/, ""); if (/^54/.test(d)) d = d.slice(2); if (/^9/.test(d) && d.length === 11) d = d.slice(1); d = d.replace(/^0/, "");
  if (d.length === 12) for (let k = 2; k <= 4; k++) { if (d.substr(k, 2) === "15") { d = d.slice(0, k) + d.slice(k + 2); break; } } return d.length === 10 ? "549" + d : ""; }   // igual que waNorm() del núcleo
function waLink(v, txt) { const n = waNormL(v); return /^\d{10,}$/.test(n) ? "https://wa.me/" + n + (txt ? "?text=" + encodeURIComponent(txt) : "") : ""; }
function myConsultas(D) {
  if (!D) return '<p class="muted">Falta actualizar el sistema para ver las consultas.</p>';
  const l = D.consultas.filter(x => MY.verArch || x.estado !== "archivada"), arch = D.consultas.length - D.consultas.filter(x => x.estado !== "archivada").length;
  let h = "";
  if (!l.length) h += '<p class="muted">' + (D.consultas.length ? "No hay consultas sin archivar." : "Todavía no llegaron consultas desde la web.") + "</p>";
  h += l.map(x => { const e = MY_EST[x.estado] || MY_EST.nueva, tot = x.doble + x.individual, wa = waLink(x.whatsapp, "¡Hola " + x.nombre + "! Te escribo de Los Perrines por tu consulta de venta por mayor.");
    return '<div class="block" style="margin-top:0;margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><b>' + esc(x.negocio || (x.nombre + " " + x.apellido)) + '</b><span class="pill ' + e[1] + '">' + e[0] + "</span></div>"
      + '<div class="muted small">' + esc(x.fecha) + (x.negocio ? " · " + esc(x.nombre + " " + x.apellido) : "") + (x.localidad ? " · " + esc(x.localidad) : "") + "</div>"
      + '<div style="margin:6px 0">' + tot + " funda" + (tot === 1 ? "" : "s") + ": " + x.doble + " de 2 plazas y " + x.individual + " de 1 plaza</div>"
      + (x.mensaje ? '<div class="small">“' + esc(x.mensaje) + "”</div>" : "")
      + '<div class="muted small">WhatsApp ' + esc(x.whatsapp) + (x.email ? " · " + esc(x.email) : "") + "</div>"
      + '<div class="acts" style="margin-top:8px"><button class="btn main sm" data-a="myCotizarConsulta" data-f="' + x.fila + '">Cotizar</button>'
      + (wa ? '<a class="btn ghost sm" target="_blank" rel="noopener" href="' + esc(wa) + '">WhatsApp</a>' : "")
      + (x.estado === "nueva" ? '<button class="btn ghost sm" data-a="myConsEst" data-f="' + x.fila + '" data-e="respondida">Ya le respondí</button>' : "")
      + (x.estado === "archivada" ? '<button class="btn ghost sm" data-a="myConsEst" data-f="' + x.fila + '" data-e="nueva">Desarchivar</button>' : '<button class="btn ghost sm" data-a="myConsEst" data-f="' + x.fila + '" data-e="archivada">Archivar</button>')
      + '<button class="btn ghost sm" data-a="myConsBorrar" data-f="' + x.fila + '">Borrar</button>'
      + "</div></div>"; }).join("");
  if (arch) h += '<button class="linkb" data-a="myVerArch">' + (MY.verArch ? "Ocultar las archivadas" : "Ver las archivadas (" + arch + ")") + "</button>";
  return h;
}
/* ---------- pedidos mayoristas ---------- */
function itemsTxt(items) { return (items || []).map(it => it.cantidad + " " + (it.producto === "individual" ? "de 1 plaza" : "de 2 plazas") + " a " + money(it.precio)).join(" + "); }
function myPedidos(D) {
  if (!D) return '<p class="muted">Falta actualizar el sistema para cargar pedidos.</p>';
  const ped = (S.data && S.data.pedidos) || [], st = (S.data && S.data.stock) || {};
  let h = '<div class="note">Un pedido <b>pendiente no toca el stock</b>: la web sigue vendiendo mientras lo mandás a confeccionar. Cuando lo vas a despachar, tocá <b>Sacar del stock</b>: se descuentan las fundas y el pedido pasa a <b>Hoy</b> para prepararlo y despacharlo. Al negocio no le llega ningún mail.</div>'
    + '<div class="acts" style="margin:10px 0"><button class="btn main" data-a="myPedNuevo">+ Cargar pedido</button><span class="muted small">Stock ahora: ' + PRODS.map(p => esc(nombreP(p)) + " <b>" + Math.max(0, (st[p] || {}).disponible || 0) + "</b>").join(" · ") + "</span></div>";
  const lista = D.pedidos.filter(x => x.estado !== "cotizacion");
  if (!lista.length) return h + '<p class="muted">Todavía no cargaste pedidos mayoristas.</p>';
  h += lista.map(x => {
    const pv = x.pedido ? ped.find(p => p.id === x.pedido) : null, wa = waLink(x.whatsapp);
    const est = x.estado === "pendiente" ? '<span class="pill warn">Pendiente · no tocó el stock</span>' : x.estado === "cancelado" ? '<span class="pill mute">Cancelado</span>'
      : '<span class="pill ok">Salió del stock' + (pv ? " · " + esc(({reserva: "falta que te pague", pagado: "para preparar", exportado: "para despachar", despachado: "en camino", entregado: "entregado", cancelado: "cancelado"})[pv.estado] || pv.estado) : "") + "</span>";
    let acts = "";
    if (x.estado === "pendiente") acts = '<button class="btn main sm" data-a="mySacar" data-id="' + esc(x.id) + '">Sacar del stock</button><button class="btn ghost sm" data-a="myPedEditar" data-id="' + esc(x.id) + '">Editar</button>';
    else if (x.estado === "enviado") acts = '<button class="btn ghost sm" data-go="hoy">Ver en Hoy</button><button class="btn ghost sm" data-a="myPedEditar" data-id="' + esc(x.id) + '">Notas</button>';
    if (wa) acts += '<a class="btn ghost sm" target="_blank" rel="noopener" href="' + esc(wa) + '">WhatsApp</a>';
    if (x.estado !== "cancelado" && !(pv && ["despachado", "entregado"].indexOf(pv.estado) >= 0)) acts += '<button class="btn ghost sm" data-a="myPedCancelar" data-id="' + esc(x.id) + '">Cancelar</button>';
    return '<div class="block" style="margin-top:0;margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><b>' + esc(x.negocio || (x.nombre + " " + x.apellido)) + "</b><b>" + money(x.total) + "</b></div>"
      + '<div class="muted small">' + esc(x.id) + " · " + esc(x.fecha) + (x.pedido ? " · pedido " + esc(x.pedido) : "") + "</div>"
      + '<div style="margin:6px 0">' + esc(itemsTxt(x.items)) + "</div>"
      + "<div>" + est + (x.estado === "pendiente" ? ' <span class="pill ' + (x.pagado ? "ok" : "mute") + '">' + (x.pagado ? "Pagado" : "Sin pagar") + "</span>" : "") + "</div>"
      + (x.notas ? '<div class="small" style="margin-top:4px">Nota: ' + esc(x.notas) + "</div>" : "")
      + '<div class="acts" style="margin-top:8px">' + acts + "</div></div>";
  }).join("");
  return h;
}
/* ---------- cotizaciones guardadas (20/11/2026) ---------- */
function venceCot(x) {   // fecha "dd/mm/aaaa hh:mm" + días de validez
  const f = String(x.fecha || "").match(/^(\d{2})\/(\d{2})\/(\d{4})/), dias = +x.validez || 0; if (!f || !dias) return null;
  const v = new Date(+f[3], +f[2] - 1, +f[1] + dias, 23, 59); return {txt: ("0" + v.getDate()).slice(-2) + "/" + ("0" + (v.getMonth() + 1)).slice(-2), vencida: v < new Date()};
}
function myCotizaciones(D) {
  if (!D) return '<p class="muted">Falta actualizar el sistema para guardar cotizaciones.</p>';
  const l = D.pedidos.filter(x => x.estado === "cotizacion"), m = mayLeer();
  let h = '<p class="muted small" style="margin-top:0">Las cotizaciones quedan guardadas en el sistema (las ves desde el celular y la compu) y <b>no tocan el stock</b>. Cuando el negocio confirma, tocá <b>Pasar a pedido</b>.</p>';
  if (!l.length) return h + '<p class="muted">Todavía no guardaste cotizaciones. Armala en <button class="linkb" data-a="myTab" data-t="cotizar">Cotizar</button> y tocá "Guardar cotización".</p>';
  return h + l.map(x => { const v = venceCot(x), U = (x.items || []).reduce((a, it) => a + it.cantidad, 0);
    return '<div class="block" style="margin-top:0;margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><b>' + esc(x.negocio || "Sin nombre") + "</b><b>" + money(x.total) + "</b></div>"
      + '<div class="muted small">' + esc(x.id) + " · " + esc(x.fecha) + " · " + U + " funda" + (U === 1 ? "" : "s") + "</div>"
      + '<div style="margin:6px 0">' + esc(itemsTxt(x.items)) + "</div>"
      + (v ? '<span class="pill ' + (v.vencida ? "mute" : "ok") + '">' + (v.vencida ? "Venció el " : "Vigente hasta el ") + v.txt + "</span> " : "") + (m.cotId === x.id ? '<span class="pill warn">Abierta en Cotizar</span>' : "")
      + '<div class="acts" style="margin-top:8px"><button class="btn main sm" data-a="myCotPedido" data-id="' + esc(x.id) + '">Pasar a pedido</button><button class="btn ghost sm" data-a="myCotAbrir" data-id="' + esc(x.id) + '">Abrir</button>'
      + '<button class="btn ghost sm" data-a="myCotPdf" data-id="' + esc(x.id) + '">PDF</button><button class="btn ghost sm" data-a="myCotDescartar" data-id="' + esc(x.id) + '">Descartar</button></div></div>'; }).join("");
}
function myCotCargar(x) {   // pasa una cotización guardada a la calculadora
  const m = mayLeer(); m.cant = {}; m.precio = {}; m.modo = {}; m.rent = {};
  (x.items || []).forEach(it => { m.cant[it.producto] = String(it.cantidad); m.precio[it.producto] = String(it.precio); m.modo[it.producto] = "precio"; });
  m.envio = String(x.envio || 0); if (x.validez) m.validez = String(x.validez); m.para = x.negocio || ""; m.consulta = String(x.consulta || ""); m.cotId = x.id; mayGuardar(m);
}
function myPedDlg() {
  const P = MY.ped, ro = !!P.id && P.estado !== "pendiente" && P.estado !== "cotizacion", st = (S.data && S.data.stock) || {};
  const inp = (k, lbl, extra) => '<label class="f">' + lbl + '<input id="mp-' + k + '" data-in="myPF" data-k="' + k + '"' + (ro ? " disabled" : "") + ' value="' + esc(P[k] || "") + '"' + (extra || "") + "></label>";
  let h = '<div class="row"><h3>' + (P.estado === "cotizacion" ? "Pasar a pedido · " + esc(P.id) : P.id ? "Pedido " + esc(P.id) : "Nuevo pedido mayorista") + '</h3><button class="x" data-a="cerrar" aria-label="Cerrar">×</button></div>';
  if (ro) h += '<p class="muted small">Este pedido ya salió del stock: solo podés cambiar las notas. El pago y el despacho se manejan desde Hoy.</p>';
  h += '<div class="g2">' + PRODS.map(p => '<div><b>' + esc(nombreP(p)) + '</b> <span class="muted small">(stock ' + Math.max(0, (st[p] || {}).disponible || 0) + ')</span><div class="g2">'
      + '<label class="f">Cantidad<input id="mp-q-' + p + '" data-in="myPI" data-p="' + p + '" data-k="cantidad" inputmode="numeric"' + (ro ? " disabled" : "") + ' value="' + esc(P.items[p].cantidad) + '"></label>'
      + '<label class="f">Precio c/u<input id="mp-p-' + p + '" data-in="myPI" data-p="' + p + '" data-k="precio" inputmode="numeric"' + (ro ? " disabled" : "") + ' value="' + esc(P.items[p].precio) + '"></label></div></div>').join("") + "</div>";
  const tot = PRODS.reduce((a, p) => a + Math.floor(nd(P.items[p].cantidad) || 0) * nm(P.items[p].precio), 0);
  h += '<p style="margin:0 0 8px">Total: <b id="mpTot">' + money(tot) + "</b></p>"
    + '<div class="g2">' + inp("negocio", "Negocio") + inp("whatsapp", "WhatsApp", ' inputmode="tel"') + "</div>"
    + '<div class="g2">' + inp("nombre", "Nombre de quien recibe") + inp("apellido", "Apellido") + "</div>"
    + '<div class="g2">' + inp("dni", "DNI o CUIT (para Andreani)", ' inputmode="numeric"') + inp("email", 'Email <span class="muted small">(opcional, no se le manda nada)</span>', ' inputmode="email"') + "</div>"
    + '<label class="f">Entrega<select id="mp-entrega" data-ch="myPEnt"' + (ro ? " disabled" : "") + ">" + [["domicilio", "A domicilio (Andreani)"], ["sucursal", "A sucursal Andreani"], ["mano", "En mano"]].map(o => '<option value="' + o[0] + '"' + (P.entrega === o[0] ? " selected" : "") + ">" + o[1] + "</option>").join("") + "</select></label>";
  if (P.entrega === "domicilio") h += '<div class="g3">' + inp("calle", "Calle") + inp("numero", "Número") + inp("piso", "Piso / depto") + "</div>";
  if (P.entrega !== "mano") h += inp("prov_loc_cp", "Provincia / localidad / código postal", ' placeholder="San Luis / Villa Mercedes / 5730"');
  if (P.entrega === "sucursal") h += inp("sucursal", "Sucursal de Andreani");
  h += '<label class="f">Notas<textarea id="mp-notas" data-in="myPF" data-k="notas" rows="2">' + esc(P.notas || "") + "</textarea></label>"
    + '<label class="check"><input type="checkbox" id="mp-pag" data-ch="myPPag"' + (P.pagado ? " checked" : "") + (ro ? " disabled" : "") + "> Ya me pagó</label>"
    + '<p class="err" id="mpErr"></p><div class="acts"><button class="btn ghost" data-a="cerrar">Cancelar</button><button class="btn main" data-a="myPedOk">Guardar</button></div>';
  L.dlg(h);
}
function myPedDesde(x) {
  const m = mayLeer(), items = {};
  PRODS.forEach(p => { items[p] = {cantidad: "", precio: ""}; });
  const consDe = f => f && mayDatos() ? mayDatos().consultas.find(c => String(c.fila) === String(f)) : null;
  const deCons = (o, cs) => { if (cs) ["nombre", "apellido", "whatsapp", "email"].forEach(k => { if (!o[k]) o[k] = cs[k]; }); if (cs && !o.negocio) o.negocio = cs.negocio; if (cs && !o.prov_loc_cp) o.prov_loc_cp = cs.localidad; return o; };
  if (x) { (x.items || []).forEach(it => { items[it.producto] = {cantidad: String(it.cantidad), precio: String(it.precio)}; }); return deCons(Object.assign({}, x, {items: items}), consDe(x.consulta)); }
  PRODS.forEach(p => { if (!fichaGuardada(p)._nueva) { const r = mayCalc(p, m); items[p] = {cantidad: m.cant[p] || "", precio: r.pm ? String(r.pm) : ""}; } });
  const cot = m.cotId && mayDatos() ? mayDatos().pedidos.find(y => y.id === m.cotId && y.estado === "cotizacion") : null;
  if (cot) return deCons(Object.assign({}, cot, {items: items, negocio: m.para || cot.negocio, envio: nm(m.envio), validez: m.validez}), consDe(cot.consulta || m.consulta));
  const cs = consDe(m.consulta);
  return {id: "", estado: "pendiente", items: items, negocio: m.para || (cs ? cs.negocio : ""), nombre: cs ? cs.nombre : "", apellido: cs ? cs.apellido : "", whatsapp: cs ? cs.whatsapp : "", email: cs ? cs.email : "",
    dni: "", entrega: "domicilio", calle: "", numero: "", piso: "", prov_loc_cp: cs && cs.localidad ? cs.localidad : "", sucursal: "", notas: "", pagado: false, consulta: m.consulta || "", envio: nm(m.envio)};
}

/* ================= MIGRACIÓN ================= */
function slug(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "x"; }
function clave(s) { return String(s || "").trim().toLowerCase().replace(/\s+/g, " "); }
let MG = null;
function armarMigracion(r) {
  const costos = r[0] || {}, insDoc = r[1] || {}, pagDoc = r[2] || {}, corteDoc = r[3] || {}, avisos = [];
  const provs = [], pIdx = {};
  function pv(nombre, extra) { const k = clave(nombre); if (!k) return ""; if (!pIdx[k]) { let id = "PV-" + slug(nombre); while (provs.some(x => x.id === id)) id += "x"; pIdx[k] = {id: id, nombre: String(nombre).trim(), telefono: "", lugar: "", web: "", notas: ""}; provs.push(pIdx[k]); } if (extra) ["telefono", "lugar", "web", "notas"].forEach(f => { if (extra[f] && !pIdx[k][f]) pIdx[k][f] = extra[f]; }); return pIdx[k].id; }
  (costos.proveedores || []).forEach(x => pv(x.nombre, x));
  const insumos = [], iIdx = {}, stock = [];
  function addIns(x, fuente) { const k = clave(x.nombre || x.concepto); if (!k) return null; if (iIdx[k]) return iIdx[k]; let id = "IN-" + slug(x.nombre || x.concepto); while (insumos.some(y => y.id === id)) id += "x";
    const o = {id: id, nombre: String(x.nombre || x.concepto).trim(), descripcion: "", proveedor: pv(x.proveedor, x), envase: x.envase || "unidad", contenido: nd(x.contenido) || 1, unidad: x.unidad || "u", precio: nm(x.precio), minimo: 0, _fuente: fuente};
    insumos.push(o); iIdx[k] = o; return o; }
  (insDoc.insumos || []).forEach(x => { const o = addIns(x, "Insumos"); if (o && nd(x.stock)) stock.push({insumo: o.id, cantidad: nd(x.stock), detalle: "Stock importado de la herramienta Insumos"}); });
  const tengo = (costos.plan && costos.plan.tengo) || {};
  const cprods = costos.productos || [];
  cprods.forEach(p => (p.items || []).forEach(it => { if (it.clase === "fijo") return; const ya = iIdx[clave(it.concepto)];
    if (ya) { if (nm(it.precio) && Math.abs(nm(it.precio) - ya.precio) > 0.5 && ya._fuente === "Insumos") avisos.push("Precio de " + ya.nombre + ": en Costos " + money(it.precio) + ", en Insumos " + money(ya.precio) + ". Usé el de Insumos."); }
    else addIns(it, "Costos"); }));
  Object.keys(tengo).forEach(k => { const i = iIdx[clave(k)]; if (i && nd(tengo[k]) && !stock.some(x => x.insumo === i.id)) stock.push({insumo: i.id, cantidad: nd(tengo[k]), detalle: "Stock importado de Costos (Ya tengo)"}); });
  // medidas desde Corte
  const modelos = corteDoc.modelos || [], rollo = corteDoc.rollo || {};
  function medidasPara(cp, prod) { let m = modelos.find(x => x.prod && x.prod === cp.id) || modelos.find(x => (prod === "individual") === /indiv|1 plaza|simple/i.test(x.nom || "") && /actual/i.test(x.nom || "")) || modelos.find(x => (prod === "individual") === /indiv|1 plaza|simple/i.test(x.nom || ""));
    const out = {}; if (m) Object.keys(MED_DEF.doble).forEach(k => { if (m[k] != null && m[k] !== "") out[k] = nd(m[k]); }); return {med: out, nom: m ? m.nom : null}; }
  const fichas = [], gastos = [], gIdx = {};
  ((costos.compartidos && costos.compartidos.gastos) || []).forEach(g => { gIdx[clave(g.concepto)] = 1; gastos.push({id: "GA-" + slug(g.concepto), concepto: g.concepto, total: nm(g.total), activo: g.incluir !== false}); });
  cprods.forEach(cp => {
    const prod = /indiv/i.test(cp.nombre || "") ? "individual" : "doble"; if (fichas.some(f => f.producto === prod)) { avisos.push("No importé el producto “" + cp.nombre + "” de Costos porque ya había otro " + prod + "."); return; }
    const md = medidasPara(cp, prod), f = {producto: prod, medidas: md.med, receta: [], confeccion: 0, envio: 0, otros: [], notas: ""};
    if (md.nom) avisos.push(nombreP(prod) + ": medidas tomadas del modelo “" + md.nom + "” de Corte."); else avisos.push(nombreP(prod) + ": no encontré medidas en Corte, puse las de fábrica. Revisalas.");
    const compras = (cp.items || []).filter(it => it.clase !== "fijo" && it.incluir !== false);
    let telaIt = null, bc = -1; compras.forEach(it => { if (/^m(etros?)?\.?$/i.test(String(it.unidad || "").trim())) { const c = nd(it.uso) * (nd(it.contenido) > 0 ? nm(it.precio) / nd(it.contenido) : 0); if (c > bc) { bc = c; telaIt = it; } } });
    compras.forEach(it => { const i = iIdx[clave(it.concepto)]; if (!i) return; let auto = it === telaIt ? "tela" : /hebilla/i.test(it.concepto) ? "correas" : /cinta/i.test(it.concepto) ? "cinta" : "";
      const fx = {producto: prod, medidas: md.med}; const calc = auto ? autoUso(fx, auto) : 0;
      if (auto && Math.abs(calc - nd(it.uso)) > 0.05 * Math.max(calc, 0.01)) avisos.push(nombreP(prod) + " · " + i.nombre + ": en Costos tenía " + q(nd(it.uso)) + " " + i.unidad + ", según las medidas lleva " + q(calc) + ". Quedó automático (lo podés cambiar a mano).");
      f.receta.push({insumo: i.id, auto: auto, uso: auto ? "" : nd(it.uso)}); });
    (cp.items || []).filter(it => it.clase === "fijo" && it.incluir !== false).forEach(it => {
      if (it.base === "lote") { if (!gIdx[clave(it.concepto)]) { gIdx[clave(it.concepto)] = 1; gastos.push({id: "GA-" + slug(it.concepto), concepto: it.concepto, total: nm(it.monto), activo: true}); } return; }
      if (it.cuando === "venta") { if (/env[ií]o/i.test(it.concepto)) f.envio += nm(it.monto); else f.otros.push({concepto: it.concepto + " (por venta)", monto: nm(it.monto)}); return; }
      if (/mano de obra|confecci|costura/i.test(it.concepto) && !f.confeccion) { f.confeccion = nm(it.monto); if (it.proveedor) pv(it.proveedor); return; }
      f.otros.push({concepto: it.concepto, monto: nm(it.monto)}); });
    fichas.push(f);
  });
  PRODS.forEach(p => { if (!fichas.some(f => f.producto === p)) fichas.push({producto: p, medidas: {}, receta: [], confeccion: 0, envio: 0, otros: [], notas: ""}); });
  // pagos a proveedores
  const compras = [], pagos = [];
  (pagDoc.compromisos || []).forEach(c => { const id = "C-OLD-" + slug(c.id); compras.push({id: id, proveedor: pv(c.proveedor), detalle: c.concepto || "Compromiso", total: nm(c.total), notas: c.notas || ""}); });
  (pagDoc.pagos || []).forEach(p => { const c = (pagDoc.compromisos || []).find(x => x.id === p.compromisoId); if (!c) return; pagos.push({proveedor: pv(c.proveedor), monto: nm(p.monto), fecha: p.fecha, medio: p.medio || "", nota: p.nota || "", compra: "C-OLD-" + slug(c.id)}); });
  const config = {}; if (rollo.rw) config.rollo_ancho = nd(rollo.rw); if (rollo.mg) config.margen_costura = nd(rollo.mg);
  if (costos.compartidos && costos.compartidos.rollo) config.rollo_largo = nd(costos.compartidos.rollo); else if (rollo.rl) config.rollo_largo = nd(rollo.rl);
  const susana = provs.find(x => /susana/i.test(x.nombre));
  return {data: {proveedores: provs, insumos: insumos.map(i => { const o = Object.assign({}, i); delete o._fuente; return o; }), stock: stock, fichas: fichas, gastos: gastos, compras: compras, pagos: pagos, config: config},
    avisos: avisos.filter((a, i) => avisos.indexOf(a) === i), tanda: {doble: "9", individual: "3", prov: susana ? susana.id : "", usar: true}};
}
function migrarDlg() {
  const d = MG.data;
  redlg('<div class="row"><h3>Importar tus datos</h3><button class="x" data-a="cerrar" aria-label="Cerrar">×</button></div>'
    + (MG.vacio ? '<div class="note bad" style="margin:0 0 10px"><b>No encontré datos de las herramientas anteriores</b>, ni en tu planilla ni en este navegador. Si las usabas en otro dispositivo (por ejemplo el celular), abrí este panel desde ese dispositivo y probá de nuevo. Si no, cargá los insumos a mano con ＋ Nuevo insumo.</div>'
      : '<p class="muted" style="margin:0 0 10px">Esto es lo que encontré en tus herramientas anteriores. No borro nada de lo viejo: las planillas Costos, Insumos, Corte y Pagos quedan como estaban.</p>')
    + (MG.origen && MG.origen.length ? '<div class="note info" style="margin:0 0 10px">' + esc(MG.origen.map(a => ({costos: "Costos", pagos: "Pagos", corte: "Corte"})[a]).join(", ")) + ': los datos estaban guardados solo en este navegador. Los traigo de acá.</div>' : "")
    + '<div class="cards" style="margin-top:0"><div class="kpi"><small>Insumos</small><b>' + d.insumos.length + '</b><span class="k2">' + d.stock.length + ' con stock</span></div><div class="kpi"><small>Proveedores</small><b>' + d.proveedores.length + '</b></div><div class="kpi"><small>Recetas</small><b>' + d.fichas.filter(f => f.receta.length).length + '</b></div><div class="kpi"><small>Deudas y pagos</small><b>' + d.compras.length + " / " + d.pagos.length + "</b></div></div>"
    + (d.insumos.length ? '<div class="tw" style="margin-top:12px;max-height:220px;overflow-y:auto"><table><thead><tr><th>Insumo</th><th>Proveedor</th><th class="n">Precio</th><th class="n">Stock</th></tr></thead><tbody>' + d.insumos.map(i => { const s = d.stock.find(x => x.insumo === i.id), pvv = d.proveedores.find(x => x.id === i.proveedor); return "<tr><td>" + esc(i.nombre) + "</td><td>" + esc(pvv ? pvv.nombre : "—") + "</td><td class='n'>" + money(i.precio) + " / " + esc(i.envase) + "</td><td class='n'>" + (s ? q(s.cantidad) + " " + esc(i.unidad) : "—") + "</td></tr>"; }).join("") + "</tbody></table></div>" : "")
    + (MG.avisos.length ? '<div class="note warn"><b>Revisá esto después de importar:</b><ul style="margin:6px 0 0;padding-left:18px">' + MG.avisos.map(a => "<li>" + esc(a) + "</li>").join("") + "</ul></div>" : "")
    + '<h3 style="margin-top:14px">La tanda que está en confección ahora</h3><label class="check"><input type="checkbox" id="mg-u" data-ch="mgUsar"' + (MG.tanda.usar ? " checked" : "") + "> Cargarla: así sus insumos quedan reservados y al recibirla se suma a la tienda</label>"
    + (MG.tanda.usar ? '<div class="g3" style="margin-top:8px"><label class="f">Dobles<input id="mg-d" data-in="mgT" data-k="doble" inputmode="numeric" value="' + esc(MG.tanda.doble) + '"></label><label class="f">Individuales<input id="mg-i" data-in="mgT" data-k="individual" inputmode="numeric" value="' + esc(MG.tanda.individual) + '"></label><label class="f">Quién la hace<select id="mg-p" data-ch="mgProv">' + opts(d.proveedores, MG.tanda.prov, "Elegí…") + "</select></label></div>"
      + '<p class="muted small" style="margin:-4px 0 0">Importante: el stock de insumos que importo tiene que incluir lo que le diste al taller para esta tanda (todavía no se descontó).</p>' : "")
    + '<p class="err" id="mgErr"></p><div class="acts"><button class="btn ghost" data-a="cerrar">Cancelar</button><button class="btn main" data-a="mgOk">Importar</button></div>', true);
}

/* ================= plano de corte (abre corte.html con estas medidas) ================= */
function abrirPlano(f) {
  const m = med(f), n = Math.max(1, Math.floor(nd(PL.q[f.producto])) || 1);
  const modelo = Object.assign({id: "panel-" + f.producto, nom: nombreP(f.producto), q: n}, m);
  const rd = rolloDraft(), datos = JSON.stringify({ts: Date.now(), modelos: [modelo], rollo: {rw: String(nd(rd.rollo_ancho) || 150), rl: String(nd(rd.rollo_largo) || 60), rp: String((ins(telaId()) || {}).precio || ""), mg: String(nd(rd.margen_costura))}});
  // Las medidas viajan en el mismo link (y de respaldo en localStorage): la pestaña nueva no comparte la sessionStorage.
  // El ?v= evita que el navegador abra una copia vieja guardada del plano.
  try { localStorage.setItem("lp_corte_panel", datos); } catch (e) {}
  window.open("corte.html?v=" + Date.now() + "#panel=" + encodeURIComponent(datos), "_blank", "noopener");
}

/* ================= eventos ================= */
const C = L.CLICK, I = L.INPUT;
function pedir(accion, datos, msg, btn) { return L.accion(accion, datos, msg, btn); }
function errEn(id, m) { const e = $("#" + id); if (e) e.textContent = m; else L.toast(m); }
function soloMain() { // re-dibuja la sección sin perder el foco
  L.refrescar();
}
// planificar
I.plQ = t => { PL.q[t.dataset.p] = t.value; soloMain(); };
I.plTela = t => { PL.tela = t.value; soloMain(); };
C.plTelaReal = () => { PL.tela = null; soloMain(); };
C.plMas = t => { PL.q[t.dataset.p] = String(Math.max(0, Math.floor(nd(PL.q[t.dataset.p]))) + 1); soloMain(); };
C.plMenos = t => { PL.q[t.dataset.p] = String(Math.max(0, Math.floor(nd(PL.q[t.dataset.p])) - 1)); soloMain(); };
C.plLlenar = t => { PL.q[t.dataset.p] = t.dataset.v; soloMain(); };
C.plComprar = t => { const pv = t.dataset.prov, res = reservado(), nec = {}, tid = telaId();
  PRODS.forEach(p => consumos(fichaGuardada(p), Math.max(0, Math.floor(nd(PL.q[p]))), nec));
  CD = nuevaCompra(pv); Object.keys(nec).forEach(id => { const i = ins(id); if (!i || i.proveedor !== pv) return; const disp = id === tid && PL.tela != null ? nd(PL.tela) : disponible(i, res), falta = Math.max(0, nec[id] - disp); if (falta > 0) CD.items[id] = {envases: String(Math.ceil(falta / i.contenido - 1e-9))}; });
  compraDlg(); };
C.plCrear = () => { const items = PRODS.map(p => ({producto: p, cantidad: Math.floor(nd(PL.q[p]))})).filter(x => x.cantidad > 0);
  const susana = activos(T().proveedores).find(p => /susana|taller|confecc/i.test(p.nombre));
  L.dlg('<div class="row"><h3>Crear tanda</h3><button class="x" data-a="cerrar" aria-label="Cerrar">×</button></div><p style="margin:0 0 10px"><b>' + items.map(x => x.cantidad + " " + corto(x.producto, x.cantidad)).join(" + ") + "</b></p>"
    + '<label class="f">Quién la confecciona<select id="td-p">' + opts(activos(T().proveedores), susana ? susana.id : "", "Elegí…") + "</select></label>"
    + '<label class="f">Estado<select id="td-e"><option value="en_confeccion">Ya se la pedí: en confección (reserva los insumos)</option><option value="planificada">Solo planificada, todavía no se la pedí</option></select></label>'
    + '<label class="f">Notas<input id="td-n" placeholder="Ej. Le llevé la tela el lunes"></label><div class="acts"><button class="btn ghost" data-a="cerrar">Cancelar</button><button class="btn main" data-a="tdCrearOk">Crear tanda</button></div>');
  C.tdCrearOk = b => pedir("tandaCrear", {items: items, proveedor: $("#td-p").value, estado: $("#td-e").value, notas: $("#td-n").value}, "Tanda creada", b).then(r => { if (r) { L.cerrarDlg(); PL.q = {doble: "", individual: ""}; L.ir("tandas"); } }); };
// tandas
C.tdEstado = t => { const v = t.dataset.v, txt = {en_confeccion: "¿Pasar la tanda a confección? Sus insumos quedan reservados.", cancelada: "¿Cancelar la tanda?", recibida: "¿Cerrar la tanda sin recibir lo que falta?"}[v]; if (confirm(txt)) pedir("tandaEstado", {id: t.dataset.id, estado: v}, "Tanda actualizada", t); };
let TED = null; // tanda que se está editando
function editarTandaDlg() {
  const t = T().tandas.find(x => x.id === TED.id), rec = t.recibido || {};
  redlg('<div class="row"><h3>Editar tanda ' + esc(t.id) + '</h3><button class="x" data-a="cerrar" aria-label="Cerrar">×</button></div>'
    + '<p class="muted small" style="margin:0 0 10px">Cambiá cuántas fundas te va a entregar. Los insumos reservados se recalculan solos. Si te entrega menos de lo pedido, también podés poner la cantidad real al recibir y tildar “Es la última entrega”.</p>'
    + '<div class="g2">' + PRODS.map(p => '<label class="f">' + esc(nombreP(p)) + (rec[p] ? ' <span class="muted">(ya recibiste ' + rec[p] + ')</span>' : "") + '<input id="ted-' + p + '" data-in="tedQ" data-p="' + p + '" inputmode="numeric" value="' + esc(TED.q[p]) + '"></label>').join("") + "</div>"
    + "<label class='f'>Quién la cose<select id='ted-prov' data-ch='tedProv'>" + opts(activos(T().proveedores), TED.prov, "Elegí…") + "</select></label>"
    + "<label class='f'>Notas<input id='ted-notas' data-in='tedNotas' value='" + esc(TED.notas) + "'></label>"
    + '<p class="err" id="tedErr"></p><div class="acts"><button class="btn ghost" data-a="cerrar">Cancelar</button><button class="btn main" data-a="tedOk">Guardar cambios</button></div>');
}
C.tdEditar = t => { const td = T().tandas.find(x => x.id === t.dataset.id), q = {}; PRODS.forEach(p => { const it = (td.items || []).find(x => x.producto === p); q[p] = it ? String(it.cantidad) : ""; });
  TED = {id: td.id, q: q, prov: td.proveedor || "", notas: td.notas || ""}; editarTandaDlg(); };
I.tedQ = t => { TED.q[t.dataset.p] = t.value; };
I["tedProv:change"] = t => { TED.prov = t.value; };
I.tedNotas = t => { TED.notas = t.value; };
C.tedOk = b => {
  const items = PRODS.map(p => ({producto: p, cantidad: Math.max(0, Math.floor(nd(TED.q[p])))})).filter(x => x.cantidad > 0);
  if (!items.length) { const e = $("#tedErr"); if (e) e.textContent = "Poné al menos una funda. Si ya no va, cancelá la tanda."; return; }
  pedir("tandaEditar", {id: TED.id, items: items, proveedor: TED.prov, notas: TED.notas}, null, b).then(r => { if (!r) return; L.cerrarDlg(); L.toast(r.cerrada ? "Tanda actualizada: ya recibiste todo, quedó cerrada" : "Tanda actualizada"); });
};
C.tdRecibir = t => { const td = T().tandas.find(x => x.id === t.dataset.id), pend = pendienteTanda(td); RCB = {id: td.id, q: {}, prov: td.proveedor, conf: null, confAuto: true, cerrar: true, pagado: "", medio: "Transferencia"}; PRODS.forEach(p => { if (pend[p]) RCB.q[p] = String(pend[p]); }); recibirDlg(); };
I.rcbQ = t => { RCB.q[t.dataset.p] = t.value; const td = T().tandas.find(x => x.id === RCB.id), pend = pendienteTanda(td); RCB.cerrar = PRODS.every(p => Math.floor(nd(RCB.q[p])) >= (pend[p] || 0)); recibirDlg(); };
I.rcbConf = t => { RCB.conf = t.value; RCB.confAuto = false; recibirDlg(); };
I["rcbProv:change"] = t => { RCB.prov = t.value; };
I["rcbCerrar:change"] = t => { RCB.cerrar = t.checked; };
C.rcbConfAuto = () => { RCB.confAuto = true; RCB.conf = null; recibirDlg(); };
C.rcbOk = b => { const rec = {}, cons = {}; let conf = 0;
  PRODS.forEach(p => { const n = Math.max(0, Math.floor(nd(RCB.q[p]))); if (n) { rec[p] = n; consumos(fichaGuardada(p), n, cons); conf += n * confU(fichaGuardada(p)); } });
  const monto = RCB.confAuto ? Math.round(conf) : Math.round(nm(RCB.conf));
  if (monto > 0 && !RCB.prov) { errEn("rcbErr", "Elegí quién hizo la confección."); return; }
  const pag = Math.round(nm(RCB.pagado));
  if (pag > 0 && !RCB.prov) { errEn("rcbErr", "Elegí a quién le pagaste."); return; }
  const datos = {id: RCB.id, recibido: rec, consumos: Object.keys(cons).map(k => ({insumo: k, cantidad: Math.round(cons[k] * 1000) / 1000})), confeccion: {proveedor: RCB.prov, total: monto}, cerrar: RCB.cerrar};
  if (!(pag > 0)) { pedir("tandaRecibir", datos, "Recibidas: ya están a la venta", b).then(r => { if (r) L.cerrarDlg(); }); return; }
  // recibe y registra el pago de una sola vez (lo pidió el dueño: menos pasos)
  b.disabled = true;
  L.api("tandaRecibir", datos).then(() => pedir("pagoRegistrar", {proveedor: RCB.prov, monto: pag, fecha: hoyISO(), medio: RCB.medio || "Transferencia", nota: "Confección tanda " + RCB.id, compra: ""}, "Recibidas y pago registrado", b)
    .then(r => { if (r) L.cerrarDlg(); else { L.cerrarDlg(); L.toast("Las fundas quedaron recibidas, pero el pago no se guardó: cargalo en Proveedores y pagos.", 8000); } }))
    .catch(e => { L.toast(e.message, 4500); b.disabled = false; }); };
I.rcbPag = t => { RCB.pagado = t.value; recibirDlg(); };
I["rcbMedio:change"] = t => { RCB.medio = t.value; };
C.rcbPagTodo = () => { const td = T().tandas.find(x => x.id === RCB.id); let conf = 0; PRODS.forEach(p => { const n = Math.max(0, Math.floor(nd(RCB.q[p]))); conf += n * confU(fichaGuardada(p)); }); RCB.pagado = String(RCB.confAuto ? Math.round(conf) : Math.round(nm(RCB.conf))); void td; recibirDlg(); };
// productos
C.pdTab = t => { PD.tab = t.dataset.p; soloMain(); };
I.pdMed = t => { const f = draft(PD.tab); f.medidas = f.medidas || {}; f.medidas[t.dataset.k] = t.value; sucio(); soloMain(); };
I.pdRollo = t => { rolloDraft()[t.dataset.k] = t.value; sucio(); soloMain(); };
I.pdNum = t => { draft(PD.tab)[t.dataset.k] = t.value; sucio(); soloMain(); };
I.pdRecUso = t => { const r = draft(PD.tab).receta[+t.dataset.ix]; r.uso = t.value; sucio(); soloMain(); };
I["pdRecIns:change"] = t => { draft(PD.tab).receta[+t.dataset.ix].insumo = t.value; sucio(); soloMain(); };
I["pdRecAuto:change"] = t => { const r = draft(PD.tab).receta[+t.dataset.ix]; r.auto = t.value; if (t.value) r.uso = ""; else r.uso = String(Math.round(usoDe(draft(PD.tab), Object.assign({}, r, {auto: ""})) * 1000) / 1000 || 0); sucio(); soloMain(); };
C.pdRecAutoVolver = t => { draft(PD.tab).receta[+t.dataset.ix].uso = ""; sucio(); soloMain(); };
C.pdRecDel = t => { draft(PD.tab).receta.splice(+t.dataset.ix, 1); sucio(); soloMain(); };
C.pdRecAdd = () => { draft(PD.tab).receta.push({insumo: "", auto: "", uso: "1"}); sucio(); soloMain(); };
I.pdOtro = t => { draft(PD.tab).otros[+t.dataset.ix][t.dataset.k] = t.value; sucio(); soloMain(); };
C.pdOtroAdd = () => { const f = draft(PD.tab); f.otros = f.otros || []; f.otros.push({concepto: "", monto: ""}); sucio(); soloMain(); };
C.pdOtroDel = t => { draft(PD.tab).otros.splice(+t.dataset.ix, 1); sucio(); soloMain(); };
I.pdGasto = t => { gastosDraft()[+t.dataset.ix][t.dataset.k] = t.value; gastosDraft()[+t.dataset.ix]._cambio = true; sucio(); soloMain(); };
I["pdGastoAct:change"] = t => { const g = gastosDraft()[+t.dataset.ix]; g.activo = t.checked; g._cambio = true; sucio(); soloMain(); };
C.pdGastoAdd = () => { gastosDraft().push({id: "", concepto: "", total: "", activo: true, _cambio: true}); sucio(); soloMain(); };
C.pdGastoDel = t => { const g = gastosDraft()[+t.dataset.ix]; if (g.id) { PD.gastosBorrar = (PD.gastosBorrar || []).concat(g.id); } gastosDraft().splice(+t.dataset.ix, 1); sucio(); soloMain(); };
I.pdCalc = t => { PD[t.dataset.k] = t.value; soloMain(); };
C.pdBolsaAdd = () => { draft(PD.tab).bolsa = bolsaDefault(PD.tab); sucio(); soloMain(); };
C.pdBolsaQuitar = () => { if (!confirm("¿Quitar la bolsa de este producto?")) return; draft(PD.tab).bolsa = null; sucio(); soloMain(); };
I["pdBolsaAct:change"] = t => { draft(PD.tab).bolsa.activa = t.checked; sucio(); soloMain(); };
I.pdBolsa = t => { draft(PD.tab).bolsa[t.dataset.k] = t.value; sucio(); soloMain(); };
I["pdBolsaIns:change"] = t => { draft(PD.tab).bolsa.items[+t.dataset.ix].insumo = t.value; sucio(); soloMain(); };
I["pdBolsaCalc:change"] = t => { const b = draft(PD.tab).bolsa, x = b.items[+t.dataset.ix]; if (t.value === "fija" && x.calc !== "fija") x.uso = L.qi(bolsaUso(b, x) || 1); x.calc = t.value; sucio(); soloMain(); };
I.pdBolsaUso = t => { draft(PD.tab).bolsa.items[+t.dataset.ix].uso = t.value; sucio(); soloMain(); };
C.pdBolsaDel = t => { draft(PD.tab).bolsa.items.splice(+t.dataset.ix, 1); sucio(); soloMain(); };
C.pdBolsaItemAdd = () => { draft(PD.tab).bolsa.items.push({insumo: "", calc: "fija", uso: "1"}); sucio(); soloMain(); };
I.pdBolsaServ = t => { draft(PD.tab).bolsa.servicios[+t.dataset.ix][t.dataset.k] = t.value; sucio(); soloMain(); };
C.pdBolsaServAdd = () => { const b = draft(PD.tab).bolsa; b.servicios = b.servicios || []; b.servicios.push({concepto: "", monto: "0"}); sucio(); soloMain(); };
C.pdBolsaServDel = t => { draft(PD.tab).bolsa.servicios.splice(+t.dataset.ix, 1); sucio(); soloMain(); };
C.pdDescartar = () => { if (!confirm("¿Descartar los cambios?")) return; PD.draft = {}; PD.gastos = null; PD.rollo = null; PD.gastosBorrar = []; PD.dirty = false; soloMain(); };
C.pdPlano = () => abrirPlano(draft(PD.tab));
C.pdGuardar = async b => {
  const pend = [];
  PRODS.forEach(p => { const f = PD.draft[p]; if (!f) return; if (f.receta.some(r => !r.insumo)) { pend.push(null); L.toast("Hay un renglón de la receta de " + nombreP(p) + " sin insumo."); return; }
    pend.push(["tallerGuardar", {tipo: "ficha", data: {producto: p, medidas: f.medidas, receta: f.receta.map(r => ({insumo: r.insumo, auto: r.auto || "", uso: r.uso === "" || r.uso == null ? "" : nd(r.uso)})), confeccion: nm(f.confeccion), envio: nm(f.envio), otros: (f.otros || []).map(o => ({concepto: o.concepto, monto: nm(o.monto)})), notas: f.notas || "",
      bolsa: f.bolsa ? {activa: f.bolsa.activa !== false, ancho: nd(f.bolsa.ancho), alto: nd(f.bolsa.alto), costura: nd(f.bolsa.costura), rollo: nd(f.bolsa.rollo), confeccion: nm(f.bolsa.confeccion),
        items: (f.bolsa.items || []).filter(x => x.insumo).map(x => ({insumo: x.insumo, calc: x.calc, uso: x.calc === "fija" ? nd(x.uso) : ""})), servicios: (f.bolsa.servicios || []).filter(x => String(x.concepto).trim()).map(x => ({concepto: x.concepto, monto: nm(x.monto)}))} : null}}]); });
  if (pend.some(x => x === null)) return;
  if (PRODS.some(p => PD.draft[p] && PD.draft[p].bolsa) && !(T().version >= 3)) { L.toast("Para guardar la bolsa primero actualizá el Codigo.gs (versión 3) en Apps Script.", 7000); return; }
  if (PRODS.some(p => PD.draft[p] && PD.draft[p].bolsa && (PD.draft[p].bolsa.items || []).some(x => !x.insumo))) { L.toast("Hay un insumo de la bolsa sin elegir."); return; }
  (PD.gastos || []).filter(g => g._cambio).forEach(g => { if (!String(g.concepto).trim()) return; pend.push(["tallerGuardar", {tipo: "gasto", data: {id: g.id, concepto: g.concepto, total: nm(g.total), activo: g.activo !== false}}]); });
  (PD.gastosBorrar || []).forEach(id => pend.push(["tallerBorrar", {tipo: "gasto", id: id}]));
  if (PD.rollo) pend.push(["guardarConfig", {valores: {rollo_ancho: String(nd(PD.rollo.rollo_ancho)), margen_costura: String(nd(PD.rollo.margen_costura)), rollo_largo: String(nd(PD.rollo.rollo_largo))}}]);
  b.disabled = true; b.innerHTML = '<span class="spinner"></span>';
  try { for (const x of pend) await L.api(x[0], x[1]); PD.draft = {}; PD.gastos = null; PD.rollo = null; PD.gastosBorrar = []; PD.dirty = false; await L.cargar("Ficha guardada"); }
  catch (e) { L.toast(e.message, 5000); b.disabled = false; b.textContent = "Guardar"; }
};
// insumos
function nuevoIns() { return {id: "", nombre: "", descripcion: "", proveedor: "", envase: "unidad", contenido: "1", unidad: "u", precio: "", minimo: ""}; }
C.insNuevo = () => { ID = nuevoIns(); insDlg(); };
C.insVer = t => { const i = ins(t.dataset.id); ID = Object.assign({}, i, {contenido: String(i.contenido), precio: String(i.precio), minimo: i.minimo ? String(i.minimo) : ""}); insDlg(); };
I.insF = t => { ID[t.dataset.k] = t.value; if (["envase", "unidad", "precio", "contenido"].indexOf(t.dataset.k) >= 0) insDlg(); };
I["insProv:change"] = t => { ID.proveedor = t.value; };
I["insArch:change"] = t => { IV.archivados = t.checked; soloMain(); };
C.insGuardar = b => { if (!String(ID.nombre).trim()) { errEn("inErr", "Poné el nombre."); return; }
  pedir("tallerGuardar", {tipo: "insumo", data: {id: ID.id, nombre: ID.nombre, descripcion: ID.descripcion, proveedor: ID.proveedor, envase: ID.envase, contenido: nd(ID.contenido), unidad: ID.unidad, precio: nm(ID.precio), minimo: nd(ID.minimo), activo: ID.activo !== false}}, "Insumo guardado", b).then(r => { if (r) { if (!ID.id) L.cerrarDlg(); else { ID.id = r.id; insDlg(); } } }); };
C.insAjustar = b => { const i = ins(ID.id), v = $("#aj-n").value.trim(), mot = $("#aj-m").value.trim(); if (v === "") { errEn("inErr", "Poné el stock que contaste."); return; }
  const delta = Math.round((nd(v) - i.stock) * 1000) / 1000; if (!delta) { L.toast("Coincide con el sistema, no hay nada que corregir."); return; }
  const inicial = !T().movimientos.some(m => m.insumo === i.id);
  pedir("stockAjuste", {insumo: i.id, cantidad: delta, tipo: inicial ? "inicial" : "ajuste", detalle: mot || (inicial ? "Stock inicial" : "Corrección por conteo")}, "Stock actualizado", b).then(r => { if (r) insDlg(); }); };
C.insBorrar = b => { if (!confirm("¿Archivar o borrar este insumo? Si ya tiene movimientos o está en una receta, queda archivado.")) return; pedir("tallerBorrar", {tipo: "insumo", id: ID.id}, null, b).then(r => { if (r) { L.cerrarDlg(); L.toast(r.archivado ? "Insumo archivado" : "Insumo borrado"); } }); };
C.stockCargar = b => {
  const lista = activos(T().insumos), primeraVez = !T().movimientos.length;
  SC = {v: {}, viejo: {}, motivo: primeraVez ? "Stock inicial" : "Conteo", fuente: ""};
  b.disabled = true;
  Promise.all([L.api("insumos").then(r => r.insumos).catch(() => null), L.api("costos").then(r => r.costos).catch(() => null)]).then(r => {
    const viejoIns = {}, viejoCos = {};
    ((r[0] && r[0].insumos) || []).forEach(x => { if (nd(x.stock)) viejoIns[clave(x.nombre)] = nd(x.stock); });
    const tengo = (r[1] && r[1].plan && r[1].plan.tengo) || {}; Object.keys(tengo).forEach(k => { if (nd(tengo[k])) viejoCos[clave(k)] = nd(tengo[k]); });
    let n = 0;
    lista.forEach(i => { const k = clave(i.nombre), v = viejoIns[k] != null ? viejoIns[k] : viejoCos[k];
      if (v != null) { SC.viejo[i.id] = v; n++; if (i.stock === 0) SC.v[i.id] = L.qi(v); } });
    if (n) SC.fuente = "Encontré el stock de " + n + " insumo" + (n > 1 ? "s" : "") + " en tus herramientas anteriores (Insumos o Costos → “Ya tengo”). Lo puse en los que están en cero: revisalo antes de guardar.";
    stockDlg();
  }).finally(() => { if (document.body.contains(b)) b.disabled = false; });
};
I.scV = t => { SC.v[t.dataset.id] = t.value; stockDlg(); };
I.scM = t => { SC.motivo = t.value; };
C.scOk = async b => {
  const cambios = activos(T().insumos).map(i => { const v = SC.v[i.id]; if (v == null || String(v).trim() === "") return null; const d = Math.round((nd(v) - i.stock) * 1000) / 1000; return d ? {i: i, d: d} : null; }).filter(Boolean);
  if (!cambios.length) { errEn("scErr", "No hay cambios para guardar."); return; }
  b.disabled = true; let ok = 0;
  try {
    for (const c of cambios) { b.innerHTML = '<span class="spinner"></span> ' + (ok + 1) + " de " + cambios.length;
      await L.api("stockAjuste", {insumo: c.i.id, cantidad: c.d, tipo: T().movimientos.some(m => m.insumo === c.i.id) ? "ajuste" : "inicial", detalle: SC.motivo || "Stock inicial"}); ok++; }
    L.cerrarDlg(); await L.cargar("Stock guardado: " + ok + " insumo" + (ok > 1 ? "s" : ""));
  } catch (e) { L.toast("Se guardaron " + ok + " de " + cambios.length + ". " + e.message, 6000); await L.cargar(); }
};
/* descarga solo los datos del taller (sin datos de clientes) para revisarlos o guardarlos */
C.tExport = () => {
  const c = cfgTienda(), t = T(), hoy = hoyISO();
  const datos = {exportado: new Date().toISOString(), aviso: "Datos del taller de Los Perrines. No incluye pedidos ni datos de clientes.",
    precios_web: {doble: {tarjeta: c.precio_tarjeta, transferencia: c.precio_transferencia}, individual: {tarjeta: c.precio2_tarjeta, transferencia: c.precio2_transferencia}},
    config_taller: t.config, insumos: t.insumos, proveedores: t.proveedores, fichas: t.fichas, gastos_compartidos: t.gastos, tandas: t.tandas,
    compras: t.compras, pagos: t.pagos, movimientos_insumos: t.movimientos, stock_fundas: t.stockTienda,
    costos_calculados: PRODS.map(p => { const f = fichaGuardada(p); return {producto: p, nombre: nombreP(p), tela_por_funda_m: telaU(f), costo: costo(f), rentabilidad: f._nueva ? null : rent(p)}; })};
  const blob = new Blob([JSON.stringify(datos, null, 2)], {type: "application/json"}), a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "los-perrines-taller-" + hoy + ".json"; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); L.toast("Archivo descargado");
};
// compras y pagos
function nuevaCompra(pv) { return {modo: "compra", proveedor: pv || "", fecha: hoyISO(), items: {}, extras: [], extra: "", pagado: "", medio: "Transferencia", notas: "", actualizar: true, repartir: true}; }
C.compraNueva = t => { CD = nuevaCompra(t.dataset.prov); compraDlg(); };
C.cargoFalta = t => { CD = nuevaCompra(t.dataset.prov); CD.modo = "cargo"; CD.total = t.dataset.monto; CD.detalle = "Compra anterior (el stock ya está cargado)"; compraDlg(); };
C.cargoNuevo = () => { CD = nuevaCompra(""); CD.modo = "cargo"; compraDlg(); };
I["cpProv:change"] = t => { CD.proveedor = t.value; compraDlg(); };
I["cpAdd:change"] = t => { if (t.value) CD.extras.push(t.value); compraDlg(); };
I["cpAct:change"] = t => { CD.actualizar = t.checked; };
I["cpRep:change"] = t => { CD.repartir = t.checked; };
I["cpMedio:change"] = t => { CD.medio = t.value; };
I.cpF = t => { CD[t.dataset.k] = t.value; if (t.dataset.k === "extra") compraDlg(); };
I.cpItem = t => { const x = CD.items[t.dataset.id] = CD.items[t.dataset.id] || {}; x[t.dataset.k] = t.value; compraDlg(); };
C.cpPagoTotal = () => { let tot = nm(CD.extra); Object.keys(CD.items).forEach(id => { const x = CD.items[id]; tot += nd(x.envases) * nm(x.precio != null ? x.precio : ins(id).precio); }); CD.pagado = String(Math.round(tot)); compraDlg(); };
C.cpOk = b => { if (!CD.proveedor) { errEn("cpErr", "Elegí el proveedor."); return; }
  const base = {proveedor: CD.proveedor, fecha: CD.fecha, pagado: nm(CD.pagado), medio: CD.medio, notas: CD.notas};
  let datos;
  if (CD.modo === "cargo") { if (!(nm(CD.total) > 0)) { errEn("cpErr", "Poné el monto."); return; } datos = Object.assign(base, {total: nm(CD.total), detalle: CD.detalle, tipo: "otro"}); }
  else { const items = Object.keys(CD.items).map(id => ({insumo: id, envases: nd(CD.items[id].envases), precio: nm(CD.items[id].precio != null ? CD.items[id].precio : ins(id).precio)})).filter(x => x.envases > 0);
    if (!items.length) { errEn("cpErr", "Poné la cantidad de al menos un insumo."); return; }
    let extra = nm(CD.extra); const sub = items.reduce((a, x) => a + x.envases * x.precio, 0);
    if (CD.repartir && extra > 0 && sub > 0) { // el envío se reparte en el precio de cada insumo (proporcional a lo que costó)
      const k = 1 + extra / sub; items.forEach(x => { x.precio = Math.round(x.precio * k * 100) / 100; });
      base.notas = [base.notas, "Incluye envío de " + money(extra) + " repartido en los insumos"].filter(Boolean).join(" · "); extra = 0; }
    datos = Object.assign(base, {items: items, extra: extra, actualizarPrecios: CD.actualizar}); }
  pedir("compraRegistrar", datos, CD.modo === "cargo" ? "Gasto guardado" : "Compra guardada: stock actualizado", b).then(r => { if (r) L.cerrarDlg(); }); };
C.pagoNuevo = t => pagoDlg(t.dataset.prov);
C.pgOk = b => { const m = nm($("#pg-m").value); if (!(m > 0)) { errEn("pgErr", "Poné el monto."); return; }
  pedir("pagoRegistrar", {proveedor: b.dataset.prov, monto: m, fecha: $("#pg-f").value, medio: $("#pg-me").value, nota: $("#pg-n").value, compra: $("#pg-c").value}, "Pago registrado", b).then(r => { if (r) L.cerrarDlg(); }); };
C.provCuenta = t => cuentaDlg(t.dataset.prov);
C.pvTab = b => { PV.tab = b.dataset.t; PV.sel = ""; soloMain(); };
C.pvVer = b => { PV.sel = b.dataset.prov; soloMain(); window.scrollTo(0, 0); };
C.pvVolver = () => { PV.sel = ""; soloMain(); window.scrollTo(0, 0); };
C.cpAnular = t => { if (!confirm("¿Anular esta compra? Si sumó stock, se descuenta.")) return; const c = T().compras.find(x => x.id === t.dataset.id); pedir("compraAnular", {id: t.dataset.id}, "Compra anulada", t).then(r => { if (r && c && !PV.sel) cuentaDlg(c.proveedor); }); };
C.pgBorrar = t => { if (!confirm("¿Borrar este pago?")) return; const p = T().pagos.find(x => x.id === t.dataset.id); pedir("pagoBorrar", {id: t.dataset.id}, "Pago borrado", t).then(r => { if (r && p && !PV.sel) cuentaDlg(p.proveedor); }); };
C.provNuevo = () => provDlg(null);
C.provEditar = t => provDlg(prov(t.dataset.prov));
C.provGuardar = b => { const n = $("#pv-n").value.trim(); if (!n) { errEn("pvErr", "Poné el nombre."); return; }
  pedir("tallerGuardar", {tipo: "proveedor", data: {id: b.dataset.prov, nombre: n, telefono: $("#pv-t").value, lugar: $("#pv-l").value, web: $("#pv-w").value, notas: $("#pv-o").value}}, "Proveedor guardado", b).then(r => { if (r) L.cerrarDlg(); }); };
C.provBorrar = b => { if (!confirm("¿Archivar o borrar este proveedor? Si tiene compras, pagos o insumos, queda archivado.")) return; pedir("tallerBorrar", {tipo: "proveedor", id: b.dataset.prov}, null, b).then(r => { if (r) { L.cerrarDlg(); L.toast(r.archivado ? "Proveedor archivado" : "Proveedor borrado"); } }); };
// rentabilidad
I.rsPrecio = t => { initRS(); RS.precios[t.dataset.p][t.dataset.k] = t.value; soloMain(); };
I.rsP = t => { RS[t.dataset.k] = t.value; soloMain(); };
I.rsMix = t => { RS.mix = t.value; const x = $("#rsMixTxt"); if (x) x.textContent = t.value + "%"; const c = $("#rsCards"); if (c) c.innerHTML = PRODS.map(p => rentCard(p, nd(RS.objetivo) / 100)).join(""); };
C.rsMixReal = () => { RS.mix = String(RS.mixReal); soloMain(); };
C.rsMas = t => { const pr = RS.precios[t.dataset.p], old = nm(pr.t), d = old > 0 ? 1 - nm(pr.x) / old : 0, nt = Math.max(0, old + (+t.dataset.d)); pr.t = String(nt); pr.x = String(Math.round(nt * (1 - d) / 100) * 100); soloMain(); };
// mayoristas
const myM = fn => t => { const m = mayLeer(); fn(m, t); mayGuardar(m); soloMain(); };
I.mayF = myM((m, t) => { m[t.dataset.k] = t.value; });
I.mayQ = myM((m, t) => { m.cant[t.dataset.p] = t.value; });
I.mayP = myM((m, t) => { m.precio[t.dataset.p] = t.value; m.modo[t.dataset.p] = "precio"; });
I.mayR = myM((m, t) => { m.rent[t.dataset.p] = t.value; m.modo[t.dataset.p] = "rent"; });
C.mayImprimir = () => { initRS(); mayImprimir(); };
C.myTab = b => { MY.tab = b.dataset.t; soloMain(); };
C.myVerArch = () => { MY.verArch = !MY.verArch; soloMain(); };
C.myLimpiar = () => { const m = mayLeer(); m.cant = {}; m.para = ""; m.consulta = ""; m.cotId = ""; mayGuardar(m); soloMain(); };
const cotDe = id => (mayDatos() || {pedidos: []}).pedidos.find(p => p.id === id);
C.myGuardarCoti = b => { initRS(); const m = mayLeer(), items = PRODS.filter(p => !fichaGuardada(p)._nueva).map(p => { const r = mayCalc(p, m); return {producto: p, cantidad: r.n, precio: r.pm}; }).filter(x => x.cantidad > 0);
  if (!items.length) { L.toast("Poné la cantidad de al menos una funda."); return; }
  const sinP = items.find(x => !(x.precio > 0)); if (sinP) { L.toast("Poné el precio de " + nombreP(sinP.producto) + "."); return; }
  pedir("mayoristaGuardar", {data: {id: m.cotId, cotizacion: true, negocio: m.para, items: items, envio: nm(m.envio), validez: nd(m.validez), consulta: m.consulta}}, m.cotId ? "Cotización actualizada" : "Cotización guardada", b)
    .then(r => { if (r) { const k = mayLeer(); k.cotId = r.id; mayGuardar(k); soloMain(); } }); };
C.myCotAbrir = b => { const x = cotDe(b.dataset.id); if (!x) return; myCotCargar(x); MY.tab = "cotizar"; soloMain(); window.scrollTo(0, 0); };
C.myCotPdf = b => { const x = cotDe(b.dataset.id); if (!x) return; myCotCargar(x); initRS(); mayImprimir(); soloMain(); };
C.myCotPedido = b => { const x = cotDe(b.dataset.id); if (!x) return; initRS(); MY.ped = myPedDesde(x); myPedDlg(); };
C.myCotDescartar = b => { const x = cotDe(b.dataset.id); if (!x || !confirm("¿Descartar esta cotización?")) return;
  pedir("mayoristaCancelar", {id: x.id}, "Cotización descartada", b).then(r => { if (r) { const m = mayLeer(); if (m.cotId === x.id) { m.cotId = ""; mayGuardar(m); soloMain(); } } }); };
C.myCotizarConsulta = b => { const x = (mayDatos() || {consultas: []}).consultas.find(c => String(c.fila) === b.dataset.f); if (!x) return;
  const m = mayLeer(); m.cant = {doble: x.doble ? String(x.doble) : "", individual: x.individual ? String(x.individual) : ""}; m.para = x.negocio || (x.nombre + " " + x.apellido).trim(); m.consulta = String(x.fila);
  mayGuardar(m); MY.tab = "cotizar"; soloMain(); window.scrollTo(0, 0); };
const myConsCambiar = (b, estado, msg) => pedir("mayoristaConsulta", {fila: b.dataset.f, estado: estado}, null, b).then(r => { if (!r) return;
  if (r.estado !== estado) L.toast("No se pudo: el sistema instalado es una versión vieja. Andá a Configuración → Sistema → Buscar actualización → Actualizar ahora y probá de nuevo.", 9000); else L.toast(msg); });
C.myConsBorrar = b => { if (confirm("¿Borrar esta consulta? No se puede deshacer desde el panel.")) myConsCambiar(b, "borrada", "Consulta borrada"); };
C.myConsEst = b => myConsCambiar(b, b.dataset.e, b.dataset.e === "archivada" ? "Consulta archivada" : "Listo");
C.myPedNuevo = () => { initRS(); MY.ped = myPedDesde(null); myPedDlg(); };
C.myPedEditar = b => { const x = (mayDatos() || {pedidos: []}).pedidos.find(p => p.id === b.dataset.id); if (!x) return; MY.ped = myPedDesde(x); myPedDlg(); };
I.myPF = t => { MY.ped[t.dataset.k] = t.value; };
I.myPI = t => { MY.ped.items[t.dataset.p][t.dataset.k] = t.value; const e = $("#mpTot"); if (e) e.textContent = money(PRODS.reduce((a, p) => a + Math.floor(nd(MY.ped.items[p].cantidad) || 0) * nm(MY.ped.items[p].precio), 0)); };
I["myPEnt:change"] = t => { MY.ped.entrega = t.value; myPedDlg(); };
I["myPPag:change"] = t => { MY.ped.pagado = t.checked; };
C.myPedOk = b => { const P = MY.ped, items = PRODS.map(p => ({producto: p, cantidad: Math.floor(nd(P.items[p].cantidad) || 0), precio: nm(P.items[p].precio)})).filter(x => x.cantidad > 0);
  const ro = !!P.id && P.estado !== "pendiente" && P.estado !== "cotizacion";
  if (!ro) { if (!items.length) { errEn("mpErr", "Poné la cantidad de al menos una funda."); return; }
    const sinP = items.find(x => !(x.precio > 0)); if (sinP) { errEn("mpErr", "Poné el precio de " + nombreP(sinP.producto) + "."); return; }
    if (!String(P.negocio || P.nombre || "").trim()) { errEn("mpErr", "Poné el nombre del negocio."); return; } }
  const data = Object.assign({}, P, {items: items}); delete data.estado;
  const nuevo = !P.id || P.estado === "cotizacion";
  pedir("mayoristaGuardar", {data: data}, nuevo ? "Pedido cargado: queda pendiente, todavía no tocó el stock" : "Pedido guardado", b).then(r => { if (r) { L.cerrarDlg(); MY.tab = "pedidos"; if (nuevo && (!P.id || mayLeer().cotId === P.id)) C.myLimpiar(); else soloMain(); } }); };
C.mySacar = b => { const x = (mayDatos() || {pedidos: []}).pedidos.find(p => p.id === b.dataset.id); if (!x) return; const st = S.data.stock || {}, q = {};
  (x.items || []).forEach(it => { q[it.producto] = (q[it.producto] || 0) + it.cantidad; });
  const falta = Object.keys(q).filter(p => q[p] > Math.max(0, (st[p] || {}).disponible || 0));
  if (falta.length) { L.toast("No alcanza el stock: " + falta.map(p => nombreP(p) + " (son " + q[p] + " y hay " + Math.max(0, (st[p] || {}).disponible || 0) + ")").join(", ") + ". Recibí la tanda en el Taller o cargalas en Stock de fundas.", 7000); return; }
  if (!confirm("¿Sacar del stock las fundas de este pedido?\n\n" + Object.keys(q).map(p => nombreP(p) + ": " + q[p] + " (quedan " + ((st[p] || {}).disponible - q[p]) + ")").join("\n") + "\n\nEl pedido pasa a Hoy " + (x.pagado ? "para prepararlo y despacharlo." : "esperando que te pague."))) return;
  pedir("mayoristaSacar", {id: x.id}, "Listo: las fundas salieron del stock y el pedido está en Hoy", b); };
C.myPedCancelar = b => { const x = (mayDatos() || {pedidos: []}).pedidos.find(p => p.id === b.dataset.id); if (!x) return;
  if (!confirm(x.estado === "pendiente" ? "¿Cancelar este pedido?" : "¿Cancelar este pedido? Las fundas vuelven al stock.")) return;
  pedir("mayoristaCancelar", {id: x.id}, "Pedido cancelado", b); };
C.rsReset = () => { RS.init = false; initRS(); soloMain(); };
C.rsGuardarParams = b => pedir("guardarConfig", {valores: {comision_mp: String(nd(RS.comision)), rentabilidad_objetivo: String(nd(RS.objetivo)), mix_tarjeta: String(nd(RS.mix))}}, "Parámetros guardados", b);
C.rsAplicar = b => { const v = {precio_tarjeta: String(nm(RS.precios.doble.t)), precio_transferencia: String(nm(RS.precios.doble.x)), precio2_tarjeta: String(nm(RS.precios.individual.t)), precio2_transferencia: String(nm(RS.precios.individual.x))};
  if (!confirm("¿Publicar estos precios en la web?\n\n" + nombreP("doble") + ": " + money(v.precio_tarjeta) + " tarjeta / " + money(v.precio_transferencia) + " transferencia\n" + nombreP("individual") + ": " + money(v.precio2_tarjeta) + " / " + money(v.precio2_transferencia))) return;
  pedir("guardarConfig", {valores: v}, "Precios publicados en la web", b).then(() => { RS.init = false; }); };
// migración
C.tMigrar = b => { b.disabled = true; b.innerHTML = '<span class="spinner"></span>';
  const local = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  const LSK = {costos: "lp-costos", pagos: "lp-pagos", corte: "lp-corte"}, vacio = (a, d) => !d || (a === "costos" ? !(d.productos || []).length : a === "pagos" ? !((d.compromisos || []).length || (d.pagos || []).length) : a === "corte" ? !(d.modelos || []).length : !(d.insumos || []).length);
  Promise.all(["costos", "insumos", "pagos", "corte"].map(a => L.api(a).then(r => r[a]).catch(() => null))).then(r => {
    const origen = [];
    const docs = ["costos", "insumos", "pagos", "corte"].map((a, ix) => { let d = r[ix]; if (vacio(a, d) && LSK[a] && !vacio(a, local(LSK[a]))) { d = local(LSK[a]); origen.push(a); } return vacio(a, d) ? null : d; });
    MG = armarMigracion(docs); MG.origen = origen; MG.vacio = docs.every(d => !d); migrarDlg(); }).catch(e => L.toast(e.message)).finally(() => { if (document.body.contains(b)) { b.disabled = false; b.textContent = "Revisar e importar"; } }); };
I["mgUsar:change"] = t => { MG.tanda.usar = t.checked; migrarDlg(); };
I.mgT = t => { MG.tanda[t.dataset.k] = t.value; };
I["mgProv:change"] = t => { MG.tanda.prov = t.value; };
C.mgOk = b => { const data = Object.assign({}, MG.data);
  if (MG.tanda.usar) { const items = PRODS.map(p => ({producto: p, cantidad: Math.floor(nd(MG.tanda[p]))})).filter(x => x.cantidad > 0); if (items.length) data.tanda = {items: items, estado: "en_confeccion", proveedor: MG.tanda.prov, notas: "Cargada al importar"}; }
  const t = T(), limpio = !t.insumos.length && !t.fichas.length && !t.proveedores.length && !t.gastos.length && !t.compras.length && !t.pagos.length && !t.tandas.length;
  if (limpio) { pedir("tallerMigrar", {data: data}, "Datos importados", b).then(r => { if (r) { L.cerrarDlg(); PD.draft = {}; PD.gastos = null; } }); return; }
  importarSumando(data, b);
};
/* El taller ya tiene algo cargado: se agrega lo que falta, reusando lo que ya existe por nombre. */
async function importarSumando(d, b) {
  const t = T(), idP = {}, idI = {}, idC = {}, paso = m => { b.innerHTML = '<span class="spinner"></span> ' + m; };
  b.disabled = true;
  try {
    for (const p of d.proveedores) { const ya = t.proveedores.find(x => clave(x.nombre) === clave(p.nombre)); if (ya) { idP[p.id] = ya.id; continue; } paso("Proveedores"); idP[p.id] = (await L.api("tallerGuardar", {tipo: "proveedor", data: Object.assign({}, p, {id: ""})})).id; }
    for (const i of d.insumos) { const ya = t.insumos.find(x => clave(x.nombre) === clave(i.nombre)); if (ya) { idI[i.id] = ya.id; continue; } paso("Insumos: " + i.nombre); idI[i.id] = (await L.api("tallerGuardar", {tipo: "insumo", data: Object.assign({}, i, {id: "", proveedor: idP[i.proveedor] || ""})})).id; }
    for (const f of d.fichas) { const ya = t.fichas.find(x => x.producto === f.producto); if (ya && (ya.receta || []).length) continue; if (!f.receta.length && ya) continue; paso("Recetas");
      await L.api("tallerGuardar", {tipo: "ficha", data: Object.assign({}, f, {receta: f.receta.map(r => Object.assign({}, r, {insumo: idI[r.insumo] || r.insumo}))})}); }
    if (!t.gastos.length) for (const g of d.gastos) { paso("Gastos compartidos"); await L.api("tallerGuardar", {tipo: "gasto", data: Object.assign({}, g, {id: ""})}); }
    for (const x of d.stock) { const id = idI[x.insumo]; if (!id || t.movimientos.some(m => m.insumo === id)) continue; paso("Stock"); await L.api("stockAjuste", {insumo: id, cantidad: x.cantidad, tipo: "inicial", detalle: x.detalle}); }
    if (!t.compras.length && !t.pagos.length) {
      for (const c of d.compras) { paso("Deudas"); idC[c.id] = (await L.api("compraRegistrar", {proveedor: idP[c.proveedor], total: c.total, detalle: c.detalle, notas: c.notas, tipo: "otro"})).id; }
      for (const p of d.pagos) { paso("Pagos"); await L.api("pagoRegistrar", {proveedor: idP[p.proveedor], monto: p.monto, fecha: p.fecha, medio: p.medio, nota: p.nota, compra: idC[p.compra] || ""}); }
    }
    if (Object.keys(d.config || {}).length) await L.api("guardarConfig", {valores: Object.assign({}, d.config, {taller_migrado: new Date().toLocaleString("es-AR")})});
    if (d.tanda && !t.tandas.some(x => x.estado === "en_confeccion")) { paso("Tanda"); await L.api("tandaCrear", Object.assign({}, d.tanda, {proveedor: idP[d.tanda.proveedor] || ""})); }
    L.cerrarDlg(); PD.draft = {}; PD.gastos = null; await L.cargar("Datos importados");
  } catch (e) { L.toast("La importación se cortó: " + e.message + ". Lo que se cargó quedó guardado; podés volver a importar y sigue desde ahí.", 8000); b.disabled = false; b.textContent = "Importar"; await L.cargar(); }
}

/* ================= registro ================= */
L.vista("planificar", "Taller", "Planificar tanda", vPlanificar);
L.vista("tandas", "Taller", "Tandas", vTandas, () => ({n: T() ? T().tandas.filter(t => t.estado === "en_confeccion").length : 0}));
L.vista("productos", "Taller", "Productos y recetas", vProductos, () => ({n: PD.dirty ? "•" : 0, bad: true}));
L.vista("insumos", "Taller", "Insumos", vInsumos, () => ({n: T() ? bajoMinimo().length : 0, bad: true}));
L.vista("proveedores", "Taller", "Proveedores y gastos", vProveedores);
L.vista("rentabilidad", "Números", "Precios y rentabilidad", vRentabilidad);
L.vista("mayoristas", "Números", "Mayoristas", vMayoristas, () => { const D = mayDatos(); return {n: D ? D.consultas.filter(x => x.estado === "nueva").length + D.pedidos.filter(x => x.estado === "pendiente").length : 0}; });
// las secciones plegables recuerdan si estaban abiertas al redibujar la pantalla
document.addEventListener("toggle", e => { if (e.target && e.target.id === "pdRolloDet") PD.rolloAbierto = e.target.open; }, true);
window.addEventListener("beforeunload", e => { if (PD.dirty) { e.preventDefault(); e.returnValue = ""; } });
window.TALLER = {inicio: inicio, pendientes: pendientes,
  costoFunda: p => (T() ? costo(fichaGuardada(p)).total : 0), gananciaFunda: p => (T() ? rent(p).gMix : 0), envioFunda: p => (T() ? costo(fichaGuardada(p)).envio || 0 : 0),   // para la pantalla Publicidad
  _test: {analizar: analizar, largoPara: largoPara, costo: costo, rent: rent, armarMigracion: armarMigracion, fichaGuardada: fichaGuardada, RS: RS}};
})();
