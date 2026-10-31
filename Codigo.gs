/**
 * LOS PERRINES · Backend (Google Apps Script)
 * Pedidos, stock, cobro con Mercado Pago, mails, panel de administración
 * y exportación de envíos al formato de carga masiva de Andreani.
 *
 * Se pega completo en el editor de Apps Script de la planilla.
 * Primera vez: ejecutar la función instalar().
 * Propiedades del script (Configuración del proyecto → Propiedades del script):
 *   ADMIN_PASSWORD   contraseña del panel
 *   MP_ACCESS_TOKEN  Access Token de producción de Mercado Pago
 */

var TZ = 'America/Argentina/Buenos_Aires';
var H = {pedidos: 'Pedidos', mov: 'Movimientos', avisos: 'Avisos', config: 'Config'};
var COLS = {
  Pedidos: ['id','fecha','estado','pago','cantidad','total','nombre','apellido','dni','email','cel_cod','cel_num',
            'entrega','calle','numero','piso','depto','prov_loc_cp','sucursal','observaciones','vence',
            'mp_preferencia','mp_pago','tracking','exportado','notas'],
  Movimientos: ['fecha','tipo','cantidad','motivo'],
  Avisos: ['fecha','email','avisado'],
  Config: ['clave','valor','descripcion']
};
var CONFIG_DEF = [
  ['tienda_abierta','NO','SI para que el público vea la tienda. NO muestra "Muy pronto".'],
  ['clave_vista','','Clave del link de vista previa (se genera sola).'],
  ['url_web','https://www.losperrines.com.ar','Dirección de la web, sin barra al final.'],
  ['producto','Funda tipo canasto','Nombre del producto en mails y Mercado Pago.'],
  ['precio_tarjeta','85000','Precio con tarjeta (1 pago o cuotas sin interés).'],
  ['precio_transferencia','72250','Precio por transferencia.'],
  ['cuotas_max','3','Máximo de cuotas que ofrece Mercado Pago.'],
  ['valor_envio','11000','Valor del envío que se muestra tachado en la web (0 = no mostrar).'],
  ['stock_minimo','8','Debajo de este número te llega un aviso de stock bajo.'],
  ['reserva_transferencia_horas','48','Horas que se reserva el stock esperando una transferencia.'],
  ['reserva_tarjeta_horas','2','Horas que se reserva el stock esperando el pago con tarjeta.'],
  ['alias','','Alias para transferencias.'],
  ['cbu','','CBU o CVU para transferencias.'],
  ['titular','','Titular de la cuenta.'],
  ['banco','','Banco o billetera.'],
  ['whatsapp','549','WhatsApp con código de país, sin espacios ni +. Ej: 5492664123456'],
  ['email_aviso','','Tu mail: te llegan los avisos de pedidos nuevos y stock bajo.'],
  ['plantilla_andreani_id','','ID de la planilla de Andreani guardada como Hoja de cálculo de Google.'],
  ['peso_gr','1000','Peso del paquete para Andreani (gramos).'],
  ['alto_cm','10','Alto del paquete (cm).'],
  ['ancho_cm','20','Ancho del paquete (cm).'],
  ['profundidad_cm','20','Profundidad del paquete (cm).'],
  ['valor_declarado','35000','Valor declarado para Andreani.']
];
var VENDIDO = ['pagado','exportado','despachado'];
var RESERVA = ['reserva','pendiente_mp'];

/* ================= INSTALACIÓN ================= */
function instalar() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(COLS).forEach(function (n) {
    var sh = ss.getSheetByName(n) || ss.insertSheet(n);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, COLS[n].length).setValues([COLS[n]]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });
  var cfg = ss.getSheetByName(H.config), have = {};
  if (cfg.getLastRow() > 1) cfg.getRange(2, 1, cfg.getLastRow() - 1, 1).getValues().forEach(function (r) { have[r[0]] = 1; });
  CONFIG_DEF.forEach(function (d) {
    if (have[d[0]]) return;
    var v = d[0] === 'clave_vista' ? Utilities.getUuid().slice(0, 8) : d[1];
    cfg.appendRow([d[0], v, d[2]]);
  });
  cfg.getRange('B:B').setNumberFormat('@');
  var hoja1 = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (hoja1 && ss.getSheets().length > 4 && hoja1.getLastRow() === 0) ss.deleteSheet(hoja1);
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'tareaHoraria') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('tareaHoraria').timeBased().everyHours(1).create();
  Logger.log('Listo. Ahora cargá ADMIN_PASSWORD y MP_ACCESS_TOKEN en Propiedades del script y publicá como app web.');
}

