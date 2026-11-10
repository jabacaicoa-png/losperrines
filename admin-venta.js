/* Los Perrines · Panel · Ventas → Nueva venta
 * Para cargar una venta hecha por fuera de la web (WhatsApp, Instagram, en mano...).
 * Pide los mismos datos que la compra en la web, así el cliente recibe los mismos mails
 * y, si va por Andreani, entra igual a la planilla. Cambia solo la gestión: precio libre,
 * cualquier medio de pago y entrega en mano. No se le avisa a Meta (no vino de un anuncio).
 * Los campos no redibujan la pantalla al tipear (guardan el valor en F); solo los botones
 * que cambian qué se muestra (entrega, pago) redibujan.
 */
(function () {
"use strict";
const L = window.LP, S = L.S, esc = L.esc, money = L.money, $ = L.$, nm = L.nm;
const CANALES = ["WhatsApp", "Instagram", "Facebook", "Conocido", "Veterinaria", "Feria", "Otro"];
const MEDIOS = [["efectivo", "Efectivo"], ["transferencia", "Transferencia"], ["tarjeta", "Tarjeta (Mercado Pago)"], ["otro", "Otro"]];
let F = null, LOC = null, SUC = null, OPC_LOC = [];

function prods() { return (S.data && S.data.productos || []).filter(p => p.id === "doble" || p.id === "individual"); }
function precioWeb(p) { return F.medio === "tarjeta" ? +p.tarjeta || 0 : +p.transferencia || 0; }
function nuevo() {
  F = {cant: {doble: 1, individual: 0}, precio: {}, tocado: {}, medio: "transferencia", pagado: true, entregado: false, entrega: "domicilio",
    nombre: "", apellido: "", dni: "", email: "", cel_cod: "", cel_num: "", cp: "", prov_loc_cp: "", calle: "", numero: "", piso: "", depto: "",
    sucursal: "", observaciones: "", canal: "WhatsApp", bonificacion: ""};
  prods().forEach(p => { F.precio[p.id] = precioWeb(p); });
  OPC_LOC = [];
}
function stockDe(id) { const s = S.data && S.data.stock && S.data.stock[id]; return s ? Math.max(0, s.disponible) : 0; }
function totalF() { return prods().reduce((a, p) => a + (F.cant[p.id] || 0) * nm(F.precio[p.id]), 0); }
function listaF() { return prods().reduce((a, p) => a + (F.cant[p.id] || 0) * precioWeb(p), 0); }

const campo = (k, lbl, extra) => '<label class="f">' + lbl + '<input class="inp" id="nv-' + k + '" data-in="nvCampo" data-k="' + k + '" value="' + esc(F[k]) + '"' + (extra || "") + '></label>';
const boton = (grupo, val, txt, on) => '<button class="chip" data-a="nvElegir" data-g="' + grupo + '" data-v="' + val + '" aria-pressed="' + !!on + '">' + txt + '</button>';

function vNueva(d) {
  if (!F) nuevo();
  const P = prods(), tot = totalF(), lista = listaF(), andreani = F.entrega !== "mano";
  let h = '<div class="ph"><div><h2>Nueva venta</h2><p class="sub">Para una venta que hiciste por fuera de la web (WhatsApp, Instagram, en mano…). El cliente recibe los mismos mails que si comprara en la web y, si va por Andreani, entra igual a la planilla. No se le avisa a Meta porque no vino de un anuncio.</p></div></div>';
  if (!d.ventaManual) return h + '<div class="note bad"><b>Falta actualizar el backend.</b> Para cargar ventas desde acá, pegá el nuevo <code>Codigo.gs</code> en Apps Script, ejecutá <code>instalar</code> y publicá una nueva versión. Después tocá ↻ Actualizar.</div>';

  h += '<div class="block" style="margin-top:0"><h3>1. Qué vendiste</h3>' + P.map(p => {
    const n = F.cant[p.id] || 0, st = stockDe(p.id);
    return '<div class="cfg-row" style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;justify-content:space-between">'
      + '<div style="min-width:150px"><b>' + esc(p.nombre) + '</b><br><span class="muted small">' + st + ' en stock · web ' + money(precioWeb(p)) + '</span></div>'
      + '<div class="inline" style="gap:6px;align-items:center"><button class="btn ghost sm" data-a="nvCant" data-p="' + p.id + '" data-d="-1" aria-label="Uno menos">−</button><b style="min-width:22px;text-align:center">' + n + '</b><button class="btn ghost sm" data-a="nvCant" data-p="' + p.id + '" data-d="1" aria-label="Uno más">+</button></div>'
      + '<label class="f" style="margin:0;width:140px">Precio por unidad<input class="inp" inputmode="numeric" id="nv-precio-' + p.id + '" data-in="nvPrecio" data-p="' + p.id + '" value="' + esc(F.precio[p.id]) + '"></label></div>';
  }).join("")
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:10px"><span class="muted">Total</span><b style="font-size:1.4rem" id="nvTotal">' + money(tot) + '</b></div>'
    + '<div class="muted small" id="nvDif">' + difTxt(tot, lista) + '</div>'
    + campo("bonificacion", "Bonificación (opcional, la ve el cliente en el mail)", ' placeholder="Ej: Envío bonificado"') + '</div>';

  h += '<div class="block"><h3>2. Cómo te pagó</h3><div class="filters" style="margin:0 0 10px">' + MEDIOS.map(m => boton("medio", m[0], m[1], F.medio === m[0])).join("") + '</div>'
    + '<div class="filters" style="margin:0">' + boton("pagado", "si", "Ya me pagó", F.pagado) + boton("pagado", "no", "Todavía no me pagó", !F.pagado) + '</div>'
    + (!F.pagado ? '<p class="muted small" style="margin:8px 0 0">Queda en Hoy → Confirmar pago (sin vencerse) hasta que la marques pagada. El stock queda apartado.' + (F.medio === "transferencia" ? ' Al cliente le mandamos tus datos para transferir.' : '') + '</p>' : '') + '</div>';

  h += '<div class="block"><h3>3. Datos del cliente</h3><div class="g2">' + campo("nombre", "Nombre", ' autocomplete="off"') + campo("apellido", "Apellido", ' autocomplete="off"') + '</div>'
    + '<div class="g2">' + campo("dni", "DNI" + (andreani ? "" : " (opcional)"), ' inputmode="numeric" autocomplete="off"') + campo("email", "Mail", ' type="email" autocomplete="off"') + '</div>'
    + '<div class="g2" style="grid-template-columns:1fr 2fr">' + campo("cel_cod", "Característica", ' inputmode="numeric" placeholder="266"') + campo("cel_num", "Celular", ' inputmode="numeric" placeholder="4123456"') + '</div>'
    + '<p class="muted small" style="margin:-4px 0 0">El mail es obligatorio: le llega el “¡Gracias por tu compra!” y después el seguimiento y el pedido de foto de su mascota, igual que en la web.</p></div>';

  h += '<div class="block"><h3>4. Entrega</h3><div class="filters" style="margin:0 0 12px">' + boton("entrega", "domicilio", "Andreani a domicilio", F.entrega === "domicilio") + boton("entrega", "sucursal", "Andreani a sucursal", F.entrega === "sucursal") + boton("entrega", "mano", "En mano / retira", F.entrega === "mano") + '</div>';
  if (andreani) {
    h += '<div class="g2" style="grid-template-columns:1fr 2fr"><label class="f">Código postal<input class="inp" id="nv-cp" data-in="nvCP" inputmode="numeric" maxlength="4" value="' + esc(F.cp) + '"></label>'
      + '<label class="f">Localidad<select class="inp" id="nv-loc" data-ch="nvLoc">' + opcLoc() + '</select></label></div>';
    if (F.entrega === "domicilio") h += '<div class="g2" style="grid-template-columns:2fr 1fr">' + campo("calle", "Calle") + campo("numero", "Número", ' inputmode="numeric"') + '</div><div class="g2">' + campo("piso", "Piso (opcional)") + campo("depto", "Depto (opcional)") + '</div>';
    else h += '<label class="f">Sucursal de Andreani<select class="inp" id="nv-suc" data-ch="nvSuc">' + opcSuc() + '</select></label>';
  } else {
    h += '<div class="filters" style="margin:0 0 8px">' + boton("entregado", "no", "La entrego después", !F.entregado) + boton("entregado", "si", "Ya se la di", F.entregado && F.pagado) + '</div>'
      + '<p class="muted small" style="margin:0 0 10px">' + (F.entregado && F.pagado ? 'Queda como entregada. A los 2 días le mandamos el mail pidiéndole una foto de su mascota con la funda.' : 'Queda en Hoy → Preparar. Cuando la entregues, marcala como entregada y a los 2 días le pedimos la foto.') + (!F.pagado ? ' (Para marcarla entregada primero tiene que estar pagada.)' : '') + '</p>';
  }
  h += campo("observaciones", "Observaciones (opcional)") + '</div>';

  h += '<div class="block"><h3>5. De dónde vino</h3><div class="filters" style="margin:0">' + CANALES.map(c => boton("canal", c, c, F.canal === c)).join("") + '</div></div>';
  h += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:16px 0 30px"><button class="btn main big" data-a="nvGuardar">Guardar venta · ' + money(tot) + '</button><button class="btn ghost" data-a="nvLimpiar">Empezar de nuevo</button></div>';
  return h;
}
function difTxt(tot, lista) {
  if (!tot || !lista || Math.round(tot) === Math.round(lista)) return "Mismo precio que en la web.";
  return tot < lista ? "Le hacés " + money(lista - tot) + " menos que en la web." : money(tot - lista) + " más que en la web.";
}
function pintarTotal() { const t = $("#nvTotal"), d = $("#nvDif"); if (t) t.textContent = money(totalF()); if (d) d.textContent = difTxt(totalF(), listaF()); const b = document.querySelector('[data-a="nvGuardar"]'); if (b) b.textContent = "Guardar venta · " + money(totalF()); }

/* ---------- código postal → localidad → sucursal (las mismas listas que usa la web) ---------- */
function norm(t) { return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim(); }
function opcLoc() {
  if (String(F.cp).length < 4) return '<option value="">Poné el código postal</option>';
  if (!OPC_LOC.length) return '<option value="">' + (LOC ? "No encontramos ese código postal" : "Buscando…") + '</option>';
  return (OPC_LOC.length > 1 ? '<option value="">Elegí la localidad</option>' : '') + OPC_LOC.map(s => { const p = s.split(" / ");
    return '<option value="' + esc(s) + '"' + (s === F.prov_loc_cp ? " selected" : "") + '>' + esc(p.slice(1, -1).join(" / ") + " (" + p[0] + ")") + '</option>'; }).join("");
}
function opcSuc() {
  if (!SUC) { cargarSuc(); return '<option value="">Cargando sucursales…</option>'; }
  let lista = SUC;
  if (F.prov_loc_cp) { const p = F.prov_loc_cp.split(" / "), prov = norm(p[0]), cp = parseInt(p[p.length - 1], 10) || 0, misma = SUC.filter(x => norm(x.prov) === prov);
    lista = (misma.length ? misma : SUC).slice().sort((a, b) => Math.abs((+a.cp || 0) - cp) - Math.abs((+b.cp || 0) - cp)); }
  return '<option value="">' + (F.prov_loc_cp ? "Elegí la sucursal (las más cercanas primero)" : "Elegí la sucursal (poné antes el código postal)") + '</option>'
    + lista.map(x => '<option value="' + esc(x.n) + '"' + (x.n === F.sucursal ? " selected" : "") + '>' + esc(x.n + " · " + x.dir + ", " + x.loc) + '</option>').join("");
}
function cargarLoc() { return LOC ? Promise.resolve(LOC) : fetch("localidades.json").then(r => r.json()).then(j => { LOC = j; return j; }); }
function cargarSuc() { if (cargarSuc.p) return; cargarSuc.p = fetch("sucursales_retiro.json").then(r => r.json()).then(j => { SUC = j; L.render(); }).catch(() => { cargarSuc.p = null; L.toast("No pudimos cargar las sucursales."); }); }
function buscarCP() {
  const cp = String(F.cp).replace(/\D/g, "");
  OPC_LOC = [];
  if (cp.length < 4) { F.prov_loc_cp = ""; const s = $("#nv-loc"); if (s) s.innerHTML = opcLoc(); return; }
  cargarLoc().then(list => {
    OPC_LOC = list.filter(s => s.slice(s.lastIndexOf(" / ") + 3) === cp);
    if (OPC_LOC.indexOf(F.prov_loc_cp) < 0) F.prov_loc_cp = OPC_LOC.length === 1 ? OPC_LOC[0] : "";
    const s = $("#nv-loc"); if (s) s.innerHTML = opcLoc();
    const su = $("#nv-suc"); if (su) su.innerHTML = opcSuc();
  }).catch(() => L.toast("No pudimos cargar las localidades."));
}

/* ---------- eventos ---------- */
L.INPUT.nvCampo = t => { F[t.dataset.k] = t.value; };
L.INPUT.nvPrecio = t => { F.precio[t.dataset.p] = t.value; F.tocado[t.dataset.p] = true; pintarTotal(); };
L.INPUT.nvCP = t => { F.cp = t.value.replace(/\D/g, "").slice(0, 4); if (t.value !== F.cp) t.value = F.cp; buscarCP(); };
L.INPUT["nvLoc:change"] = t => { F.prov_loc_cp = t.value; const su = $("#nv-suc"); if (su) su.innerHTML = opcSuc(); };
L.INPUT["nvSuc:change"] = t => { F.sucursal = t.value; };
L.CLICK.nvCant = t => { const p = t.dataset.p, v = Math.max(0, (F.cant[p] || 0) + Number(t.dataset.d)), st = stockDe(p);
  if (Number(t.dataset.d) > 0 && v > st) { L.toast(st ? "Solo tenés " + st + " en stock." : "No tenés stock de esa funda."); return; }
  F.cant[p] = v; L.render(); };
L.CLICK.nvElegir = t => {
  const g = t.dataset.g, v = t.dataset.v;
  if (g === "medio") { F.medio = v; prods().forEach(p => { if (!F.tocado[p.id]) F.precio[p.id] = precioWeb(p); }); }
  else if (g === "pagado") { F.pagado = v === "si"; if (!F.pagado) F.entregado = false; }
  else if (g === "entregado") { if (v === "si" && !F.pagado) { L.toast("Para marcarla entregada, primero tiene que estar pagada."); return; } F.entregado = v === "si"; }
  else F[g] = v;
  L.render();
};
L.CLICK.nvLimpiar = () => { nuevo(); L.render(); window.scrollTo(0, 0); };
L.CLICK.nvGuardar = t => {
  const items = prods().filter(p => F.cant[p.id] > 0).map(p => ({producto: p.id, cantidad: F.cant[p.id], precio: nm(F.precio[p.id])}));
  if (!items.length) { L.toast("Elegí qué vendiste."); return; }
  const datos = Object.assign({}, F, {items: items, entregado: F.entrega === "mano" && F.pagado && F.entregado});
  ["cant", "precio", "tocado", "cp"].forEach(k => delete datos[k]);
  L.accion("ventaManual", datos, null, t).then(r => {
    if (!r) return;
    L.toast("Venta " + r.id + " guardada" + (r.mail ? ". Le mandamos el mail a " + r.mail : ". Ojo: no se pudo mandar el mail (probá Reenviar mail en Pedidos)"), 6000);
    nuevo(); S.filtro = "todos"; L.ir("pedidos");
  });
};

L.vista("nueva", "Ventas", "Nueva venta", vNueva, null, "envios");
})();
