/* Los Perrines · Panel · Hoy (la "oficina")
 * Todos los pedidos que necesitan algo, ordenados por etapa:
 * Confirmar pago → Preparar → Etiquetar → Despachar → En camino.
 * Acciones en lote, hoja de preparación para imprimir, mensajes de WhatsApp listos
 * y la hora del resumen diario por mail. La etapa y los avisos los calcula el backend
 * (Codigo.gs, etapaDe/alertaDe), así el panel y el mail cuentan lo mismo.
 */
(function () {
"use strict";
const L = window.LP, S = L.S, esc = L.esc, money = L.money, $ = L.$, $$ = L.$$;
const ETAPAS = [
  ["confirmar", "Confirmar pago", "Transferencias esperando. Cuando veas la plata en Mercado Pago, marcalas como pagadas: a cada cliente le llega el mail."],
  ["preparar", "Preparar", "Ya pagados. Imprimí la hoja de preparación, armá los paquetes y marcalos como preparados."],
  ["etiquetar", "Etiquetar", "Paquetes armados. Exportá la planilla, subila en andreani.com e imprimí las etiquetas."],
  ["despachar", "Despachar", "Ya están en Andreani. Cargá el número de seguimiento de cada uno (Enter pasa al siguiente) y guardá: a cada cliente le llega el mail con el link."],
  ["camino", "En camino", "Despachados en los últimos 7 días."]
];
const SEL = {confirmar: {}, preparar: {}};   // pedidos tildados en cada etapa
const TR = {};                                // números de seguimiento que vas escribiendo

function nuevo(d) { return !!(d && d.oficina); }
function etapa(p) { if (p._etapa !== undefined) return p._etapa; return {reserva: "confirmar", pagado: "preparar", exportado: "despachar"}[p.estado] || ""; }
function grupos(d) {
  const g = {}; ETAPAS.forEach(e => { g[e[0]] = []; });
  d.pedidos.forEach(p => { const e = etapa(p); if (e) g[e].push(p); });
  ["confirmar", "preparar", "etiquetar", "despachar"].forEach(k => g[k].sort((a, b) => a._ts - b._ts));   // el más viejo primero
  Object.keys(SEL).forEach(k => { const ok = {}; g[k].forEach(p => { ok[p.id] = 1; }); Object.keys(SEL[k]).forEach(id => { if (!ok[id]) delete SEL[k][id]; }); });
  return g;
}
function elegidos(k) { return Object.keys(SEL[k]).filter(id => SEL[k][id]); }
function itemsDe(p) { try { const j = JSON.parse(p.items); if (Array.isArray(j) && j.length) return j; } catch (e) {} return [{producto: "doble", cantidad: +p.cantidad || 1}]; }
function nombreProd(d, id) { const x = (d.productos || []).filter(p => p.id === id)[0]; return x ? x.nombre : (id === "individual" ? "Funda individual" : "Funda doble"); }
function destino(p) { return p.entrega === "sucursal" ? "Retira en sucursal Andreani " + p.sucursal : (p.calle + " " + p.numero + (p.piso ? " piso " + p.piso : "") + (p.depto ? " " + p.depto : "") + " · " + p.prov_loc_cp); }

/* ---------- WhatsApp con el mensaje ya escrito ---------- */
function tel(p) { let t = (String(p.cel_cod || "") + String(p.cel_num || "")).replace(/\D/g, ""); if (t.length < 8) return ""; return /^54/.test(t) ? t : "549" + t; }
function mensaje(p, k, d) {
  const n = String(p.nombre || "").split(" ")[0], c = d.config;
  if (k === "confirmar") {
    if (p.estado === "vencido") return "Hola " + n + "! Te escribo de Los Perrines 🐾 Se venció la reserva de tu pedido " + p.id + ". Si todavía lo querés, avisame y te lo guardo. Si ya transferiste, mandame el comprobante por acá.";
    return "Hola " + n + "! Te escribo de Los Perrines 🐾 Tenemos reservado tu pedido " + p.id + " (" + (p._items || "") + ") por " + money(p.total) + ". Para confirmarlo transferí "
      + (c.alias ? "al alias " + c.alias : "a la cuenta que te mandamos por mail") + (p.vence ? " antes del " + p.vence : "") + " y mandame el comprobante por acá. ¡Gracias!";
  }
  if (k === "camino") return "Hola " + n + "! Tu pedido " + p.id + " de Los Perrines ya salió 🚚 Lo podés seguir acá: https://www.andreani.com/envio/" + p.tracking + " Cualquier cosa, escribime.";
  return "Hola " + n + "! Ya recibimos el pago de tu pedido " + p.id + " 🐾 Lo estamos preparando y te aviso cuando salga, con el número de seguimiento.";
}
function wa(p, k, d) { const t = tel(p); return t ? '<a class="btn ghost sm" target="_blank" rel="noopener" href="https://wa.me/' + t + '?text=' + encodeURIComponent(mensaje(p, k, d)) + '">WhatsApp</a>' : ""; }

/* ---------- vista ---------- */
function tarjeta(p, k, d) {
  const al = p._alerta, sel = SEL[k], ok = nuevo(d);
  let extra = "", acts = wa(p, k, d);
  if (k === "confirmar" && !ok) acts += '<button class="btn main sm" data-a="pagado" data-id="' + esc(p.id) + '">Marcar como pagado</button>';
  if (k === "etiquetar" && ok) acts += '<button class="btn ghost sm" data-a="hoyVolver" data-id="' + esc(p.id) + '">Volver a Preparar</button>';
  if (k === "despachar") extra = '<input class="inp hoyTr" inputmode="numeric" autocomplete="off" placeholder="N° de seguimiento Andreani" id="ht-' + esc(p.id) + '" data-in="hoyTr" data-id="' + esc(p.id) + '" value="' + esc(TR[p.id] || "") + '" style="margin-top:8px">';
  if (k === "camino" && p.tracking) extra = '<div class="small" style="margin-top:4px">Seguimiento: <a href="https://www.andreani.com/envio/' + esc(p.tracking) + '" target="_blank" rel="noopener">' + esc(p.tracking) + '</a></div>';
  return '<div class="hoyp' + (al ? " " + al.nivel : "") + '">'
    + (sel ? '<input type="checkbox" id="hc-' + k + '-' + esc(p.id) + '" data-ch="hoySel" data-k="' + k + '" data-id="' + esc(p.id) + '"' + (sel[p.id] ? " checked" : "") + ' aria-label="Elegir ' + esc(p.id) + '">' : "")
    + '<div class="hoyb"><div class="hoyh"><b>' + esc(p.nombre + " " + p.apellido) + '</b><b>' + money(p.total) + '</b></div>'
    + '<div class="muted small">' + esc(p.id) + ' · ' + esc(p._items || (p.cantidad + " u.")) + ' · ' + (p.pago === "tarjeta" ? "Tarjeta" : "Transferencia") + '</div>'
    + (k !== "confirmar" ? '<div class="muted small">' + esc(destino(p)) + '</div>' : (p.estado === "reserva" && p.vence ? '<div class="muted small">Reserva hasta el ' + esc(p.vence) + '</div>' : ""))
    + (p.observaciones ? '<div class="small">Observaciones: ' + esc(p.observaciones) + '</div>' : "")
    + (p.notas ? '<div class="small">Nota: ' + esc(p.notas) + '</div>' : "")
    + (al ? '<div class="small hoyal">' + esc(al.texto) + '</div>' : "")
    + extra + (acts ? '<div class="acts" style="margin-top:8px">' + acts + '</div>' : "") + '</div></div>';
}
function barra(k, lista, d) {
  const ok = nuevo(d), n = SEL[k] ? elegidos(k).length : 0, todos = SEL[k] && lista.length && lista.every(p => SEL[k][p.id]);
  const chkAll = SEL[k] ? '<label class="check small"><input type="checkbox" id="hoyAll-' + k + '" data-ch="hoyAll" data-k="' + k + '"' + (todos ? " checked" : "") + '> Todos</label>' : "";
  if (k === "confirmar") return ok ? '<div class="hoybar">' + chkAll + '<button class="btn main" data-a="hoyPagar"' + (n ? "" : " disabled") + '>Marcar como pagados (' + n + ')</button></div>' : "";
  if (k === "preparar") return '<div class="hoybar">' + chkAll + '<button class="btn ghost" data-a="hoyHoja">🖨 Hoja de preparación' + (n ? " (" + n + ")" : "") + '</button>'
    + (ok ? '<button class="btn main" data-a="hoyPreparado"' + (n ? "" : " disabled") + '>Marcar como preparados (' + n + ')</button>' : "") + '</div>';
  if (k === "etiquetar") return '<div class="hoybar"><button class="btn main" data-a="hoyExportar">Exportar planilla para Andreani (' + lista.length + ')</button></div>';
  if (k === "despachar") return '<div class="hoybar"><button class="btn main" data-a="hoyTrGuardar">Guardar los seguimientos cargados</button></div>';
  return "";
}
function vHoy(d) {
  const g = grupos(d), ok = nuevo(d), c = d.config;
  let h = '<div class="ph"><div><h2>Hoy</h2><p class="sub">Todo lo que hay que hacer con los pedidos, en orden. Cada pedido pasa solo a la etapa siguiente.</p></div></div>';
  if (!ok) h += '<div class="note bad" style="margin-top:0"><b>Falta actualizar el backend.</b> Pegá el nuevo <code>Codigo.gs</code> en Apps Script y publicá una nueva versión (Implementar → Administrar implementaciones → Editar → Nueva versión). Hasta entonces esta pantalla funciona a medias: sin acciones en lote, sin “Preparar” ni avisos de atraso.</div>';
  h += '<div class="hoysteps">' + ETAPAS.map(e => { const L2 = g[e[0]], malos = L2.filter(p => p._alerta && p._alerta.nivel === "bad").length;
    return '<button class="hoystep' + (malos ? " bad" : "") + '" data-a="hoyIr" data-k="' + e[0] + '"><small>' + esc(e[1]) + '</small><b>' + L2.length + '</b>' + (malos ? '<span>' + malos + ' atrasado' + (malos > 1 ? "s" : "") + '</span>' : "") + '</button>'; }).join("") + '</div>';
  const avisos = [];
  ETAPAS.forEach(e => g[e[0]].forEach(p => { if (p._alerta) avisos.push([p._alerta.nivel, p, e[1]]); }));
  avisos.sort((a, b) => (a[0] === "bad" ? 0 : 1) - (b[0] === "bad" ? 0 : 1));
  if (avisos.length) h += '<div class="block" style="margin-top:0"><h3>Ojo con estos</h3><ul class="todo">' + avisos.map(x => '<li class="' + x[0] + '"><span><b>' + esc(x[1].nombre + " " + x[1].apellido) + '</b> · ' + esc(x[1].id) + '<br><span class="small">' + esc(x[1]._alerta.texto) + '</span></span><span class="pill mute">' + esc(x[2]) + '</span></li>').join("") + '</ul></div>';
  ETAPAS.forEach((e, i) => {
    const k = e[0], lista = g[k];
    h += '<div class="block" id="hoy-' + k + '"><h3>' + (i + 1) + '. ' + esc(e[1]) + ' (' + lista.length + ')</h3>';
    if (!lista.length) { h += '<p class="muted small" style="margin:0">' + (k === "camino" ? "Nada despachado en los últimos 7 días." : "Nada pendiente acá.") + '</p></div>'; return; }
    h += '<p class="muted small" style="margin:-4px 0 8px">' + esc(e[2]) + '</p>' + barra(k, lista, d) + lista.map(p => tarjeta(p, k, d)).join("") + '</div>';
  });
  const hora = c.resumen_hora === undefined ? "20" : String(c.resumen_hora);
  let opts = '<option value=""' + (hora === "" ? " selected" : "") + '>No mandarlo</option>';
  for (let x = 0; x < 24; x++) opts += '<option value="' + x + '"' + (hora === String(x) ? " selected" : "") + '>' + x + ' h</option>';
  h += '<div class="block"><h3>Resumen diario por mail</h3>'
    + '<p class="muted small" style="margin:-4px 0 10px">Una vez por día te llega una foto de todo lo pendiente (qué confirmar, preparar y despachar, y qué se está atrasando) y lo nuevo desde el resumen anterior. Una compra que entra después del resumen aparece en el del día siguiente; igual, cada venta te avisa por mail en el momento.</p>'
    + (ok ? '<label class="f" style="max-width:220px">Hora<select id="hoyHora" data-ch="hoyHora">' + opts + '</select></label>'
      + '<p class="small" style="margin:0 0 10px">' + (c.email_aviso ? 'Llega a <b>' + esc(c.email_aviso) + '</b>' + (hora !== "" ? ', entre las ' + hora + ' y las ' + ((+hora + 1) % 24) + ' h (Google revisa una vez por hora).' : '.') : '<span class="neg">Falta cargar tu email para avisos</span> en <button class="linkb" data-go="config">Configuración</button>.') + '</p>'
      + '<p class="muted small" style="margin:0 0 10px">Último resumen enviado: ' + esc(d.ultimoResumen || "todavía ninguno") + '.</p>'
      + '<button class="btn ghost" data-a="hoyResumen"' + (c.email_aviso ? "" : " disabled") + '>Mandarme el resumen ahora</button>'
      : '<p class="muted small" style="margin:0">Se activa cuando actualices el Codigo.gs.</p>') + '</div>';
  return h;
}
function cuantos() { if (!S.data) return null; const g = grupos(S.data), n = g.confirmar.length + g.preparar.length + g.etiquetar.length + g.despachar.length;
  return {n: n, bad: S.data.pedidos.some(p => p._etapa && p._alerta && p._alerta.nivel === "bad")}; }

/* ---------- hoja de preparación ---------- */
function hoja(lista, d) {
  const tot = {}, prods = (d.productos || []).map(p => p.id);
  lista.forEach(p => itemsDe(p).forEach(it => { const id = it.producto === "individual" ? "individual" : "doble"; tot[id] = (tot[id] || 0) + (+it.cantidad || 0); }));
  const totTxt = prods.filter(id => tot[id]).map(id => '<div class="t"><b>' + tot[id] + '</b>' + esc(nombreProd(d, id)) + '</div>').join("") + '<div class="t"><b>' + lista.length + '</b>Paquete' + (lista.length > 1 ? "s" : "") + '</div>';
  const fecha = new Date().toLocaleDateString("es-AR", {weekday: "long", day: "numeric", month: "long"});
  const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hoja de preparación</title><style>'
    + 'body{font:15px/1.4 Arial,Helvetica,sans-serif;color:#111;background:#fff;margin:24px}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 14px;color:#444}'
    + '.tots{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 18px}.t{border:2px solid #111;border-radius:10px;padding:8px 14px;min-width:110px}.t b{display:block;font-size:26px}'
    + '.p{border:1px solid #999;border-radius:10px;padding:10px 12px;margin:0 0 10px;break-inside:avoid;display:flex;gap:12px}.box{width:22px;height:22px;border:2px solid #111;border-radius:4px;flex:none;margin-top:2px}'
    + '.p b{font-size:16px}.m{color:#444;font-size:14px}.lleva{font-size:17px;font-weight:bold;margin:4px 0}button{font-size:16px;padding:10px 16px;margin:0 0 16px}@media print{button{display:none}body{margin:10mm}}'
    + '</style></head><body><button onclick="print()">🖨 Imprimir</button><h1>Hoja de preparación</h1><p>' + esc(fecha) + ' · ' + lista.length + ' pedido' + (lista.length > 1 ? "s" : "") + '</p>'
    + '<div class="tots">' + totTxt + '</div>'
    + lista.map(p => '<div class="p"><div class="box"></div><div><b>' + esc(p.id) + ' · ' + esc(p.nombre + " " + p.apellido) + '</b>'
      + '<div class="lleva">' + itemsDe(p).map(it => (+it.cantidad || 1) + ' × ' + esc(it.nombre || nombreProd(d, it.producto))).join(" · ") + '</div>'
      + '<div class="m">' + esc(destino(p)) + '</div>' + (p.observaciones ? '<div class="m">Observaciones: ' + esc(p.observaciones) + '</div>' : "") + (p.notas ? '<div class="m">Nota: ' + esc(p.notas) + '</div>' : "") + '</div></div>').join("")
    + '<script>setTimeout(function(){print()},400)<\/script></body></html>';
  const w = window.open("", "_blank");
  if (!w) { L.toast("El navegador bloqueó la ventana. Permití las ventanas emergentes para este sitio y probá de nuevo.", 6000); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

/* ---------- resultados de las acciones en lote ---------- */
function informe(r, uno, varios) {
  if (!r) return;
  const n = (r.hechos || []).length, e = r.errores || [], hecho = n === 1 ? uno : varios;
  if (!e.length) { L.toast(n + " " + hecho); return; }
  L.dlg('<div class="row"><h3>' + n + ' ' + esc(hecho) + ', ' + e.length + ' no</h3><button class="x" data-a="cerrar" aria-label="Cerrar">×</button></div>'
    + '<ul style="margin:0;padding-left:18px">' + e.map(x => '<li><b>' + esc(x.id) + '</b>: ' + esc(x.error) + '</li>').join("") + '</ul>'
    + '<div class="acts"><button class="btn main" data-a="cerrar">Entendido</button></div>');
}

/* ---------- eventos ---------- */
L.INPUT["hoySel:change"] = t => { SEL[t.dataset.k][t.dataset.id] = t.checked; L.render(); };
L.INPUT["hoyAll:change"] = t => { const k = t.dataset.k; grupos(S.data)[k].forEach(p => { SEL[k][p.id] = t.checked; }); L.render(); };
L.INPUT.hoyTr = t => { TR[t.dataset.id] = t.value; };
L.INPUT["hoyHora:change"] = t => { const v = t.value; L.accion("guardarConfig", {valores: {resumen_hora: v}}, v === "" ? "Listo: no te mando más el resumen" : "Listo: el resumen te llega a las " + v + " h"); };
document.addEventListener("keydown", e => {
  const t = e.target; if (e.key !== "Enter" || !t.classList || !t.classList.contains("hoyTr")) return;
  e.preventDefault(); const L2 = $$(".hoyTr"), i = L2.indexOf(t);
  if (i < L2.length - 1) L2[i + 1].focus(); else { const b = $('[data-a="hoyTrGuardar"]'); if (b) b.click(); }
});
L.CLICK.hoyIr = t => { const el = document.getElementById("hoy-" + t.dataset.k); if (el) el.scrollIntoView({behavior: "smooth", block: "start"}); };
L.CLICK.hoyPagar = t => {
  const ids = elegidos("confirmar"); if (!ids.length) return;
  if (!confirm("¿Confirmás que recibiste el pago de " + ids.length + " pedido" + (ids.length > 1 ? "s" : "") + "? A cada cliente le llega un mail.")) return;
  L.accion("pagadoLote", {ids: ids}, null, t).then(r => { if (r) { (r.hechos || []).forEach(id => { delete SEL.confirmar[id]; }); L.render(); informe(r, "marcado como pagado", "marcados como pagados"); } });
};
L.CLICK.hoyPreparado = t => {
  const ids = elegidos("preparar"); if (!ids.length) return;
  L.accion("preparado", {ids: ids, valor: true}, null, t).then(r => { if (r) { (r.hechos || []).forEach(id => { delete SEL.preparar[id]; }); L.render(); informe(r, "pasó a Etiquetar", "pasaron a Etiquetar"); } });
};
L.CLICK.hoyVolver = t => { L.accion("preparado", {ids: [t.dataset.id], valor: false}, "Volvió a Preparar", t); };
L.CLICK.hoyHoja = () => {
  const g = grupos(S.data), ids = elegidos("preparar"), lista = ids.length ? g.preparar.filter(p => SEL.preparar[p.id]) : g.preparar;
  if (!lista.length) { L.toast("No hay pedidos para preparar."); return; }
  hoja(lista, S.data);
};
L.CLICK.hoyExportar = t => {
  const g = grupos(S.data), ids = g.etiquetar.map(p => p.id);
  if (!ids.length) return;
  L.accion("exportar", {ids: ids}, null, t).then(r => { if (!r) return;
    L.dlg('<div class="row"><h3>Planilla lista</h3><button class="x" data-a="cerrar" aria-label="Cerrar">×</button></div>'
      + '<p class="muted" style="margin:0 0 12px">' + r.cantidad + ' envíos (' + r.domicilio + ' a domicilio, ' + r.sucursal + ' a sucursal). Descargala, subila en andreani.com e imprimí las etiquetas. Después cargá los números de seguimiento en “Despachar”.</p>'
      + '<a class="btn main big" style="display:flex" href="' + esc(r.url) + '" target="_blank" rel="noopener">Descargar Excel</a>'
      + '<p class="muted small" style="margin:12px 0 0">También queda guardada en tu Drive, en la carpeta "Los Perrines - Envíos Andreani".</p>'); });
};
L.CLICK.hoyTrGuardar = t => {
  const g = grupos(S.data), items = g.despachar.filter(p => String(TR[p.id] || "").trim()).map(p => ({id: p.id, tracking: String(TR[p.id]).trim()}));
  if (!items.length) { L.toast("Escribí al menos un número de seguimiento."); return; }
  if (!confirm("¿Guardar " + items.length + " número" + (items.length > 1 ? "s" : "") + " de seguimiento? A cada cliente le llega el mail con el link.")) return;
  if (!nuevo(S.data)) {   // backend viejo: de a uno
    let hechos = [], errores = [];
    items.reduce((pr, x) => pr.then(() => L.api("despachar", x).then(() => hechos.push(x.id), e => errores.push({id: x.id, error: e.message}))), Promise.resolve())
      .then(() => { hechos.forEach(id => { delete TR[id]; }); return L.cargar(); }).then(() => informe({hechos: hechos, errores: errores}, "despachado", "despachados"));
    return;
  }
  L.accion("despacharLote", {items: items}, null, t).then(r => { if (r) { (r.hechos || []).forEach(id => { delete TR[id]; }); L.render(); informe(r, "despachado: le llegó el mail", "despachados: les llegó el mail"); } });
};
L.CLICK.hoyResumen = t => {
  t.disabled = true;
  L.api("resumenAhora").then(r => { L.toast("Te mandé el resumen a " + r.email, 4500); t.disabled = false; }).catch(e => { L.toast(e.message, 5000); t.disabled = false; });
};

L.vista("hoy", "", "Hoy", vHoy, cuantos, "pedidos");
})();