/* ================= ENTRADA ================= */
function doGet(e) {
  if (e && e.parameter && (e.parameter.mp || e.parameter['data.id'] || e.parameter.topic)) return webhookMP(e);
  return out({ok: true, servicio: 'Los Perrines'});
}
function doPost(e) {
  try {
    if (e && e.parameter && e.parameter.mp) return webhookMP(e);
    var req = JSON.parse(e.postData.contents || '{}');
    var res = rutear(req);
    res.ok = true;
    return out(res);
  } catch (err) {
    return out({ok: false, error: String(err && err.message || err)});
  }
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function rutear(r) {
  switch (r.accion) {
    case 'config': return publicoConfig(r);
    case 'pedido': return conLock(function () { return crearPedido(r); });
    case 'reintentar': return conLock(function () { return reintentar(r); });
    case 'estado': return estadoPedido(r);
    case 'aviso': return guardarAviso(r);
    case 'arrepentimiento': return arrepentimiento(r);
    case 'login': return login(r);
  }
  auth(r);
  switch (r.accion) {
    case 'resumen': return resumen();
    case 'pagado': return conLock(function () { return marcarPagado(r.id); });
    case 'despachar': return despachar(r.id, r.tracking);
    case 'cancelar': return cambiarEstado(r.id, 'cancelado');
    case 'reenviar': return reenviar(r.id);
    case 'movimiento': return movimiento(r);
    case 'avisar': return avisarStock();
    case 'guardarConfig': return guardarConfig(r.valores || {});
    case 'exportar': return conLock(exportarAndreani);
    case 'nota': return guardarNota(r.id, r.nota);
    case 'costos': return {costos: leerCostos()};
    case 'guardarCostos': return guardarCostos(r.data);
  }
  throw new Error('Acción desconocida');
}
function conLock(fn) {
  var l = LockService.getScriptLock();
  l.waitLock(20000);
  try { return fn(); } finally { l.releaseLock(); }
}

/* ================= DATOS ================= */
function hoja(n) { return SpreadsheetApp.getActive().getSheetByName(n); }
function filas(n) {
  var sh = hoja(n), last = sh.getLastRow();
  if (last < 2) return [];
  var cols = COLS[n], vals = sh.getRange(2, 1, last - 1, cols.length).getValues();
  return vals.map(function (v, i) { var o = {_fila: i + 2}; cols.forEach(function (c, j) { o[c] = v[j]; }); return o; });
}
function setear(n, fila, obj) {
  var sh = hoja(n), cols = COLS[n];
  Object.keys(obj).forEach(function (k) { var j = cols.indexOf(k); if (j >= 0) sh.getRange(fila, j + 1).setValue(obj[k]); });
}
function agregar(n, obj) { hoja(n).appendRow(COLS[n].map(function (c) { return obj[c] === undefined ? '' : obj[c]; })); }
function cfg() {
  var o = {};
  filas(H.config).forEach(function (r) { o[r.clave] = String(r.valor); });
  return o;
}
function num(v) { var x = Number(String(v).replace(/[^\d.\-]/g, '')); return isFinite(x) ? x : 0; }
function pedido(id) { var p = filas(H.pedidos).filter(function (x) { return x.id === id; })[0]; if (!p) throw new Error('No existe el pedido ' + id); return p; }
function ahora() { return new Date(); }
function fmtFecha(d) { return d ? Utilities.formatDate(new Date(d), TZ, 'dd/MM/yyyy HH:mm') : ''; }
function plata(v) { return '$' + Math.round(num(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

function stock() {
  var ing = 0, aj = 0, vend = 0, res = 0, t = ahora();
  filas(H.mov).forEach(function (m) { var c = num(m.cantidad); if (m.tipo === 'ingreso') ing += c; else aj += c; });
  filas(H.pedidos).forEach(function (p) {
    var c = num(p.cantidad);
    if (VENDIDO.indexOf(p.estado) >= 0) vend += c;
    else if (RESERVA.indexOf(p.estado) >= 0 && new Date(p.vence) > t) res += c;
  });
  return {ingresado: ing, ajustes: aj, vendidas: vend, reservadas: res, disponible: ing + aj - vend - res};
}

/* ================= PÚBLICO ================= */
function publicoConfig(r) {
  var c = cfg(), s = stock();
  var vista = r.vista && c.clave_vista && String(r.vista) === c.clave_vista;
  return {
    abierta: c.tienda_abierta === 'SI' || !!vista, vista: !!vista,
    precio_tarjeta: num(c.precio_tarjeta), precio_transferencia: num(c.precio_transferencia),
    cuotas: num(c.cuotas_max), whatsapp: c.whatsapp, producto: c.producto, valor_envio: num(c.valor_envio),
    disponible: Math.max(0, s.disponible)
  };
}

function limpiar(v, max) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 120); }
function validar(r) {
  var d = {
    nombre: limpiar(r.nombre, 60), apellido: limpiar(r.apellido, 60), dni: limpiar(r.dni, 12).replace(/\D/g, ''),
    email: limpiar(r.email, 100).toLowerCase(), cel_cod: limpiar(r.cel_cod, 5).replace(/\D/g, ''),
    cel_num: limpiar(r.cel_num, 10).replace(/\D/g, ''), entrega: r.entrega === 'sucursal' ? 'sucursal' : 'domicilio',
    calle: limpiar(r.calle, 80), numero: limpiar(r.numero, 10), piso: limpiar(r.piso, 5), depto: limpiar(r.depto, 5),
    prov_loc_cp: limpiar(r.prov_loc_cp, 120), sucursal: limpiar(r.sucursal, 80), observaciones: limpiar(r.observaciones, 200),
    pago: r.pago === 'tarjeta' ? 'tarjeta' : 'transferencia', cantidad: Math.max(1, Math.min(5, Math.floor(num(r.cantidad) || 1)))
  };
  var falta = [];
  ['nombre','apellido','dni','email','cel_cod','cel_num'].forEach(function (k) { if (!d[k]) falta.push(k); });
  if (d.entrega === 'domicilio') ['calle','numero','prov_loc_cp'].forEach(function (k) { if (!d[k]) falta.push(k); });
  else { if (!d.sucursal) falta.push('sucursal'); ['calle','numero','piso','depto','prov_loc_cp','observaciones'].forEach(function (k) { d[k] = ''; }); }
  if (falta.length) throw new Error('Faltan datos: ' + falta.join(', '));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) throw new Error('El email no es válido.');
  if (d.dni.length < 7) throw new Error('Revisá el DNI.');
  return d;
}

function crearPedido(r) {
  var c = cfg();
  if (c.tienda_abierta !== 'SI' && !(r.vista && r.vista === c.clave_vista)) throw new Error('La tienda todavía no está abierta.');
  var d = validar(r), s = stock();
  if (s.disponible < d.cantidad) throw new Error(s.disponible > 0 ? 'Solo quedan ' + s.disponible + ' unidades.' : 'Nos quedamos sin stock. Dejanos tu mail y te avisamos.');
  var id = 'LP-' + Utilities.formatDate(ahora(), TZ, 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 4).toUpperCase();
  var precio = d.pago === 'tarjeta' ? num(c.precio_tarjeta) : num(c.precio_transferencia);
  var horas = num(d.pago === 'tarjeta' ? c.reserva_tarjeta_horas : c.reserva_transferencia_horas) || 48;
  var vence = new Date(ahora().getTime() + horas * 3600000);
  var p = Object.assign({}, d, {id: id, fecha: ahora(), estado: d.pago === 'tarjeta' ? 'pendiente_mp' : 'reserva', total: precio * d.cantidad, vence: vence});
  agregar(H.pedidos, p);
  if (d.pago === 'tarjeta') {
    try {
      var pref = crearPreferencia(p, c, r.vista);
      var fila = pedido(id)._fila;
      setear(H.pedidos, fila, {mp_preferencia: pref.id});
      return {id: id, pago: 'tarjeta', init_point: pref.init_point};
    } catch (err) {
      setear(H.pedidos, pedido(id)._fila, {estado: 'cancelado', notas: 'Error MP: ' + err.message});
      throw new Error('No pudimos conectar con Mercado Pago. Probá de nuevo o elegí transferencia.');
    }
  }
  mailCompraTransferencia(p, c);
  avisoDueño('Nuevo pedido por transferencia ' + id, p, c);
  return {id: id, pago: 'transferencia', total: p.total, vence: fmtFecha(vence), transferencia: datosTransferencia(c)};
}
function datosTransferencia(c) { return {alias: c.alias, cbu: c.cbu, titular: c.titular, banco: c.banco}; }

function reintentar(r) {
  var p = pedido(limpiar(r.id, 30)), c = cfg();
  if (String(p.email).toLowerCase() !== limpiar(r.email, 100).toLowerCase()) throw new Error('El email no coincide con el pedido.');
  if (p.pago !== 'tarjeta' || ['pendiente_mp','vencido'].indexOf(p.estado) < 0) throw new Error('Este pedido no se puede volver a pagar.');
  if (p.estado === 'vencido' && stock().disponible < num(p.cantidad)) throw new Error('Nos quedamos sin stock.');
  var horas = num(c.reserva_tarjeta_horas) || 2;
  p.vence = new Date(ahora().getTime() + horas * 3600000);
  var pref = crearPreferencia(p, c, r.vista);
  setear(H.pedidos, p._fila, {estado: 'pendiente_mp', vence: p.vence, mp_preferencia: pref.id});
  return {init_point: pref.init_point};
}

function estadoPedido(r) {
  var p = pedido(limpiar(r.id, 30)), c = cfg();
  var ok = r.email && String(p.email).toLowerCase() === limpiar(r.email, 100).toLowerCase();
  if (r.payment_id) {
    var pago = consultarPago(r.payment_id);
    if (pago && pago.external_reference === p.id) { ok = true; procesarPago(pago); p = pedido(p.id); }
  }
  if (!ok) throw new Error('No encontramos un pedido con esos datos.');
  var o = {id: p.id, estado: p.estado, pago: p.pago, total: num(p.total), tracking: String(p.tracking || ''),
           nombre: p.nombre, vence: fmtFecha(p.vence)};
  if (p.estado === 'reserva') o.transferencia = datosTransferencia(c);
  return o;
}

function guardarAviso(r) {
  var e = limpiar(r.email, 100).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('El email no es válido.');
  var ya = filas(H.avisos).some(function (a) { return a.email === e && a.avisado !== 'SI'; });
  if (!ya) agregar(H.avisos, {fecha: ahora(), email: e, avisado: 'NO'});
  return {};
}

function arrepentimiento(r) {
  var c = cfg(), id = limpiar(r.id, 30), email = limpiar(r.email, 100).toLowerCase();
  var p = filas(H.pedidos).filter(function (x) { return x.id === id && String(x.email).toLowerCase() === email; })[0];
  if (!p) throw new Error('No encontramos un pedido con ese número y email.');
  var codigo = 'ARR-' + Utilities.getUuid().slice(0, 6).toUpperCase();
  setear(H.pedidos, p._fila, {notas: (p.notas ? p.notas + ' | ' : '') + 'Arrepentimiento ' + codigo + ' ' + fmtFecha(ahora())});
  enviar(email, 'Recibimos tu solicitud de arrepentimiento', plantilla('Recibimos tu solicitud',
    '<p>Hola ' + esc(p.nombre) + ', registramos tu pedido de arrepentimiento para la compra <b>' + p.id + '</b>.</p>' +
    '<p>Código de la solicitud: <b>' + codigo + '</b>. Te vamos a contactar para coordinar la devolución sin costo.</p>', c), c);
  if (c.email_aviso) enviar(c.email_aviso, 'Arrepentimiento ' + p.id + ' (' + codigo + ')', plantilla('Solicitud de arrepentimiento',
    '<p>Pedido <b>' + p.id + '</b> de ' + esc(p.nombre + ' ' + p.apellido) + ' (' + esc(email) + ').</p>', c), c);
  return {codigo: codigo};
}

/* ================= MERCADO PAGO ================= */
function tokenMP() {
  var t = PropertiesService.getScriptProperties().getProperty('MP_ACCESS_TOKEN');
  if (!t) throw new Error('Falta MP_ACCESS_TOKEN en Propiedades del script.');
  return t;
}
function crearPreferencia(p, c, vista) {
  var base = (c.url_web || '').replace(/\/$/, '');
  var vuelta = base + '/?pedido=' + encodeURIComponent(p.id) + (vista ? '&vista=' + encodeURIComponent(vista) : '');
  var body = {
    items: [{id: 'funda-canasto', title: c.producto || 'Funda tipo canasto', quantity: num(p.cantidad), unit_price: num(c.precio_tarjeta), currency_id: 'ARS'}],
    payer: {name: p.nombre, surname: p.apellido, email: p.email},
    external_reference: p.id,
    back_urls: {success: vuelta, pending: vuelta, failure: vuelta},
    auto_return: 'approved',
    notification_url: ScriptApp.getService().getUrl() + '?mp=1',
    statement_descriptor: 'LOSPERRINES',
    payment_methods: {installments: num(c.cuotas_max) || 1, excluded_payment_types: [{id: 'ticket'}, {id: 'atm'}]},
    expires: true,
    expiration_date_to: Utilities.formatDate(new Date(p.vence), TZ, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
  };
  var res = UrlFetchApp.fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: {Authorization: 'Bearer ' + tokenMP()}, payload: JSON.stringify(body)
  });
  var j = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() >= 300 || !j.init_point) throw new Error(j.message || ('HTTP ' + res.getResponseCode()));
  return j;
}
function consultarPago(id) {
  id = String(id).replace(/\D/g, '');
  if (!id) return null;
  var res = UrlFetchApp.fetch('https://api.mercadopago.com/v1/payments/' + id, {
    headers: {Authorization: 'Bearer ' + tokenMP()}, muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return null;
  return JSON.parse(res.getContentText());
}
function webhookMP(e) {
  try {
    var body = {};
    try { body = JSON.parse((e.postData && e.postData.contents) || '{}'); } catch (x) {}
    var tipo = body.type || e.parameter.type || e.parameter.topic;
    var id = (body.data && body.data.id) || e.parameter['data.id'] || (tipo === 'payment' ? e.parameter.id : '');
    if (tipo === 'payment' && id) {
      var pago = consultarPago(id);
      if (pago) conLock(function () { procesarPago(pago); });
    }
  } catch (err) { console.error(err); }
  return out({ok: true});
}
function procesarPago(pago) {
  if (!pago || !pago.external_reference) return;
  var p = filas(H.pedidos).filter(function (x) { return x.id === pago.external_reference; })[0];
  if (!p) return;
  if (pago.status === 'approved' && ['pendiente_mp','vencido','cancelado'].indexOf(p.estado) >= 0) {
    var c = cfg();
    setear(H.pedidos, p._fila, {estado: 'pagado', mp_pago: String(pago.id), total: num(pago.transaction_amount) || p.total});
    p.estado = 'pagado'; p.total = num(pago.transaction_amount) || p.total;
    mailPagoTarjeta(p, c);
    avisoDueño('Pago con tarjeta aprobado ' + p.id, p, c);
  } else if (!p.mp_pago) {
    setear(H.pedidos, p._fila, {mp_pago: String(pago.id) + ' (' + pago.status + ')'});
  }
}

/* ================= PANEL ================= */
function login(r) {
  var pass = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!pass) throw new Error('Falta ADMIN_PASSWORD en Propiedades del script.');
  Utilities.sleep(400);
  if (String(r.password || '') !== pass) throw new Error('Contraseña incorrecta.');
  var t = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('adm_' + t, '1', 21600);
  return {token: t};
}
function auth(r) {
  if (!r.token || !CacheService.getScriptCache().get('adm_' + r.token)) throw new Error('SESION');
}
function resumen() {
  vencerReservas();
  var c = cfg(), s = stock(), mes = Utilities.formatDate(ahora(), TZ, 'yyyyMM');
  var ped = filas(H.pedidos).map(function (p) {
    var o = {}; COLS.Pedidos.forEach(function (k) { o[k] = (p[k] instanceof Date) ? fmtFecha(p[k]) : p[k]; });
    o._ts = new Date(p.fecha).getTime(); o._vence_ts = p.vence ? new Date(p.vence).getTime() : 0; return o;
  }).sort(function (a, b) { return b._ts - a._ts; });
  var v = {unidades: 0, total: 0, transferencia: 0, tarjeta: 0};
  filas(H.pedidos).forEach(function (p) {
    if (VENDIDO.indexOf(p.estado) < 0 || Utilities.formatDate(new Date(p.fecha), TZ, 'yyyyMM') !== mes) return;
    v.unidades += num(p.cantidad); v.total += num(p.total); v[p.pago] += num(p.total);
  });
  return {
    stock: s, ventasMes: v, pedidos: ped, config: c,
    movimientos: filas(H.mov).map(function (m) { return {fecha: fmtFecha(m.fecha), tipo: m.tipo, cantidad: num(m.cantidad), motivo: m.motivo}; }).reverse(),
    avisos: filas(H.avisos).filter(function (a) { return a.avisado !== 'SI'; }).map(function (a) { return a.email; }),
    urlVista: (c.url_web || '').replace(/\/$/, '') + '/?vista=' + c.clave_vista,
    tokenMP: !!PropertiesService.getScriptProperties().getProperty('MP_ACCESS_TOKEN')
  };
}
function marcarPagado(id) {
  var p = pedido(id), c = cfg();
  if (['reserva','vencido','pendiente_mp'].indexOf(p.estado) < 0) throw new Error('El pedido ya no está pendiente de pago.');
  if (p.estado === 'vencido' && stock().disponible < num(p.cantidad)) throw new Error('No hay stock para este pedido vencido.');
  setear(H.pedidos, p._fila, {estado: 'pagado'});
  p.estado = 'pagado';
  if (p.pago === 'transferencia') mailPagoTransferencia(p, c); else mailPagoTarjeta(p, c);
  return {};
}
function despachar(id, tracking) {
  var p = pedido(id), c = cfg(), t = String(tracking || '').replace(/\s/g, '');
  if (!/^\d{6,}$/.test(t)) throw new Error('El número de seguimiento tiene que ser solo números.');
  if (VENDIDO.indexOf(p.estado) < 0) throw new Error('Solo se despachan pedidos pagados.');
  setear(H.pedidos, p._fila, {estado: 'despachado', tracking: t});
  p.tracking = t;
  mailDespacho(p, c);
  return {};
}
function cambiarEstado(id, estado) { setear(H.pedidos, pedido(id)._fila, {estado: estado}); return {}; }
function guardarNota(id, nota) { setear(H.pedidos, pedido(id)._fila, {notas: limpiar(nota, 300)}); return {}; }
function reenviar(id) {
  var p = pedido(id), c = cfg();
  if (p.estado === 'despachado') mailDespacho(p, c);
  else if (VENDIDO.indexOf(p.estado) >= 0) { if (p.pago === 'transferencia') mailPagoTransferencia(p, c); else mailPagoTarjeta(p, c); }
  else if (p.estado === 'reserva') mailCompraTransferencia(p, c);
  else throw new Error('No hay mail para reenviar en este estado.');
  return {};
}
function movimiento(r) {
  var cant = Math.floor(num(r.cantidad));
  if (!cant) throw new Error('Cantidad inválida.');
  var motivo = limpiar(r.motivo, 120);
  if (!motivo) throw new Error('Escribí el motivo.');
  var tipo = r.tipo === 'ingreso' ? 'ingreso' : 'ajuste';
  if (tipo === 'ingreso' && cant < 0) throw new Error('Un ingreso no puede ser negativo.');
  agregar(H.mov, {fecha: ahora(), tipo: tipo, cantidad: cant, motivo: motivo});
  return {};
}
function avisarStock() {
  var c = cfg(), s = stock();
  if (s.disponible <= 0) throw new Error('Todavía no hay stock disponible.');
  var n = 0;
  filas(H.avisos).forEach(function (a) {
    if (a.avisado === 'SI') return;
    enviar(a.email, '¡Volvió la ' + c.producto + '!', plantilla('Ya hay stock',
      '<p>Nos pediste que te avisemos: la <b>' + esc(c.producto) + '</b> ya está disponible de nuevo.</p>' +
      boton(c.url_web, 'Comprar ahora'), c), c);
    setear(H.avisos, a._fila, {avisado: 'SI'}); n++;
  });
  return {avisados: n};
}
function guardarConfig(vals) {
  var sh = hoja(H.config);
  filas(H.config).forEach(function (r) {
    if (Object.prototype.hasOwnProperty.call(vals, r.clave)) sh.getRange(r._fila, 2).setValue(String(vals[r.clave]).trim());
  });
  return {};
}

/* ================= ANDREANI ================= */
function exportarAndreani() {
  var c = cfg();
  if (!c.plantilla_andreani_id) throw new Error('Falta cargar plantilla_andreani_id en Configuración.');
  var pend = filas(H.pedidos).filter(function (p) { return p.estado === 'pagado'; });
  if (!pend.length) throw new Error('No hay pedidos pagados para exportar.');
  var nombre = 'Andreani ' + Utilities.formatDate(ahora(), TZ, 'yyyy-MM-dd HHmm');
  var copia = DriveApp.getFileById(c.plantilla_andreani_id).makeCopy(nombre + ' (temp)');
  var ss = SpreadsheetApp.openById(copia.getId());
  var dom = ss.getSheetByName('A domicilio'), suc = ss.getSheetByName('A sucursal');
  if (!dom || !suc) { copia.setTrashed(true); throw new Error('La plantilla no tiene las hojas "A domicilio" y "A sucursal".'); }
  var paq = ['', num(c.peso_gr), num(c.alto_cm), num(c.ancho_cm), num(c.profundidad_cm), num(c.valor_declarado)];
  var fd = [], fs = [];
  pend.forEach(function (p) {
    var dest = [p.id, p.nombre, p.apellido, String(p.dni), p.email, String(p.cel_cod), String(p.cel_num)];
    if (p.entrega === 'sucursal') fs.push(paq.concat(dest, [p.sucursal]));
    else fd.push(paq.concat(dest, [p.calle, String(p.numero), String(p.piso || ''), String(p.depto || ''), p.prov_loc_cp, p.observaciones || '']));
  });
  [[dom, fd], [suc, fs]].forEach(function (x) {
    var sh = x[0], rows = x[1];
    if (!rows.length) return;
    sh.getRange(3, 7, rows.length, rows[0].length - 6).setNumberFormat('@');
    sh.getRange(3, 1, rows.length, rows[0].length).setValues(rows);
  });
  SpreadsheetApp.flush();
  var url = 'https://docs.google.com/spreadsheets/d/' + copia.getId() + '/export?format=xlsx';
  var blob = UrlFetchApp.fetch(url, {headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()}}).getBlob().setName(nombre + '.xlsx');
  var carpeta = carpetaEnvios();
  var archivo = carpeta.createFile(blob);
  copia.setTrashed(true);
  var cuando = fmtFecha(ahora());
  pend.forEach(function (p) { setear(H.pedidos, p._fila, {estado: 'exportado', exportado: cuando}); });
  return {url: 'https://drive.google.com/uc?export=download&id=' + archivo.getId(), ver: archivo.getUrl(), cantidad: pend.length, domicilio: fd.length, sucursal: fs.length};
}
function carpetaEnvios() {
  var it = DriveApp.getFoldersByName('Los Perrines - Envíos Andreani');
  return it.hasNext() ? it.next() : DriveApp.createFolder('Los Perrines - Envíos Andreani');
}

/* ================= TAREAS ================= */
function vencerReservas() {
  var t = ahora();
  filas(H.pedidos).forEach(function (p) {
    if (RESERVA.indexOf(p.estado) >= 0 && p.vence && new Date(p.vence) < t) setear(H.pedidos, p._fila, {estado: 'vencido'});
  });
}
function tareaHoraria() {
  vencerReservas();
  var c = cfg(), s = stock(), props = PropertiesService.getScriptProperties();
  var hoy = Utilities.formatDate(ahora(), TZ, 'yyyyMMdd');
  if (c.email_aviso && s.ingresado > 0 && s.disponible <= num(c.stock_minimo) && props.getProperty('aviso_stock') !== hoy) {
    enviar(c.email_aviso, 'Stock bajo: quedan ' + s.disponible + ' unidades', plantilla('Stock bajo',
      '<p>Quedan <b>' + s.disponible + '</b> unidades disponibles (' + s.reservadas + ' reservadas). Es momento de encargar el próximo lote.</p>', c), c);
    props.setProperty('aviso_stock', hoy);
  }
}

/* ================= MAILS ================= */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (x) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[x]; }); }
function boton(url, txt) { return '<p style="margin:24px 0"><a href="' + url + '" style="background:#4E5B3A;color:#F2F3EC;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:10px;display:inline-block">' + txt + '</a></p>'; }
function plantilla(titulo, cuerpo, c) {
  var wa = c.whatsapp && c.whatsapp.length > 6 ? '<a href="https://wa.me/' + c.whatsapp + '" style="color:#4E5B3A">WhatsApp</a>' : '';
  return '<div style="background:#F2F3EC;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#1E2418">' +
    '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden">' +
    '<div style="background:#4E5B3A;color:#F2F3EC;padding:18px 24px;font-size:20px;font-weight:bold">🐾 Los Perrines</div>' +
    '<div style="padding:24px;font-size:15px;line-height:1.55"><h1 style="font-size:22px;margin:0 0 14px">' + titulo + '</h1>' + cuerpo + '</div>' +
    '<div style="padding:16px 24px;border-top:1px solid #D9DCCF;font-size:13px;color:#5E6656">¿Dudas? Escribinos por ' + (wa || 'mail respondiendo este correo') +
    '.<br>Hecho en San Luis para toda Argentina · <a href="' + c.url_web + '" style="color:#4E5B3A">losperrines.com.ar</a></div></div></div>';
}
function detalle(p, c) {
  var dest = p.entrega === 'sucursal' ? 'Retiro en sucursal Andreani <b>' + esc(p.sucursal) + '</b>'
    : esc(p.calle + ' ' + p.numero + (p.piso ? ', piso ' + p.piso : '') + (p.depto ? ' depto ' + p.depto : '')) + '<br>' + esc(p.prov_loc_cp);
  return '<table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">' +
    '<tr><td style="padding:6px 0;color:#5E6656">Pedido</td><td style="text-align:right"><b>' + p.id + '</b></td></tr>' +
    '<tr><td style="padding:6px 0;color:#5E6656">Producto</td><td style="text-align:right">' + esc(c.producto) + ' × ' + p.cantidad + '</td></tr>' +
    '<tr><td style="padding:6px 0;color:#5E6656">Total</td><td style="text-align:right"><b>' + plata(p.total) + '</b> (' + (p.pago === 'tarjeta' ? 'tarjeta' : 'transferencia') + ')</td></tr>' +
    '<tr><td style="padding:6px 0;color:#5E6656">Envío</td><td style="text-align:right">Gratis</td></tr></table>' +
    '<p style="margin:8px 0 0;color:#5E6656;font-size:14px">Envío a:<br><span style="color:#1E2418">' + dest + '</span></p>';
}
function mailCompraTransferencia(p, c) {
  var t = '<div style="background:#F7F8F3;border:1px dashed #D9DCCF;border-radius:12px;padding:14px;margin:14px 0">' +
    (c.alias ? 'Alias: <b>' + esc(c.alias) + '</b><br>' : '') + (c.cbu ? 'CBU/CVU: <b>' + esc(c.cbu) + '</b><br>' : '') +
    (c.titular ? 'Titular: ' + esc(c.titular) + '<br>' : '') + (c.banco ? 'Banco: ' + esc(c.banco) + '<br>' : '') +
    'Importe: <b>' + plata(p.total) + '</b></div>';
  enviar(p.email, '¡Gracias por tu compra! Pedido ' + p.id, plantilla('¡Gracias, ' + esc(p.nombre) + '!',
    '<p>Reservamos tu ' + esc(c.producto) + '. Para confirmarlo, transferí el importe antes del <b>' + fmtFecha(p.vence) + '</b>:</p>' + t +
    '<p>Mandanos el comprobante por WhatsApp indicando el número de pedido. Apenas lo recibamos, preparamos el envío.</p>' + detalle(p, c), c), c);
}
function mailPagoTransferencia(p, c) {
  enviar(p.email, 'Recibimos tu pago · Pedido ' + p.id, plantilla('¡Pago recibido!',
    '<p>Hola ' + esc(p.nombre) + ', confirmamos tu transferencia. Ya estamos preparando tu pedido y te avisamos cuando salga, con el número de seguimiento.</p>' + detalle(p, c), c), c);
}
function mailPagoTarjeta(p, c) {
  enviar(p.email, '¡Gracias por tu compra! Pedido ' + p.id, plantilla('¡Gracias, ' + esc(p.nombre) + '!',
    '<p>Tu pago con Mercado Pago fue aprobado. Ya estamos preparando tu pedido y te avisamos cuando salga, con el número de seguimiento.</p>' + detalle(p, c), c), c);
}
function mailDespacho(p, c) {
  var link = 'https://www.andreani.com/envio/' + p.tracking;
  enviar(p.email, 'Tu ' + c.producto + ' ya está en camino 🐾', plantilla('¡Tu pedido ya salió!',
    '<p>Hola ' + esc(p.nombre) + ', tu pedido <b>' + p.id + '</b> ya salió de San Luis.</p>' + boton(link, 'Seguí tu envío') +
    '<p style="color:#5E6656;font-size:14px">Número de seguimiento: <b>' + p.tracking + '</b></p>' + detalle(p, c), c), c);
}
function avisoDueño(asunto, p, c) {
  if (!c.email_aviso) return;
  enviar(c.email_aviso, asunto, plantilla(asunto, '<p>' + esc(p.nombre + ' ' + p.apellido) + ' · ' + esc(p.email) + ' · ' + esc(p.cel_cod + ' ' + p.cel_num) + '</p>' + detalle(p, c), c), c);
}
function enviar(to, asunto, html, c) {
  MailApp.sendEmail({to: to, subject: asunto, htmlBody: html, name: 'Los Perrines', replyTo: c.email_aviso || undefined});
}

/* ================= PRUEBA ================= */
function probarMail() {
  var c = cfg();
  if (!c.email_aviso) throw new Error('Cargá email_aviso en la hoja Config.');
  enviar(c.email_aviso, 'Prueba de mail de Los Perrines', plantilla('Funciona 🎉', '<p>Si ves este mail, los envíos funcionan.</p>', c), c);
}

/* ================= COSTOS ================= */
function leerCostos() {
  var sh = SpreadsheetApp.getActive().getSheetByName('Costos');
  if (!sh) return null;
  var v = sh.getRange(1, 1).getValue();
  return v ? JSON.parse(v) : null;
}
function guardarCostos(d) {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName('Costos') || ss.insertSheet('Costos');
  var s = JSON.stringify(d || {});
  if (s.length > 45000) throw new Error('Demasiados datos de costos.');
  sh.getRange(1, 1).setValue(s);
  return {};
}
