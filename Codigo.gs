/**
 * LOS PERRINES · Backend (Google Apps Script) · versión 5 (oficina: pantalla Hoy, resumen diario y confirmación de entrega)
 * Pedidos, stock, cobro con Mercado Pago, mails, panel de administración,
 * exportación de envíos a Andreani y el taller: insumos, recetas, tandas de
 * producción, compras y pagos a proveedores.
 *
 * Se pega completo en el editor de Apps Script de la planilla.
 * Primera vez: ejecutar la función instalar().
 * Propiedades del script (Configuración del proyecto → Propiedades del script):
 *   ADMIN_PASSWORD   contraseña del panel
 *   MP_ACCESS_TOKEN  Access Token de producción de Mercado Pago
 */

var TZ = 'America/Argentina/Buenos_Aires';
var H = {pedidos: 'Pedidos', mov: 'Movimientos', avisos: 'Avisos', config: 'Config', media: 'Media', carritos: 'Carritos', cupones: 'Cupones', bajas: 'Bajas'};
var COLS = {
  Pedidos: ['id','fecha','estado','pago','cantidad','total','nombre','apellido','dni','email','cel_cod','cel_num',
            'entrega','calle','numero','piso','depto','prov_loc_cp','sucursal','observaciones','vence',
            'mp_preferencia','mp_pago','tracking','exportado','notas','items','cupon','descuento','recordatorio',
            'pagado_el','preparado','despachado_el','entregado_el','consulta_el','problema_el'],
  Movimientos: ['fecha','tipo','cantidad','motivo','producto'],
  Avisos: ['fecha','email','avisado'],
  Media: ['id','fecha','destino','tipo','nombre','orden','principal','drive_id'],
  Carritos: ['email','fecha','actualizado','nombre','apellido','cel','items','estado','pedido','origen','recordatorio','segundo'],
  Cupones: ['codigo','porcentaje','vence','unico','activo','creado'],
  Bajas: ['fecha','email'],
  Config: ['clave','valor','descripcion'],
  TallerProveedores: ['id','nombre','telefono','lugar','web','notas','activo'],
  TallerInsumos: ['id','nombre','descripcion','proveedor','envase','contenido','unidad','precio','minimo','activo','actualizado'],
  TallerFichas: ['producto','medidas','receta','confeccion','envio','otros','notas','actualizado','bolsa'],
  TallerGastos: ['id','concepto','total','activo'],
  TallerTandas: ['id','fecha','estado','items','recibido','proveedor','notas','actualizado'],
  TallerStock: ['fecha','insumo','cantidad','tipo','ref','detalle'],
  TallerCompras: ['id','fecha','tipo','proveedor','detalle','items','total','ref','notas'],
  TallerPagos: ['id','fecha','proveedor','monto','medio','nota','compra']
};
var CONFIG_DEF = [
  ['tienda_abierta','NO','SI para que el público vea la tienda. NO muestra "Muy pronto".'],
  ['clave_vista','','Clave del link de vista previa (se genera sola).'],
  ['url_web','https://www.losperrines.com.ar','Dirección de la web, sin barra al final.'],
  ['producto','Funda tipo canasto','Nombre del producto principal (doble).'],
  ['sub1','Asiento trasero completo','Descripción corta del producto 1.'],
  ['medidas1','130 × 130 cm: respaldo delantero 38, asiento 40 y respaldo trasero 52\nLaterales de 40 × 36 cm en las dos puertas, con cierres\n4 correas regulables a los apoyacabezas\nAbertura para el cinturón de seguridad','Medidas y detalles del producto 1 (un renglón por línea).'],
  ['producto2','Funda tipo canasto individual','Nombre del segundo producto (individual).'],
  ['sub2','Una plaza, lado izquierdo o derecho','Descripción corta del producto 2.'],
  ['medidas2','60 × 130 cm: misma base que la doble\nLaterales de 40 × 36 cm en los dos lados, con cierres\nSe usa del lado izquierdo o del derecho\nIdeal si viajás con alguien atrás','Medidas y detalles del producto 2 (un renglón por línea).'],
  ['precio2_tarjeta','60000','Precio con tarjeta del individual.'],
  ['precio2_transferencia','54000','Precio por transferencia del individual.'],
  ['activo2','SI','SI para vender el individual en la web.'],
  ['precio_tarjeta','90000','Precio con tarjeta (1 pago o hasta 3 cuotas sin interés).'],
  ['precio_transferencia','81000','Precio por transferencia.'],
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
  ['valor_declarado','35000','Valor declarado para Andreani.'],
  ['rollo_ancho','150','Taller: ancho del rollo de tela (cm).'],
  ['rollo_largo','60','Taller: metros de un rollo, para repartir los gastos compartidos.'],
  ['margen_costura','1','Taller: margen de costura (cm).'],
  ['comision_mp','20','Rentabilidad: % que te descuenta Mercado Pago en las ventas con tarjeta.'],
  ['rentabilidad_objetivo','60','Rentabilidad mínima que buscás, sobre el costo (%).'],
  ['mix_tarjeta','50','% estimado de ventas con tarjeta (se usa hasta tener ventas reales).'],
  ['taller_migrado','','Fecha en que se importaron los datos de las herramientas viejas.'],
  ['resumen_hora','20','Hora del resumen diario por mail (0 a 23). Vacío = no mandarlo.'],
  ['alerta_despacho_dias','2','Días desde el pago para avisar que un pedido se está atrasando.'],
  ['consulta_entrega_dias','5','Días después del despacho para preguntarle al cliente si le llegó (vacío = no preguntar).'],
  ['instagram','losperrines_','Tu usuario de Instagram, sin @ (se lo mostramos al cliente cuando recibe).']
];
var VENDIDO = ['pagado','exportado','despachado','entregado'];
var RESERVA = ['reserva','pendiente_mp'];

/* ================= INSTALACIÓN ================= */
function instalar() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(COLS).forEach(function (n) {
    var sh = ss.getSheetByName(n) || ss.insertSheet(n);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, COLS[n].length).setValues([COLS[n]]).setFontWeight('bold');
      sh.setFrozenRows(1);
    } else {
      sh.getRange(1, 1, 1, COLS[n].length).setValues([COLS[n]]).setFontWeight('bold');
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
  if (e && e.parameter && e.parameter.baja) return darDeBaja(e.parameter.baja, e.parameter.t);
  if (e && e.parameter && e.parameter.entrega) return respuestaEntrega(e.parameter);
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
    case 'carrito': return conLock(function () { return guardarCarrito(r); });
    case 'cupon': return validarCupon(r.codigo, r.email);
  }
  auth(r);
  switch (r.accion) {
    case 'resumen': return resumen();
    case 'pagado': return conLock(function () { return marcarPagado(r.id); });
    case 'despachar': return despachar(r.id, r.tracking);
    case 'cancelar': var pc = cambiarEstado(r.id, 'cancelado'); marcarCarritoPorPedido(r.id, 'vencido'); return pc;
    case 'reenviar': return reenviar(r.id);
    case 'movimiento': return movimiento(r);
    case 'avisar': return avisarStock();
    case 'guardarConfig': return guardarConfig(r.valores || {});
    case 'exportar': return conLock(function () { return exportarAndreani(r.ids); });
    case 'pagadoLote': return conLock(function () { return enLote(r.ids, function (id) { marcarPagado(String(id)); }); });
    case 'despacharLote': return conLock(function () { return enLote(r.items, function (x) { despachar(String(x.id), x.tracking); }); });
    case 'preparado': return conLock(function () { return enLote(r.ids, function (id) { marcarPreparado(String(id), r.valor !== false); }); });
    case 'entregado': return conLock(function () { return enLote(r.ids, function (id) { marcarEntregado(String(id), r.valor !== false); }); });
    case 'problemaResuelto': return conLock(function () { return problemaResuelto(String(r.id)); });
    case 'resumenAhora': return conLock(function () { return resumenDiario(false); });
    case 'nota': return guardarNota(r.id, r.nota);
    case 'costos': return {costos: leerCostos()};
    case 'guardarCostos': return guardarCostos(r.data);
    case 'pagos': return {pagos: leerDoc('Pagos')};
    case 'guardarPagos': return guardarDoc('Pagos', r.data);
    case 'subirMedia': return subirMedia(r);
    case 'borrarMedia': return conLock(function () { return borrarMedia(r.id); });
    case 'ordenMedia': return conLock(function () { return ordenMedia(r.id, r.dir); });
    case 'principalMedia': return conLock(function () { return principalMedia(r.id); });
    case 'recuperar': return listaRecuperar();
    case 'enviarSegundo': return enviarSegundo(r);
    case 'guardarCupon': return conLock(function () { return guardarCupon(r); });
    case 'borrarCupon': return conLock(function () { return borrarCupon(r.codigo); });
    case 'corte': return {corte: leerDoc('Corte')};
    case 'insumos': return {insumos: leerDoc('Insumos')};
    case 'guardarInsumos': return guardarDoc('Insumos', r.data);
    case 'guardarCorte': return guardarDoc('Corte', r.data);
    case 'taller': return tallerDatos();
    case 'tallerGuardar': return conLock(function () { return tallerGuardar(r); });
    case 'tallerBorrar': return conLock(function () { return tallerBorrar(r); });
    case 'stockAjuste': return conLock(function () { return stockAjuste(r); });
    case 'compraRegistrar': return conLock(function () { return compraRegistrar(r); });
    case 'compraAnular': return conLock(function () { return compraAnular(r); });
    case 'pagoRegistrar': return conLock(function () { return pagoRegistrar(r); });
    case 'pagoBorrar': return conLock(function () { return pagoBorrar(r); });
    case 'tandaCrear': return conLock(function () { return tandaCrear(r); });
    case 'tandaEstado': return conLock(function () { return tandaEstado(r); });
    case 'tandaRecibir': return conLock(function () { return tandaRecibir(r); });
    case 'tallerMigrar': return conLock(function () { return tallerMigrar(r); });
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
function agregar(n, obj) { (hoja(n) || asegurarHoja(n)).appendRow(COLS[n].map(function (c) { return obj[c] === undefined ? '' : obj[c]; })); }
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

function productos(c) {
  c = c || cfg();
  function lineas(t) { return String(t || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(String); }
  var l = [{id: 'doble', nombre: c.producto || 'Funda tipo canasto', tarjeta: num(c.precio_tarjeta), transferencia: num(c.precio_transferencia), activo: true, sub: c.sub1 || '', medidas: lineas(c.medidas1)}];
  l.push({id: 'individual', nombre: c.producto2 || 'Funda tipo canasto individual', tarjeta: num(c.precio2_tarjeta), transferencia: num(c.precio2_transferencia), activo: c.activo2 === 'SI', sub: c.sub2 || '', medidas: lineas(c.medidas2)});
  return l;
}
function itemsDe(p) {
  if (p.items) { try { var j = JSON.parse(p.items); if (Array.isArray(j) && j.length) return j; } catch (e) {} }
  return [{producto: 'doble', cantidad: num(p.cantidad) || 1}];
}
function stock() {
  var t = ahora(), out = {};
  ['doble', 'individual'].forEach(function (id) { out[id] = {ingresado: 0, ajustes: 0, vendidas: 0, reservadas: 0, disponible: 0}; });
  filas(H.mov).forEach(function (m) {
    var id = m.producto === 'individual' ? 'individual' : 'doble', c = num(m.cantidad);
    if (m.tipo === 'ingreso') out[id].ingresado += c; else out[id].ajustes += c;
  });
  filas(H.pedidos).forEach(function (p) {
    var vend = VENDIDO.indexOf(p.estado) >= 0, res = RESERVA.indexOf(p.estado) >= 0 && new Date(p.vence) > t;
    if (!vend && !res) return;
    itemsDe(p).forEach(function (it) { var id = it.producto === 'individual' ? 'individual' : 'doble'; if (vend) out[id].vendidas += num(it.cantidad); else out[id].reservadas += num(it.cantidad); });
  });
  Object.keys(out).forEach(function (id) { var o = out[id]; o.disponible = o.ingresado + o.ajustes - o.vendidas - o.reservadas; });
  return out;
}
/* ================= PÚBLICO ================= */
function publicoConfig(r) {
  var c = cfg(), s = stock();
  var vista = r.vista && c.clave_vista && String(r.vista) === c.clave_vista;
  var prods = productos(c).filter(function (p) { return p.activo; }).map(function (p) {
    return {id: p.id, nombre: p.nombre, precio_tarjeta: p.tarjeta, precio_transferencia: p.transferencia, disponible: Math.max(0, s[p.id].disponible), sub: p.sub, medidas: p.medidas};
  });
  return {
    abierta: c.tienda_abierta === 'SI' || !!vista, vista: !!vista,
    precio_tarjeta: num(c.precio_tarjeta), precio_transferencia: num(c.precio_transferencia),
    cuotas: num(c.cuotas_max), whatsapp: c.whatsapp, producto: c.producto, valor_envio: num(c.valor_envio),
    disponible: Math.max(0, s.doble.disponible), productos: prods, media: listaMedia()
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
    pago: r.pago === 'tarjeta' ? 'tarjeta' : 'transferencia', cantidad: 0
  };
  var lista = Array.isArray(r.items) && r.items.length ? r.items : [{producto: 'doble', cantidad: r.cantidad}];
  var items = [];
  lista.forEach(function (it) {
    var id = it.producto === 'individual' ? 'individual' : 'doble', q = Math.max(0, Math.min(5, Math.floor(num(it.cantidad))));
    if (!q) return;
    var ya = items.filter(function (x) { return x.producto === id; })[0];
    if (ya) ya.cantidad = Math.min(5, ya.cantidad + q); else items.push({producto: id, cantidad: q});
  });
  if (!items.length) throw new Error('El carrito está vacío.');
  d.items = items;
  d.cantidad = items.reduce(function (a, x) { return a + x.cantidad; }, 0);
  var falta = [];
  ['nombre','apellido','dni','email','cel_cod','cel_num'].forEach(function (k) { if (!d[k]) falta.push(k); });
  if (d.entrega === 'domicilio') ['calle','numero','prov_loc_cp'].forEach(function (k) { if (!d[k]) falta.push(k); });
  else { if (!d.sucursal) falta.push('sucursal'); ['calle','numero','piso','depto','observaciones'].forEach(function (k) { d[k] = ''; }); }
  if (falta.length) throw new Error('Faltan datos: ' + falta.join(', '));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) throw new Error('El email no es válido.');
  if (d.dni.length < 7) throw new Error('Revisá el DNI.');
  return d;
}

/**
 * Identificador de pedido: LP-AAMMDD-NNN.
 * Se ejecuta dentro de conLock() (LockService) para impedir duplicados.
 * El contador se calcula a partir de los pedidos guardados y se reinicia cada día.
 * Los IDs históricos con sufijo alfanumérico se conservan sin alteraciones.
 */
function siguienteIdPedido(fecha) {
  var prefijo = 'LP-' + Utilities.formatDate(fecha, TZ, 'yyMMdd') + '-';
  var maximo = 0;
  filas(H.pedidos).forEach(function (p) {
    var id = String(p.id || '');
    if (id.indexOf(prefijo) !== 0) return;
    var sufijo = id.slice(prefijo.length);
    if (/^\d{3}$/.test(sufijo)) maximo = Math.max(maximo, Number(sufijo));
  });
  if (maximo >= 999) throw new Error('Se alcanzó el máximo de 999 pedidos para este día.');
  return prefijo + String(maximo + 1).padStart(3, '0');
}

function crearPedido(r) {
  var c = cfg();
  if (c.tienda_abierta !== 'SI' && !(r.vista && r.vista === c.clave_vista)) throw new Error('La tienda todavía no está abierta.');
  var d = validar(r), s = stock(), prods = productos(c), total = 0;
  d.items.forEach(function (it) {
    var pr = prods.filter(function (x) { return x.id === it.producto; })[0];
    if (!pr || !pr.activo) throw new Error('Ese producto no está disponible.');
    var disp = s[it.producto].disponible;
    if (disp < it.cantidad) throw new Error(disp > 0 ? 'De ' + pr.nombre + ' solo quedan ' + disp + ' unidades.' : 'Nos quedamos sin stock de ' + pr.nombre + '. Dejanos tu mail y te avisamos.');
    it.nombre = pr.nombre;
    it.precio = d.pago === 'tarjeta' ? pr.tarjeta : pr.transferencia;
    it.precio_tarjeta = pr.tarjeta;
    total += it.precio * it.cantidad;
  });
  var cuponOk = null, descuento = 0;
  if (r.cupon && d.pago === 'transferencia') {
    cuponOk = validarCupon(r.cupon, d.email);
    descuento = Math.round(total * cuponOk.porcentaje / 100);
    total = total - descuento;
  }
  var fechaPedido = ahora();
  var id = siguienteIdPedido(fechaPedido);
  var horas = num(d.pago === 'tarjeta' ? c.reserva_tarjeta_horas : c.reserva_transferencia_horas) || 48;
  var vence = new Date(ahora().getTime() + horas * 3600000);
  var p = Object.assign({}, d, {id: id, fecha: fechaPedido, estado: d.pago === 'tarjeta' ? 'pendiente_mp' : 'reserva', total: total, vence: vence, items: JSON.stringify(d.items),
    cupon: cuponOk ? cuponOk.codigo : '', descuento: descuento || ''});
  agregar(H.pedidos, p);
  try { upsertCarrito(d.email, {nombre: d.nombre, apellido: d.apellido, cel: d.cel_cod + ' ' + d.cel_num, items: JSON.stringify(d.items), estado: 'pedido', pedido: id, origen: d.pago === 'tarjeta' ? 'tarjeta' : 'transferencia'}); } catch (e) {}
  if (d.pago === 'tarjeta') {
    try {
      var pref = crearPreferencia(p, c, r.vista);
      setear(H.pedidos, pedido(id)._fila, {mp_preferencia: pref.id});
      return {id: id, pago: 'tarjeta', init_point: pref.init_point};
    } catch (err) {
      setear(H.pedidos, pedido(id)._fila, {estado: 'cancelado', notas: 'Error MP: ' + err.message});
      throw new Error('No pudimos conectar con Mercado Pago. Probá de nuevo o elegí transferencia.');
    }
  }
  mailCompraTransferencia(p, c);
  avisoDueño('Nuevo pedido por transferencia ' + id, p, c);
  return {id: id, pago: 'transferencia', total: p.total, descuento: descuento, cupon: cuponOk ? cuponOk.codigo : '', vence: fmtFecha(vence), transferencia: datosTransferencia(c)};
}
function hayStock(p) {
  var s = stock();
  return itemsDe(p).every(function (it) { return s[it.producto === 'individual' ? 'individual' : 'doble'].disponible >= num(it.cantidad); });
}
function textoItems(p, c) {
  var prods = productos(c);
  return itemsDe(p).map(function (it) {
    var pr = prods.filter(function (x) { return x.id === it.producto; })[0];
    return (it.nombre || (pr && pr.nombre) || 'Funda tipo canasto') + ' × ' + it.cantidad;
  }).join(', ');
}
function datosTransferencia(c) { return {alias: c.alias, cbu: c.cbu, titular: c.titular, banco: c.banco}; }

function reintentar(r) {
  var p = pedido(limpiar(r.id, 30)), c = cfg();
  if (String(p.email).toLowerCase() !== limpiar(r.email, 100).toLowerCase()) throw new Error('El email no coincide con el pedido.');
  if (p.pago !== 'tarjeta' || ['pendiente_mp','vencido'].indexOf(p.estado) < 0) throw new Error('Este pedido no se puede volver a pagar.');
  if (p.estado === 'vencido' && !hayStock(p)) throw new Error('Nos quedamos sin stock.');
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
    items: itemsDe(p).map(function (it) {
      var pr = productos(c).filter(function (x) { return x.id === it.producto; })[0] || productos(c)[0];
      return {id: 'funda-' + pr.id, title: pr.nombre, quantity: num(it.cantidad), unit_price: pr.tarjeta, currency_id: 'ARS'};
    }),
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
    var c = cfg(), sinStock = p.estado !== 'pendiente_mp' && !hayStock(p);
    setear(H.pedidos, p._fila, {estado: 'pagado', pagado_el: ahora(), mp_pago: String(pago.id), total: num(pago.transaction_amount) || p.total,
      notas: sinStock ? (p.notas ? p.notas + ' | ' : '') + 'PAGÓ DESPUÉS DE VENCER Y NO HABÍA STOCK: coordinar con el cliente' : p.notas});
    if (sinStock && c.email_aviso) enviar(c.email_aviso, 'URGENTE: pago aprobado sin stock · ' + p.id, plantilla('Pago aprobado sin stock',
      '<p>El pedido <b>' + p.id + '</b> se pagó con tarjeta después de que venció la reserva y ya no hay stock para cubrirlo. Contactá al cliente para coordinar la entrega o la devolución.</p>', c), c);
    p.estado = 'pagado'; p.total = num(pago.transaction_amount) || p.total;
    mailPagoTarjeta(p, c);
    avisoDueño('Pago con tarjeta aprobado ' + p.id, p, c);
    marcarCarritoPorPedido(p.id, 'compro');
  } else if (!p.mp_pago) {
    setear(H.pedidos, p._fila, {mp_pago: String(pago.id) + ' (' + pago.status + ')'});
  }
}

/* ================= PANEL ================= */
function login(r) {
  var pass = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!pass) throw new Error('Falta ADMIN_PASSWORD en Propiedades del script.');
  var cache = CacheService.getScriptCache(), fallos = num(cache.get('login_fallos'));
  if (fallos >= 8) throw new Error('Demasiados intentos fallidos. Esperá 15 minutos y probá de nuevo.');
  Utilities.sleep(400 + fallos * 400);
  if (String(r.password || '') !== pass) {
    cache.put('login_fallos', String(fallos + 1), 900);
    throw new Error('Contraseña incorrecta.');
  }
  cache.remove('login_fallos');
  var t = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('adm_' + t, '1', 21600);
  return {token: t};
}
function auth(r) {
  if (!r.token || !CacheService.getScriptCache().get('adm_' + r.token)) throw new Error('SESION');
}
function resumen() {
  conLock(vencerReservas);
  var c = cfg(), s = stock(), mes = Utilities.formatDate(ahora(), TZ, 'yyyyMM');
  var t = ahora().getTime(), props = PropertiesService.getScriptProperties();
  var ped = filas(H.pedidos).map(function (p) {
    var o = {}; COLS.Pedidos.forEach(function (k) { o[k] = (p[k] instanceof Date) ? fmtFecha(p[k]) : p[k]; });
    o._ts = new Date(p.fecha).getTime(); o._vence_ts = p.vence ? new Date(p.vence).getTime() : 0; o._items = textoItems(p, c);
    o._etapa = etapaDe(p, t); o._alerta = o._etapa ? alertaDe(p, o._etapa, t, c) : null; return o;
  }).sort(function (a, b) { return b._ts - a._ts; });
  var v = {unidades: 0, total: 0, transferencia: 0, tarjeta: 0};
  filas(H.pedidos).forEach(function (p) {
    if (VENDIDO.indexOf(p.estado) < 0 || Utilities.formatDate(new Date(p.fecha), TZ, 'yyyyMM') !== mes) return;
    v.unidades += num(p.cantidad); v.total += num(p.total); v[p.pago] += num(p.total);
  });
  return {
    stock: s, ventasMes: v, pedidos: ped, config: c,
    movimientos: filas(H.mov).map(function (m) { return {fecha: fmtFecha(m.fecha), tipo: m.tipo, cantidad: num(m.cantidad), motivo: m.motivo, producto: m.producto === 'individual' ? 'individual' : 'doble'}; }).reverse(),
    productos: productos(c),
    avisos: filas(H.avisos).filter(function (a) { return a.avisado !== 'SI'; }).map(function (a) { return a.email; }),
    urlVista: (c.url_web || '').replace(/\/$/, '') + '/?vista=' + c.clave_vista,
    tokenMP: !!props.getProperty('MP_ACCESS_TOKEN'),
    media: listaMedia(),
    oficina: 2,   // 1 = pantalla Hoy; 2 = además, confirmación de entrega
    ultimoResumen: props.getProperty('resumen_ultimo') ? fmtFecha(new Date(num(props.getProperty('resumen_ultimo')))) : ''
  };
}
function marcarPagado(id) {
  var p = pedido(id), c = cfg();
  if (['reserva','vencido','pendiente_mp'].indexOf(p.estado) < 0) throw new Error('El pedido ya no está pendiente de pago.');
  if (p.estado === 'vencido' && !hayStock(p)) throw new Error('No hay stock para este pedido vencido.');
  setear(H.pedidos, p._fila, {estado: 'pagado', pagado_el: ahora()});
  p.estado = 'pagado';
  marcarCarritoPorPedido(p.id, 'compro');
  if (p.pago === 'transferencia') mailPagoTransferencia(p, c); else mailPagoTarjeta(p, c);
  return {};
}
function despachar(id, tracking) {
  var p = pedido(id), c = cfg(), t = String(tracking || '').replace(/\s/g, '');
  if (!/^\d{6,}$/.test(t)) throw new Error('El número de seguimiento tiene que ser solo números.');
  if (['pagado','exportado','despachado'].indexOf(p.estado) < 0) throw new Error(p.estado === 'entregado' ? 'El pedido ' + id + ' ya figura entregado.' : 'Solo se despachan pedidos pagados.');
  setear(H.pedidos, p._fila, {estado: 'despachado', tracking: t, despachado_el: ahora()});
  p.tracking = t;
  mailDespacho(p, c);
  return {};
}
function cambiarEstado(id, estado) { setear(H.pedidos, pedido(id)._fila, {estado: estado}); return {}; }
function guardarNota(id, nota) { setear(H.pedidos, pedido(id)._fila, {notas: limpiar(nota, 300)}); return {}; }
function reenviar(id) {
  var p = pedido(id), c = cfg();
  if (p.estado === 'despachado' || p.estado === 'entregado') mailDespacho(p, c);
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
  agregar(H.mov, {fecha: ahora(), tipo: tipo, cantidad: cant, motivo: motivo, producto: r.producto === 'individual' ? 'individual' : 'doble'});
  return {};
}
function avisarStock() {
  var c = cfg(), s = stock();
  if (s.doble.disponible <= 0 && s.individual.disponible <= 0) throw new Error('Todavía no hay stock disponible.');
  var n = 0, cupo = MailApp.getRemainingDailyQuota() - 5, faltan = 0;
  filas(H.avisos).forEach(function (a) {
    if (a.avisado === 'SI') return;
    if (n >= cupo) { faltan++; return; }
    enviar(a.email, '¡Volvieron las fundas de Los Perrines!', plantilla('Ya hay stock',
      '<p>Nos pediste que te avisemos: ya tenemos stock de nuevo.</p>' +
      boton(c.url_web, 'Comprar ahora'), c), c);
    setear(H.avisos, a._fila, {avisado: 'SI'}); n++;
  });
  return {avisados: n, faltan: faltan};
}
function guardarConfig(vals) {
  var sh = hoja(H.config), hechas = {};
  filas(H.config).forEach(function (r) {
    if (Object.prototype.hasOwnProperty.call(vals, r.clave)) { sh.getRange(r._fila, 2).setValue(String(vals[r.clave]).trim()); hechas[r.clave] = 1; }
  });
  Object.keys(vals).forEach(function (k) {
    if (hechas[k]) return;
    var def = CONFIG_DEF.filter(function (d) { return d[0] === k; })[0];
    if (def) sh.appendRow([k, String(vals[k]).trim(), def[2]]);
  });
  return {};
}

/* ================= ANDREANI ================= */
function exportarAndreani(ids) {
  var c = cfg();
  if (!c.plantilla_andreani_id) throw new Error('Falta cargar plantilla_andreani_id en Configuración.');
  var elegidos = Array.isArray(ids) && ids.length ? ids.map(String) : null;   // sin lista: todos los pagados (pantalla Envíos)
  var pend = filas(H.pedidos).filter(function (p) { return p.estado === 'pagado' && (!elegidos || elegidos.indexOf(String(p.id)) >= 0); });
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
    if (RESERVA.indexOf(p.estado) >= 0 && p.vence && new Date(p.vence) < t) { setear(H.pedidos, p._fila, {estado: 'vencido'}); marcarCarritoPorPedido(p.id, 'vencido'); }
  });
}
function tareaHoraria() {
  try { enviarRecordatorios(); } catch (e) { console.error(e); }
  vencerReservas();
  try { enviarConsultasEntrega(); } catch (e) { console.error(e); }
  try { resumenSiToca(); } catch (e) { console.error(e); }
  var c = cfg(), s = stock(), props = PropertiesService.getScriptProperties();
  var hoy = Utilities.formatDate(ahora(), TZ, 'yyyyMMdd');
  productos(c).forEach(function (pr) {
    var st = s[pr.id], clave = 'aviso_stock_' + pr.id;
    if (c.email_aviso && pr.activo && st.ingresado > 0 && st.disponible <= num(c.stock_minimo) && props.getProperty(clave) !== hoy) {
      enviar(c.email_aviso, 'Stock bajo de ' + pr.nombre + ': quedan ' + st.disponible, plantilla('Stock bajo',
        '<p>De <b>' + esc(pr.nombre) + '</b> quedan <b>' + st.disponible + '</b> unidades disponibles (' + st.reservadas + ' reservadas). Es momento de encargar el próximo lote.</p>', c), c);
      props.setProperty(clave, hoy);
    }
  });
}

/* ================= OFICINA: pantalla Hoy y resumen diario ================= */
/* Cada pedido está en una etapa: confirmar (transferencia sin pagar) → preparar → etiquetar
   (listo para exportar a Andreani) → despachar (falta el seguimiento) → camino (salió hace poco).
   La pantalla Hoy del panel y el resumen por mail usan exactamente esta misma cuenta. */
var DIA = 86400000;
function tsDe(v) {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  var m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);   // "dd/MM/yyyy HH:mm" en hora argentina (UTC-3)
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1], (+m[4] || 0) + 3, +m[5] || 0);
  var d = new Date(v); return isNaN(d.getTime()) ? 0 : d.getTime();
}
function etapaDe(p, t) {
  var e = p.estado;
  if (e === 'reserva') return 'confirmar';
  if (e === 'vencido' && p.pago === 'transferencia' && t - tsDe(p.vence) < 3 * DIA) return 'confirmar';   // por si pagó tarde
  if (e === 'pagado') return p.preparado ? 'etiquetar' : 'preparar';
  if (e === 'exportado') return 'despachar';
  if ((e === 'despachado' || e === 'entregado') && p.problema_el) return 'camino';   // queda a la vista hasta que lo resuelvas
  if (e === 'despachado') return 'camino';
  if (e === 'entregado' && t - (tsDe(p.entregado_el) || t) < 7 * DIA) return 'entregado';
  return '';
}
function horasTxt(h) { h = Math.max(1, Math.round(h)); return h < 48 ? h + ' h' : Math.round(h / 24) + ' días'; }
function alertaDe(p, etapa, t, c) {
  if (etapa === 'confirmar') {
    var h = (tsDe(p.vence) - t) / 3600000;
    if (h <= 0) return {nivel: 'bad', texto: 'La reserva venció hace ' + horasTxt(-h) + '. Si te pagó igual, marcalo como pagado.'};
    if (h <= 12) return {nivel: 'warn', texto: 'La reserva vence en ' + horasTxt(h) + '.'};
    return null;
  }
  if (etapa === 'preparar' || etapa === 'etiquetar' || etapa === 'despachar') {
    var dias = Math.floor((t - (tsDe(p.pagado_el) || tsDe(p.fecha))) / DIA), lim = num(c.alerta_despacho_dias) || 2;
    if (dias >= lim) return {nivel: 'bad', texto: 'Pagado hace ' + dias + ' días y todavía no salió.'};
    if (etapa === 'despachar' && tsDe(p.exportado) && t - tsDe(p.exportado) >= DIA) return {nivel: 'warn', texto: 'Exportado hace más de un día: falta cargar el seguimiento.'};
  }
  if (etapa === 'camino') {
    if (p.problema_el) return {nivel: 'bad', texto: 'El cliente avisó que tuvo un problema con la entrega. Comunicate con él.'};
    var sal = tsDe(p.despachado_el), espera = (num(c.consulta_entrega_dias) || 5) + 2;
    if (sal && t - sal >= espera * DIA) return {nivel: 'warn', texto: 'Salió hace ' + Math.floor((t - sal) / DIA) + ' días y nadie confirmó la entrega: mirá el seguimiento.'};
  }
  return null;
}
/* Acciones en lote: hace cada una por separado y devuelve cuáles salieron y cuáles no (con el motivo). */
function enLote(lista, fn) {
  lista = Array.isArray(lista) ? lista.slice(0, 100) : [];
  if (!lista.length) throw new Error('No elegiste ningún pedido.');
  var hechos = [], errores = [];
  lista.forEach(function (x) {
    var id = String(x && x.id !== undefined ? x.id : x);
    try { fn(x); hechos.push(id); } catch (e) { errores.push({id: id, error: String(e && e.message || e)}); }
  });
  return {hechos: hechos, errores: errores};
}
function marcarPreparado(id, si) {
  var p = pedido(id);
  if (p.estado !== 'pagado') throw new Error('El pedido ' + id + ' no está pagado o ya se exportó.');
  setear(H.pedidos, p._fila, {preparado: si ? ahora() : ''});
}
function resumenSiToca() {
  var c = cfg(), hora = c.resumen_hora === undefined ? '20' : String(c.resumen_hora).trim();
  if (hora === '' || !emailOk(c.email_aviso)) return;
  var props = PropertiesService.getScriptProperties(), d = ahora();
  if (Number(Utilities.formatDate(d, TZ, 'HH')) < num(hora)) return;
  if (props.getProperty('resumen_dia') === Utilities.formatDate(d, TZ, 'yyyyMMdd')) return;   // ya salió hoy
  resumenDiario(true);
}
/* Foto de todo lo pendiente ahora + lo nuevo desde el resumen automático anterior. */
function resumenDiario(automatico) {
  var c = cfg(), props = PropertiesService.getScriptProperties();
  if (!emailOk(c.email_aviso)) throw new Error('Falta cargar tu email para avisos en Configuración.');
  vencerReservas();
  var t = ahora().getTime(), desde = num(props.getProperty('resumen_ultimo')) || t - DIA;
  var P = filas(H.pedidos), s = stock(), g = {confirmar: [], preparar: [], etiquetar: [], despachar: [], camino: [], entregado: []}, atrasos = [];
  P.forEach(function (p) {
    var e = etapaDe(p, t); if (!e) return;
    var x = {p: p, a: alertaDe(p, e, t, c)}; g[e].push(x);
    if (x.a && x.a.nivel === 'bad') atrasos.push(x);
  });
  Object.keys(g).forEach(function (k) { g[k].sort(function (a, b) { return tsDe(a.p.fecha) - tsDe(b.p.fecha); }); });
  var nuevos = P.filter(function (p) { return tsDe(p.fecha) > desde && !(p.estado === 'cancelado' && /^Error MP/.test(String(p.notas))); });
  var cobrados = P.filter(function (p) { return VENDIDO.indexOf(p.estado) >= 0 && tsDe(p.pagado_el) > desde; });
  var plataCobrada = cobrados.reduce(function (a, p) { return a + num(p.total); }, 0);
  var entregados = P.filter(function (p) { return tsDe(p.entregado_el) > desde; }).length;
  function linea(x) {
    var p = x.p;
    return '<li style="margin:0 0 6px"><b>' + esc(p.nombre + ' ' + p.apellido) + '</b> · ' + esc(p.id) + ' · ' + esc(textoItems(p, c)) +
      (x.a ? '<br><span style="color:' + (x.a.nivel === 'bad' ? '#B4432F' : '#A86A12') + '">' + esc(x.a.texto) + '</span>' : '') + '</li>';
  }
  function seccion(titulo, lista, extra) {
    if (!lista.length) return '';
    return '<h2 style="font-size:17px;margin:22px 0 6px">' + titulo + ' (' + lista.length + ')</h2>' + (extra ? '<p style="margin:0 0 6px;color:#5E6656">' + extra + '</p>' : '') +
      '<ul style="margin:0;padding-left:18px">' + lista.slice(0, 8).map(linea).join('') + (lista.length > 8 ? '<li>y ' + (lista.length - 8) + ' más</li>' : '') + '</ul>';
  }
  function unidades(lista) {
    var u = {};
    lista.forEach(function (x) { itemsDe(x.p).forEach(function (it) { var id = it.producto === 'individual' ? 'individual' : 'doble'; u[id] = (u[id] || 0) + num(it.cantidad); }); });
    return productos(c).filter(function (pr) { return u[pr.id]; }).map(function (pr) { return u[pr.id] + ' × ' + esc(pr.nombre); }).join(' · ');
  }
  var partes = [];
  if (g.confirmar.length) partes.push(g.confirmar.length + ' por confirmar');
  if (g.preparar.length) partes.push(g.preparar.length + ' para preparar');
  if (g.etiquetar.length) partes.push(g.etiquetar.length + ' para etiquetar');
  if (g.despachar.length) partes.push(g.despachar.length + ' para despachar');
  var asunto = 'Resumen del día · ' + (partes.length ? partes.join(', ') : 'todo al día ✅') + (atrasos.length ? ' · ' + atrasos.length + ' atrasado' + (atrasos.length > 1 ? 's' : '') : '');
  var cuerpo = '<p style="margin:0 0 10px">Desde el resumen anterior (' + fmtFecha(new Date(desde)) + '): <b>' + nuevos.length + ' pedido' + (nuevos.length === 1 ? '' : 's') + ' nuevo' + (nuevos.length === 1 ? '' : 's') + '</b>' +
    ' y <b>' + cobrados.length + ' pago' + (cobrados.length === 1 ? '' : 's') + ' confirmado' + (cobrados.length === 1 ? '' : 's') + '</b>' + (cobrados.length ? ' por ' + plata(plataCobrada) : '') +
    (entregados ? ', y <b>' + entregados + ' entrega' + (entregados === 1 ? '' : 's') + ' confirmada' + (entregados === 1 ? '' : 's') + '</b>' : '') + '.</p>';
  if (atrasos.length) cuerpo += '<div style="background:#F8E6E1;border-radius:12px;padding:12px 14px;margin:12px 0"><b style="color:#B4432F">Se están atrasando (' + atrasos.length + ')</b><ul style="margin:6px 0 0;padding-left:18px">' + atrasos.slice(0, 8).map(linea).join('') + '</ul></div>';
  if (!partes.length) cuerpo += '<p>No hay nada pendiente. 🐾</p>';
  cuerpo += seccion('Confirmar pago', g.confirmar, 'Transferencias esperando. Fijate en Mercado Pago si llegaron.') +
    seccion('Preparar', g.preparar, 'Para armar: ' + unidades(g.preparar) + '.') +
    seccion('Etiquetar', g.etiquetar, 'Ya preparados: falta exportarlos a Andreani.') +
    seccion('Despachar', g.despachar, 'Exportados: falta cargar el número de seguimiento.');
  if (g.camino.length) cuerpo += '<p style="margin:18px 0 0;color:#5E6656">En camino: ' + g.camino.length + '.</p>';
  cuerpo += '<p style="margin:18px 0 0"><b>Stock:</b> ' + productos(c).filter(function (pr) { return pr.activo || s[pr.id].ingresado > 0; }).map(function (pr) {
    var st = s[pr.id], bajo = st.ingresado > 0 && st.disponible <= num(c.stock_minimo);
    return esc(pr.nombre) + ' <b' + (bajo ? ' style="color:#B4432F"' : '') + '>' + Math.max(0, st.disponible) + '</b> disponibles' + (bajo ? ' (stock bajo)' : '');
  }).join(' · ') + '.</p>' + boton(String(c.url_web || '').replace(/\/$/, '') + '/admin.html#hoy', 'Abrir la pantalla Hoy');
  enviar(c.email_aviso, asunto, plantilla('Resumen del ' + Utilities.formatDate(ahora(), TZ, 'dd/MM'), cuerpo, c), c);
  if (automatico) {
    props.setProperty('resumen_ultimo', String(t));
    props.setProperty('resumen_dia', Utilities.formatDate(ahora(), TZ, 'yyyyMMdd'));
  }
  return {email: c.email_aviso, asunto: asunto};
}

/* ================= ENTREGA: "¿Ya te llegó?" ================= */
/* A los N días del despacho (consulta_entrega_dias) le preguntamos al cliente si recibió el pedido.
   "Sí, llegó" → Entregado + gracias con pedido de foto e Instagram. "Tuve un problema" → aviso urgente al dueño.
   Los links abren una página con un botón para confirmar: así los antivirus de algunos correos, que abren
   los links solos, no marcan nada por su cuenta. */
function firmaEntrega(id) {
  var props = PropertiesService.getScriptProperties(), k = props.getProperty('secreto_bajas');
  if (!k) { k = Utilities.getUuid(); props.setProperty('secreto_bajas', k); }
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature('entrega:' + id, k)).slice(0, 16);
}
function linkEntrega(id, r) { return ScriptApp.getService().getUrl() + '?entrega=' + encodeURIComponent(id) + '&r=' + r + '&t=' + firmaEntrega(id); }
function linkWa(c, texto) { return c.whatsapp && c.whatsapp.length > 6 ? 'https://wa.me/' + c.whatsapp + '?text=' + encodeURIComponent(texto) : ''; }
function linkInstagram(c) { var u = String(c.instagram || '').replace(/^@/, '').trim(); return u ? {url: 'https://www.instagram.com/' + encodeURIComponent(u) + '/', usuario: '@' + u} : null; }
function botonClaro(url, txt) { return '<a href="' + url + '" style="border:2px solid #4E5B3A;color:#4E5B3A;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px;display:inline-block;margin:0 0 10px">' + txt + '</a>'; }
function pedidoFoto(p, c) {   // lo que le pedimos al cliente cuando recibe: foto de la mascota en el auto + Instagram
  var wa = linkWa(c, '¡Hola! Les mando la foto de mi mascota viajando con su funda 🐾 (pedido ' + p.id + ')'), ig = linkInstagram(c);
  return '<p>¿Nos regalás una <b>foto de tu mascota viajando en el auto con su funda</b>? Nos encanta verlas y, si nos das permiso, la compartimos.</p>' +
    (wa ? boton(wa, '📸 Mandar la foto por WhatsApp') : '<p>Mandala respondiendo este mail.</p>') +
    (ig ? '<p>Y si todavía no nos seguís, estamos en Instagram como <a href="' + ig.url + '" style="color:#4E5B3A;font-weight:bold">' + esc(ig.usuario) + '</a>. ¡Etiquetanos en tus historias!</p>' : '');
}
function mailConsultaEntrega(p, c) {
  var link = 'https://www.andreani.com/envio/' + p.tracking;
  enviar(p.email, '¿Ya te llegó tu funda? 🐾 Pedido ' + p.id, plantilla('¿Ya te llegó?',
    '<p>Hola ' + esc(p.nombre) + ', hace unos días despachamos tu pedido <b>' + p.id + '</b>. ¿Ya lo recibiste?</p>' +
    '<p style="margin:22px 0 8px">' + boton(linkEntrega(p.id, 'si'), 'Sí, ya llegó').replace(/^<p[^>]*>|<\/p>$/g, '') + ' &nbsp; ' + botonClaro(linkEntrega(p.id, 'problema'), 'Tuve un problema') + '</p>' +
    (p.tracking ? '<p style="color:#5E6656;font-size:14px">Si todavía no llegó, lo podés seguir acá: <a href="' + link + '" style="color:#4E5B3A">' + p.tracking + '</a>.</p>' : ''), c), c);
}
function mailGraciasEntrega(p, c) {
  enviar(p.email, '¡Gracias por elegirnos! 🐾', plantilla('¡Qué bueno que llegó!',
    '<p>Hola ' + esc(p.nombre) + ', gracias por confirmarnos que recibiste tu pedido <b>' + p.id + '</b>. Esperamos que tu compañero de viaje lo disfrute.</p>' + pedidoFoto(p, c), c), c);
}
function enviarConsultasEntrega() {
  var c = cfg(), dias = String(c.consulta_entrega_dias === undefined ? '5' : c.consulta_entrega_dias).trim();
  if (dias === '' || !(num(dias) > 0)) return 0;
  var t = ahora().getTime(), n = 0;
  filas(H.pedidos).forEach(function (p) {
    if (p.estado !== 'despachado' || p.consulta_el || p.problema_el || !tsDe(p.despachado_el) || !emailOk(p.email)) return;
    if (t - tsDe(p.despachado_el) < num(dias) * DIA || MailApp.getRemainingDailyQuota() < 10) return;
    mailConsultaEntrega(p, c);
    setear(H.pedidos, p._fila, {consulta_el: ahora()}); n++;
  });
  return n;
}
function marcarEntregado(id, si) {
  var p = pedido(id), c = cfg();
  if (si) {
    if (p.estado !== 'despachado') throw new Error(p.estado === 'entregado' ? 'El pedido ' + id + ' ya figura entregado.' : 'El pedido ' + id + ' todavía no salió.');
    setear(H.pedidos, p._fila, {estado: 'entregado', entregado_el: ahora()});
    if (emailOk(p.email)) mailGraciasEntrega(p, c);
  } else {
    if (p.estado !== 'entregado') throw new Error('El pedido ' + id + ' no figura entregado.');
    setear(H.pedidos, p._fila, {estado: 'despachado', entregado_el: ''});
  }
}
function problemaResuelto(id) {
  var p = pedido(id);
  if (!p.problema_el) throw new Error('Ese pedido no tiene un problema pendiente.');
  setear(H.pedidos, p._fila, {problema_el: '', notas: limpiar((p.notas ? p.notas + ' | ' : '') + 'Problema de entrega resuelto el ' + Utilities.formatDate(ahora(), TZ, 'dd/MM'), 300)});
  return {};
}
function paginaCliente(titulo, cuerpo) {
  var out = HtmlService.createHtmlOutput('<div style="font-family:Arial,Helvetica,sans-serif;background:#F2F3EC;min-height:100vh;padding:28px 14px;color:#1E2418;box-sizing:border-box">' +
    '<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden"><div style="background:#4E5B3A;color:#F2F3EC;padding:16px 22px;font-size:19px;font-weight:bold">🐾 Los Perrines</div>' +
    '<div style="padding:22px;font-size:16px;line-height:1.5"><h1 style="font-size:22px;margin:0 0 12px">' + titulo + '</h1>' + cuerpo.replace(/<a /g, '<a target="_blank" rel="noopener" ') + '</div></div></div>').setTitle('Los Perrines');
  try { out.addMetaTag('viewport', 'width=device-width, initial-scale=1'); } catch (e) {}
  return out;
}
function respuestaEntrega(q) {
  var id = limpiar(q.entrega, 30), r = q.r === 'problema' ? 'problema' : 'si', c = cfg();
  var p = q.t && q.t === firmaEntrega(id) ? filas(H.pedidos).filter(function (x) { return x.id === id; })[0] : null;
  if (!p || ['despachado','entregado'].indexOf(p.estado) < 0) return paginaCliente('Link no válido', '<p>No encontramos ese pedido. Si necesitás ayuda, escribinos por WhatsApp.</p>');
  var form = function (txt, extra) {
    return '<form method="get" action="' + ScriptApp.getService().getUrl() + '" target="_top">' +
      '<input type="hidden" name="entrega" value="' + esc(id) + '"><input type="hidden" name="r" value="' + r + '"><input type="hidden" name="t" value="' + esc(q.t) + '"><input type="hidden" name="ok" value="1">' + (extra || '') +
      '<button style="background:#4E5B3A;color:#F2F3EC;border:0;font-size:17px;font-weight:bold;padding:14px 22px;border-radius:10px;width:100%;cursor:pointer;margin-top:8px">' + txt + '</button></form>';
  };
  if (r === 'si') {
    if (!q.ok && p.estado !== 'entregado') return paginaCliente('¿Recibiste tu pedido?', '<p>Pedido <b>' + esc(p.id) + '</b>. Tocá el botón para confirmarnos que te llegó.</p>' + form('Sí, recibí mi pedido'));
    conLock(function () { var x = pedido(id); if (x.estado === 'despachado') marcarEntregado(id, true); });
    return paginaCliente('¡Gracias, ' + esc(p.nombre) + '! 🎉', '<p>Qué bueno que tu funda ya está en casa. Esperamos que tu compañero de viaje la disfrute.</p>' + pedidoFoto(p, c));
  }
  var wa = linkWa(c, 'Hola, tuve un problema con mi pedido ' + p.id + ': ');
  if (!q.ok) return paginaCliente('Contanos qué pasó', '<p>Lamentamos que hayas tenido un problema con tu pedido <b>' + esc(p.id) + '</b>. Contanos brevemente qué pasó y te contactamos lo antes posible.</p>' +
    form('Avisar a Los Perrines', '<textarea name="detalle" rows="4" maxlength="400" placeholder="Ej.: todavía no llegó, llegó dañado, falta algo…" style="width:100%;box-sizing:border-box;font:inherit;padding:10px;border:1.5px solid #D9DCCF;border-radius:10px"></textarea>'));
  var detalle = limpiar(q.detalle, 400);
  conLock(function () {
    var x = pedido(id), nuevo = !x.problema_el;
    setear(H.pedidos, x._fila, {problema_el: ahora(), notas: limpiar((x.notas ? x.notas + ' | ' : '') + 'Problema de entrega: ' + (detalle || 'sin detalle'), 300)});
    if (nuevo || detalle) avisoDueño('URGENTE: problema con la entrega · ' + x.id + (detalle ? ' · ' + detalle.slice(0, 60) : ''), x, c);
  });
  return paginaCliente('Gracias por avisarnos', '<p>Ya nos llegó tu aviso y te vamos a contactar lo antes posible para solucionarlo.</p>' + (wa ? boton(wa, 'Escribirnos por WhatsApp ahora') : ''));
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
    '<tr><td style="padding:6px 0;color:#5E6656">Productos</td><td style="text-align:right">' + esc(textoItems(p, c)) + '</td></tr>' +
    (p.cupon ? '<tr><td style="padding:6px 0;color:#5E6656">Código ' + esc(p.cupon) + '</td><td style="text-align:right">−' + plata(p.descuento) + '</td></tr>' : '') +
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
    '<p>Reservamos tu pedido. Para confirmarlo, transferí el importe antes del <b>' + fmtFecha(p.vence) + '</b>:</p>' + t +
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
  enviar(p.email, 'Tu pedido de Los Perrines ya está en camino 🐾', plantilla('¡Tu pedido ya salió!',
    '<p>Hola ' + esc(p.nombre) + ', tu pedido <b>' + p.id + '</b> ya salió de San Luis.</p>' + boton(link, 'Seguí tu envío') +
    '<p style="color:#5E6656;font-size:14px">Número de seguimiento: <b>' + p.tracking + '</b></p>' + detalle(p, c), c), c);
}
function avisoDueño(asunto, p, c) {
  if (!c.email_aviso) return;
  enviar(c.email_aviso, asunto, plantilla(asunto, '<p>' + esc(p.nombre + ' ' + p.apellido) + ' · ' + esc(p.email) + ' · ' + esc(p.cel_cod + ' ' + p.cel_num) + '</p>' + detalle(p, c), c), c);
}
function enviar(to, asunto, html, c) {
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Se alcanzó el límite diario de mails de Google. Los que faltan se pueden mandar mañana.');
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

/* ================= PAGOS A PROVEEDORES ================= */
function leerDoc(nombre) {
  var sh = SpreadsheetApp.getActive().getSheetByName(nombre);
  if (!sh) return null;
  var v = sh.getRange(1, 1).getValue();
  return v ? JSON.parse(v) : null;
}
function guardarDoc(nombre, d) {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
  var s = JSON.stringify(d || {});
  if (s.length > 45000) throw new Error('Demasiados datos en ' + nombre + '.');
  sh.getRange(1, 1).setValue(s);
  return {};
}

/* ================= FOTOS Y VIDEOS ================= */
function carpetaMedia() {
  var it = DriveApp.getFoldersByName('Los Perrines - Fotos y videos');
  return it.hasNext() ? it.next() : DriveApp.createFolder('Los Perrines - Fotos y videos');
}
function listaMedia() {
  var sh = hoja(H.media); if (!sh) return [];
  return filas(H.media).map(function (m) {
    return {id: String(m.id), destino: String(m.destino), tipo: String(m.tipo), nombre: String(m.nombre), orden: num(m.orden), principal: m.principal === 'SI', drive: String(m.drive_id)};
  }).sort(function (a, b) { return a.destino === b.destino ? a.orden - b.orden : (a.destino < b.destino ? -1 : 1); });
}
function subirMedia(r) {
  asegurarHoja(H.media);
  var destino = limpiar(r.destino, 30) || 'portada', mime = String(r.mime || ''), tipo = /^video\//.test(mime) ? 'video' : 'img';
  if (!/^(image|video)\//.test(mime)) throw new Error('Solo se pueden subir fotos o videos.');
  if (!r.data) throw new Error('El archivo llegó vacío.');
  var blob = Utilities.newBlob(Utilities.base64Decode(r.data), mime, limpiar(r.nombre, 80) || ('archivo-' + Date.now()));
  var f = carpetaMedia().createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var actuales = listaMedia().filter(function (m) { return m.destino === destino; });
  var orden = actuales.reduce(function (a, m) { return Math.max(a, m.orden); }, 0) + 1;
  var principal = tipo === 'img' && !actuales.some(function (m) { return m.principal; }) ? 'SI' : 'NO';
  var id = Utilities.getUuid().slice(0, 8);
  agregar(H.media, {id: id, fecha: ahora(), destino: destino, tipo: tipo, nombre: blob.getName(), orden: orden, principal: principal, drive_id: f.getId()});
  return {id: id, drive: f.getId()};
}
function filaMedia(id) { var m = filas(H.media).filter(function (x) { return String(x.id) === String(id); })[0]; if (!m) throw new Error('No encontré ese archivo.'); return m; }
function borrarMedia(id) {
  var m = filaMedia(id);
  try { DriveApp.getFileById(String(m.drive_id)).setTrashed(true); } catch (e) {}
  hoja(H.media).deleteRow(m._fila);
  if (m.principal === 'SI') { var otra = listaMedia().filter(function (x) { return x.destino === String(m.destino) && x.tipo === 'img'; })[0]; if (otra) principalMedia(otra.id); }
  return {};
}
function ordenMedia(id, dir) {
  var m = filaMedia(id), mismos = filas(H.media).filter(function (x) { return String(x.destino) === String(m.destino); }).sort(function (a, b) { return num(a.orden) - num(b.orden); });
  var i = mismos.map(function (x) { return String(x.id); }).indexOf(String(id)), j = i + (num(dir) < 0 ? -1 : 1);
  if (j < 0 || j >= mismos.length) return {};
  mismos.forEach(function (x, k) { x.orden = k + 1; });
  var t = mismos[i].orden; mismos[i].orden = mismos[j].orden; mismos[j].orden = t;
  mismos.forEach(function (x) { setear(H.media, x._fila, {orden: x.orden}); });
  return {};
}
function principalMedia(id) {
  var m = filaMedia(id); if (String(m.tipo) !== 'img') throw new Error('La principal tiene que ser una foto.');
  filas(H.media).forEach(function (x) { if (String(x.destino) === String(m.destino)) setear(H.media, x._fila, {principal: String(x.id) === String(id) ? 'SI' : 'NO'}); });
  return {};
}

/* ================= RECUPERAR VENTAS ================= */
function hojaOk(n) { return asegurarHoja(n); }
function emailOk(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e || ''); }
var _bajas = null;
function dadoDeBaja(email) {
  if (!_bajas) { hojaOk(H.bajas); _bajas = {}; filas(H.bajas).forEach(function (b) { _bajas[String(b.email).toLowerCase()] = 1; }); }
  return !!_bajas[String(email || '').toLowerCase()];
}
function firmaBaja(email) {
  var props = PropertiesService.getScriptProperties(), k = props.getProperty('secreto_bajas');
  if (!k) { k = Utilities.getUuid(); props.setProperty('secreto_bajas', k); }
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(email).toLowerCase(), k)).slice(0, 16);
}
function linkBaja(email) { return ScriptApp.getService().getUrl() + '?baja=' + encodeURIComponent(email) + '&t=' + firmaBaja(email); }
function pieBaja(email) { return '<p style="font-size:12px;color:#8A9180;margin-top:18px">¿No querés recibir más recordatorios? <a href="' + linkBaja(email) + '" style="color:#8A9180">Darme de baja</a>.</p>'; }
function darDeBaja(email, t) {
  email = String(email || '').toLowerCase();
  var ok = emailOk(email) && t === firmaBaja(email);
  if (ok && !dadoDeBaja(email)) { agregar(H.bajas, {fecha: ahora(), email: email}); _bajas = null; }
  return HtmlService.createHtmlOutput('<div style="font-family:Arial;max-width:420px;margin:60px auto;text-align:center;color:#1E2418"><h2>🐾 Los Perrines</h2><p>' +
    (ok ? 'Listo, no vas a recibir más recordatorios.' : 'El link no es válido.') + '</p></div>').setTitle('Los Perrines');
}
function carritoDe(email) { hojaOk(H.carritos); email = String(email || '').toLowerCase(); return filas(H.carritos).filter(function (x) { return String(x.email).toLowerCase() === email; })[0]; }
function upsertCarrito(email, datos) {
  email = String(email || '').toLowerCase(); if (!emailOk(email)) return;
  var x = carritoDe(email);
  datos.actualizado = ahora();
  if (!x) { agregar(H.carritos, Object.assign({email: email, fecha: ahora(), estado: 'abierto', origen: 'carrito', recordatorio: '', segundo: ''}, datos)); return; }
  if (x.estado === 'compro' && datos.estado !== 'compro' && datos.estado !== 'pedido') return;
  setear(H.carritos, x._fila, datos);
}
function marcarCarritoPorPedido(id, estado) {
  try { hojaOk(H.carritos);
    filas(H.carritos).forEach(function (x) { if (String(x.pedido) === String(id) && x.estado !== 'compro') setear(H.carritos, x._fila, {estado: estado, actualizado: ahora()}); });
  } catch (e) {}
}
function guardarCarrito(r) {
  var email = limpiar(r.email, 100).toLowerCase();
  if (!emailOk(email) || dadoDeBaja(email)) return {};
  var x = carritoDe(email);
  if (x && (x.estado === 'pedido')) return {};
  var items = Array.isArray(r.items) ? r.items.filter(function (i) { return num(i.cantidad) > 0; }).map(function (i) { return {producto: i.producto === 'individual' ? 'individual' : 'doble', cantidad: Math.min(5, Math.floor(num(i.cantidad)))}; }) : [];
  upsertCarrito(email, {nombre: limpiar(r.nombre, 60), apellido: limpiar(r.apellido, 60), cel: limpiar(r.cel, 20), items: JSON.stringify(items), estado: 'abierto', origen: 'carrito'});
  return {};
}
function linkCarrito(itemsJson, extra) {
  var c = cfg(), its = []; try { its = JSON.parse(itemsJson || '[]'); } catch (e) {}
  var q = its.map(function (i) { return i.producto + ':' + i.cantidad; }).join(',');
  return (c.url_web || '').replace(/\/$/, '') + '/?carrito=' + encodeURIComponent(q) + (extra || '');
}
function enviarRecordatorios() {
  var c = cfg(), t = ahora().getTime(), H1 = 3600000;
  hojaOk(H.carritos);
  // 1 y 2: pedidos sin pagar
  filas(H.pedidos).forEach(function (p) {
    if (p.recordatorio || !emailOk(p.email) || dadoDeBaja(p.email)) return;
    var edad = t - new Date(p.fecha).getTime();
    if ((p.estado === 'reserva' || (p.estado === 'vencido' && p.pago === 'transferencia')) && edad >= 24 * H1) {
      enviar(p.email, 'Tu pedido ' + p.id + ' sigue reservado', plantilla('Tu funda te está esperando, ' + esc(p.nombre),
        '<p>Tu pedido <b>' + p.id + '</b> sigue reservado hasta el <b>' + fmtFecha(p.vence) + '</b>. Para confirmarlo, transferí <b>' + plata(p.total) + '</b>:</p>' +
        '<div style="background:#F7F8F3;border:1px dashed #D9DCCF;border-radius:12px;padding:14px;margin:14px 0">' + (c.alias ? 'Alias: <b>' + esc(c.alias) + '</b><br>' : '') + (c.cbu ? 'CBU/CVU: <b>' + esc(c.cbu) + '</b><br>' : '') + (c.titular ? 'Titular: ' + esc(c.titular) : '') + '</div>' +
        '<p>Después mandanos el comprobante por WhatsApp y despachamos tu pedido.</p>' + pieBaja(p.email), c), c);
      setear(H.pedidos, p._fila, {recordatorio: fmtFecha(ahora())});
    } else if ((p.estado === 'pendiente_mp' || (p.estado === 'vencido' && p.pago === 'tarjeta')) && edad >= H1) {
      var url = (c.url_web || '').replace(/\/$/, '') + '/?pedido=' + encodeURIComponent(p.id) + '&e=' + encodeURIComponent(p.email);
      enviar(p.email, '¿Tuviste algún problema con el pago?', plantilla('¿Pudiste terminar tu compra, ' + esc(p.nombre) + '?',
        '<p>Vimos que el pago de tu pedido <b>' + p.id + '</b> no se completó. Si tuviste algún problema, podés intentarlo de nuevo:</p>' + boton(url, 'Reintentar el pago') +
        pieBaja(p.email), c), c);
      setear(H.pedidos, p._fila, {recordatorio: fmtFecha(ahora())});
    }
  });
  // 3: datos cargados sin confirmar
  filas(H.carritos).forEach(function (x) {
    if (x.estado !== 'abierto' || x.recordatorio || dadoDeBaja(x.email)) return;
    if (t - new Date(x.actualizado).getTime() < 3 * H1) return;
    enviar(x.email, 'Te quedó una funda en el carrito 🐾', plantilla('¿Seguimos, ' + esc(x.nombre || '') + '?',
      '<p>Empezaste tu compra en Los Perrines y no llegaste a terminarla. Tu carrito te está esperando:</p>' + boton(linkCarrito(x.items), 'Volver a mi carrito') +
      '<p>Recordá: envío gratis a todo el país y hasta ' + (num(c.cuotas_max) || 3) + ' cuotas sin interés' + (num(c.precio_tarjeta) > num(c.precio_transferencia) ? ', o ' + Math.round((1 - num(c.precio_transferencia) / num(c.precio_tarjeta)) * 100) + '% off pagando por transferencia' : '') + '.</p>' + pieBaja(x.email), c), c);
    setear(H.carritos, x._fila, {recordatorio: fmtFecha(ahora())});
  });
}
// Un cliente se muestra SOLO despues de un primer correo enviado y registrado.
// Los pedidos pendientes se incluyen, aunque el carrito asociado este en estado 'pedido'.
function datosRecuperacion() {
  var c = cfg(); hojaOk(H.carritos); hojaOk(H.pedidos); hojaOk(H.bajas);
  var cs = filas(H.carritos), ps = filas(H.pedidos), bajas = {}, compraron = {}, porEmail = {};
  filas(H.bajas).forEach(function (x) { bajas[String(x.email || '').toLowerCase()] = true; });
  ps.forEach(function (p) { if (VENDIDO.indexOf(p.estado) >= 0) compraron[String(p.email || '').toLowerCase()] = true; });
  function incluir(em, dato) {
    if (!emailOk(em) || bajas[em] || compraron[em] || !dato.recordatorio) return;
    if (!porEmail[em] || dato._ts > porEmail[em]._ts) porEmail[em] = dato;
  }
  cs.forEach(function (x) {
    var em = String(x.email || '').trim().toLowerCase();
    if (!x.recordatorio || x.estado !== 'abierto') return;
    var fecha = x.actualizado || x.fecha, ts = new Date(fecha).getTime() || 0;
    incluir(em, {email:em, nombre:String(x.nombre||''), apellido:String(x.apellido||''), cel:String(x.cel||''),
      origen:'Carrito sin confirmar', items:textoItems({items:x.items,cantidad:1},c), fecha:fmtFecha(fecha),
      _ts:ts, recordatorio:String(x.recordatorio||''), segundo:String(x.segundo||''), pedido:''});
  });
  ps.forEach(function (p) {
    if (!p.recordatorio || ['reserva','pendiente_mp','vencido'].indexOf(p.estado) < 0) return;
    var em = String(p.email || '').trim().toLowerCase(), fecha = p.fecha, ts = new Date(fecha).getTime() || 0;
    var carrito = cs.filter(function (x) { return String(x.pedido||'') === String(p.id); })[0];
    incluir(em, {email:em, nombre:String(p.nombre||''), apellido:String(p.apellido||''),
      cel:String((p.cel_cod||'')+' '+(p.cel_num||'')).trim(),
      origen:p.pago === 'tarjeta' ? 'Tarjeta sin pagar' : 'Transferencia sin pagar',
      items:textoItems(p,c), fecha:fmtFecha(fecha), _ts:ts,
      recordatorio:String(p.recordatorio||''), segundo:String(carrito && carrito.segundo || ''), pedido:String(p.id)});
  });
  return {porEmail:porEmail, carritos:cs, pedidos:ps, compraron:compraron};
}
function listaRecuperar() {
  var d = datosRecuperacion(), lista = Object.keys(d.porEmail).map(function (em) { return d.porEmail[em]; });
  var st = {recordatorios:0, segundos:0, recuperadas:0};
  d.carritos.forEach(function (x) {
    if (x.recordatorio && x.estado === 'abierto') st.recordatorios++;
    if (x.segundo) st.segundos++;
    if ((x.recordatorio || x.segundo) && (x.estado === 'compro' || d.compraron[String(x.email||'').toLowerCase()])) st.recuperadas++;
  });
  d.pedidos.forEach(function (p) {
    if (p.recordatorio) { st.recordatorios++; if (VENDIDO.indexOf(p.estado) >= 0) st.recuperadas++; }
  });
  lista.sort(function (a,b) { return b._ts - a._ts; });
  return {lista:lista, stats:st, cupones:listaCupones()};
}
function enviarSegundo(r) {
  var c = cfg(), d = datosRecuperacion(), emails = (r.emails || []).map(function (e) { return String(e).trim().toLowerCase(); });
  var asunto = limpiar(r.asunto,120), msg = String(r.mensaje || '').slice(0,3000);
  if (!emails.length) throw new Error('Elegí al menos un destinatario.');
  if (!asunto || !msg.trim()) throw new Error('Completá el asunto y el mensaje.');
  var cup = r.cupon ? listaCupones().filter(function (x) { return x.codigo === String(r.cupon).toUpperCase() && x.activo; })[0] : null;
  if (r.cupon && !cup) throw new Error('El código promocional no está activo.');
  var n=0, vistos={};
  emails.forEach(function (em) {
    if (vistos[em]) return; vistos[em]=true;
    var dato=d.porEmail[em];
    if (!dato || dato.segundo || dadoDeBaja(em)) return;
    var x=carritoDe(em);
    var nombre=dato.nombre || (x && x.nombre) || '';
    var cuerpo=esc(msg.replace(/\{nombre\}/g,nombre)).replace(/\n/g,'<br>');
    var cupHtml=cup ? '<div style="background:#D9E15A;border-radius:12px;padding:14px;margin:16px 0;text-align:center"><div style="font-size:13px">Tu código de descuento</div><div style="font-size:26px;font-weight:bold;letter-spacing:2px">'+esc(cup.codigo)+'</div><div style="font-size:13px">'+cup.porcentaje+'% off extra pagando por transferencia'+(cup.vence?' · válido hasta el '+esc(cup.vence):'')+'</div></div>' : '';
    var items=x && x.items ? x.items : (dato.pedido ? JSON.stringify(itemsDe(d.pedidos.filter(function(p){return String(p.id)===dato.pedido;})[0])) : '[]');
    var url=linkCarrito(items,cup?'&cupon='+encodeURIComponent(cup.codigo):'');
    enviar(em,asunto,plantilla(esc(asunto),'<p>'+cuerpo+'</p>'+cupHtml+boton(url,'Ir a mi carrito')+pieBaja(em),c),c);
    // Solo se marca despues de que MailApp no haya reportado un error.
    var fecha=fmtFecha(ahora());
    if (x) setear(H.carritos,x._fila,{segundo:fecha});
    else if (dato.pedido) {
      // Permite el seguimiento de pedidos antiguos que no tienen fila en Carritos.
      agregar(H.carritos,{email:em,fecha:ahora(),actualizado:ahora(),nombre:dato.nombre,apellido:dato.apellido,
        cel:dato.cel,items:items,estado:'pedido',pedido:dato.pedido,origen:dato.origen,recordatorio:dato.recordatorio,segundo:fecha});
    }
    n++;
  });
  return {enviados:n};
}

/* ================= CÓDIGOS DE DESCUENTO ================= */
function listaCupones() {
  hojaOk(H.cupones);
  return filas(H.cupones).map(function (x) {
    var v = x.vence instanceof Date ? Utilities.formatDate(x.vence, TZ, 'dd/MM/yyyy') : String(x.vence || '');
    return {codigo: String(x.codigo).toUpperCase(), porcentaje: num(x.porcentaje), vence: v, unico: x.unico === 'SI', activo: x.activo !== 'NO'};
  });
}
function venceDate(v) { var m = String(v || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? new Date(+m[3], +m[2] - 1, +m[1], 23, 59, 59) : null; }
function validarCupon(codigo, email) {
  codigo = limpiar(codigo, 30).toUpperCase(); email = limpiar(email, 100).toLowerCase();
  if (!codigo) throw new Error('Escribí el código.');
  var x = listaCupones().filter(function (k) { return k.codigo === codigo; })[0];
  if (!x || !x.activo) throw new Error('El código no es válido.');
  var v = venceDate(x.vence); if (v && v < ahora()) throw new Error('El código está vencido.');
  if (x.unico && email) {
    var usado = filas(H.pedidos).some(function (p) { return String(p.cupon).toUpperCase() === codigo && String(p.email).toLowerCase() === email && ['cancelado','vencido'].indexOf(p.estado) < 0; });
    if (usado) throw new Error('Ya usaste este código.');
  }
  return {codigo: codigo, porcentaje: x.porcentaje};
}
function guardarCupon(r) {
  var cod = limpiar(r.codigo, 30).toUpperCase().replace(/[^A-Z0-9]/g, ''), pct = num(r.porcentaje);
  if (!cod) throw new Error('Poné un código (solo letras y números).');
  if (!(pct > 0 && pct < 100)) throw new Error('El porcentaje tiene que estar entre 1 y 99.');
  var vence = '';
  if (r.vence) { var m = String(r.vence).match(/^(\d{4})-(\d{2})-(\d{2})$/); vence = m ? m[3] + '/' + m[2] + '/' + m[1] : String(r.vence); }
  hojaOk(H.cupones); var sh = hoja(H.cupones); sh.getRange('C:C').setNumberFormat('@');
  var x = filas(H.cupones).filter(function (k) { return String(k.codigo).toUpperCase() === cod; })[0];
  var datos = {codigo: cod, porcentaje: pct, vence: vence, unico: r.unico ? 'SI' : 'NO', activo: r.activo === false ? 'NO' : 'SI'};
  if (x) setear(H.cupones, x._fila, datos); else agregar(H.cupones, Object.assign({creado: ahora()}, datos));
  return {};
}
function borrarCupon(codigo) {
  var x = filas(H.cupones).filter(function (k) { return String(k.codigo).toUpperCase() === String(codigo).toUpperCase(); })[0];
  if (x) hoja(H.cupones).deleteRow(x._fila);
  return {};
}

/* =====================================================================
 * TALLER: insumos, proveedores, fichas de producto, tandas, compras y pagos.
 * Cada operación escribe todo lo que corresponde en un solo paso (con lock),
 * así el stock de insumos, el de la tienda y lo que se debe a cada proveedor
 * no pueden quedar desparejos.
 * ===================================================================== */
var T = {prov: 'TallerProveedores', ins: 'TallerInsumos', fichas: 'TallerFichas', gastos: 'TallerGastos',
         tandas: 'TallerTandas', stock: 'TallerStock', compras: 'TallerCompras', pagos: 'TallerPagos'};
var PRODUCTOS_ID = ['doble', 'individual'];
var MEDIDAS_KEYS = ['an','t1','t2','t3','la','lb','nl','nc','tf','tr','sr','sl','re'];
var AUTOS = ['tela', 'correas', 'cinta'];

function asegurarHoja(n) {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(n);
  if (!sh) {
    sh = ss.insertSheet(n);
    sh.getRange(1, 1, 1, COLS[n].length).setValues([COLS[n]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function tFilas(n) { asegurarHoja(n); return filas(n); }
function agregarVarios(n, objs) {
  if (!objs.length) return;
  var sh = asegurarHoja(n), cols = COLS[n], start = sh.getLastRow() + 1;
  sh.getRange(start, 1, objs.length, cols.length).setValues(objs.map(function (o) {
    return cols.map(function (c) { return o[c] === undefined || o[c] === null ? '' : o[c]; });
  }));
}
function upsert(n, key, obj) {
  var x = tFilas(n).filter(function (r) { return String(r[key]) === String(obj[key]); })[0];
  if (x) setear(n, x._fila, obj); else agregar(n, obj);
}
function r3(x) { return Math.round(num(x) * 1000) / 1000; }
function nuevoId(pref) { return pref + '-' + Utilities.getUuid().slice(0, 8).toUpperCase(); }
function idOk(v, pref) { v = String(v || ''); return /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : nuevoId(pref); }
function jsonDe(v, def) { if (v === '' || v == null) return def; try { return JSON.parse(v); } catch (e) { return def; } }
function fechaDe(v) { var m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : ahora(); }
function iso(d) { return d ? Utilities.formatDate(new Date(d), TZ, 'yyyy-MM-dd') : ''; }
function existe(n, id) { return tFilas(n).some(function (r) { return String(r.id) === String(id); }); }
function prodOk(p) { if (PRODUCTOS_ID.indexOf(p) < 0) throw new Error('Producto desconocido: ' + p); return p; }

/* ---------- lectura ---------- */
function tallerDatos() {
  var c = cfg(), stockIns = {};
  var movs = tFilas(T.stock).map(function (m) {
    var k = String(m.insumo), q = r3(m.cantidad);
    stockIns[k] = r3((stockIns[k] || 0) + q);
    return {fecha: fmtFecha(m.fecha), _ts: new Date(m.fecha).getTime() || 0, insumo: k, cantidad: q, tipo: String(m.tipo), ref: String(m.ref), detalle: String(m.detalle)};
  });
  movs.sort(function (a, b) { return b._ts - a._ts; });
  var mix = {tarjeta: 0, transferencia: 0};
  filas(H.pedidos).forEach(function (p) { if (VENDIDO.indexOf(p.estado) >= 0) mix[p.pago === 'tarjeta' ? 'tarjeta' : 'transferencia'] += num(p.cantidad) || 1; });
  var claves = ['rollo_ancho','rollo_largo','margen_costura','comision_mp','rentabilidad_objetivo','mix_tarjeta','producto','producto2',
                'precio_tarjeta','precio_transferencia','precio2_tarjeta','precio2_transferencia','activo2','taller_migrado'], conf = {};
  claves.forEach(function (k) { var d = CONFIG_DEF.filter(function (x) { return x[0] === k; })[0]; conf[k] = c[k] != null && c[k] !== '' ? c[k] : (d ? d[1] : ''); });
  return {
    proveedores: tFilas(T.prov).map(function (p) { return {id: String(p.id), nombre: String(p.nombre), telefono: String(p.telefono), lugar: String(p.lugar), web: String(p.web), notas: String(p.notas), activo: p.activo !== 'NO'}; }),
    insumos: tFilas(T.ins).map(function (i) { return {id: String(i.id), nombre: String(i.nombre), descripcion: String(i.descripcion), proveedor: String(i.proveedor), envase: String(i.envase), contenido: num(i.contenido), unidad: String(i.unidad), precio: num(i.precio), minimo: num(i.minimo), activo: i.activo !== 'NO', actualizado: fmtFecha(i.actualizado), stock: stockIns[String(i.id)] || 0}; }),
    fichas: tFilas(T.fichas).map(function (f) { return {producto: String(f.producto), medidas: jsonDe(f.medidas, {}), receta: jsonDe(f.receta, []), confeccion: num(f.confeccion), envio: num(f.envio), otros: jsonDe(f.otros, []), notas: String(f.notas), actualizado: fmtFecha(f.actualizado), bolsa: jsonDe(f.bolsa, null)}; }),
    gastos: tFilas(T.gastos).map(function (g) { return {id: String(g.id), concepto: String(g.concepto), total: num(g.total), activo: g.activo !== 'NO'}; }),
    tandas: tFilas(T.tandas).map(function (t) { return {id: String(t.id), fecha: iso(t.fecha), estado: String(t.estado), items: jsonDe(t.items, []), recibido: jsonDe(t.recibido, {}), proveedor: String(t.proveedor), notas: String(t.notas)}; }).reverse(),
    compras: tFilas(T.compras).map(function (x) { return {id: String(x.id), fecha: iso(x.fecha), tipo: String(x.tipo), proveedor: String(x.proveedor), detalle: String(x.detalle), items: jsonDe(x.items, []), total: num(x.total), ref: String(x.ref), notas: String(x.notas)}; }).reverse(),
    pagos: tFilas(T.pagos).map(function (x) { return {id: String(x.id), fecha: iso(x.fecha), proveedor: String(x.proveedor), monto: num(x.monto), medio: String(x.medio), nota: String(x.nota), compra: String(x.compra)}; }).reverse(),
    movimientos: movs.slice(0, 500),
    config: conf, productos: productos(c), stockTienda: stock(), ventas: mix,
    version: 5,
    viejos: {costos: !!leerDoc('Costos'), insumos: !!leerDoc('Insumos'), pagos: !!leerDoc('Pagos'), corte: !!leerDoc('Corte')}
  };
}

/* ---------- validación ---------- */
function sanProv(d, todos) {
  var o = {id: idOk(d.id, 'PV'), nombre: limpiar(d.nombre, 60), telefono: limpiar(d.telefono, 30), lugar: limpiar(d.lugar, 60),
           web: limpiar(d.web, 120), notas: limpiar(d.notas, 300), activo: d.activo === false ? 'NO' : 'SI'};
  if (!o.nombre) throw new Error('Poné el nombre del proveedor.');
  if ((todos || []).some(function (p) { return String(p.id) !== o.id && String(p.nombre).toLowerCase() === o.nombre.toLowerCase(); })) throw new Error('Ya hay un proveedor que se llama ' + o.nombre + '.');
  return o;
}
function sanIns(d) {
  var o = {id: idOk(d.id, 'IN'), nombre: limpiar(d.nombre, 80), descripcion: limpiar(d.descripcion, 200), proveedor: limpiar(d.proveedor, 40),
           envase: limpiar(d.envase, 30) || 'unidad', contenido: r3(d.contenido), unidad: limpiar(d.unidad, 10) || 'u',
           precio: Math.max(0, num(d.precio)), minimo: Math.max(0, r3(d.minimo)), activo: d.activo === false ? 'NO' : 'SI', actualizado: ahora()};
  if (!o.nombre) throw new Error('Poné el nombre del insumo.');
  if (!(o.contenido > 0)) throw new Error('Cargá cuánto trae cada ' + o.envase + ' (mayor a cero).');
  return o;
}
function sanFicha(d) {
  var med = {}, src = d.medidas || {};
  MEDIDAS_KEYS.forEach(function (k) { if (src[k] !== undefined && src[k] !== '') med[k] = r3(src[k]); });
  var receta = (Array.isArray(d.receta) ? d.receta : []).slice(0, 40).map(function (x) {
    var auto = AUTOS.indexOf(x.auto) >= 0 ? x.auto : '';
    var manual = x.uso === '' || x.uso == null ? null : r3(x.uso);
    if (!auto && manual == null) manual = 0;
    return {insumo: limpiar(x.insumo, 40), auto: auto, uso: manual};
  }).filter(function (x) { return x.insumo; });
  var otros = (Array.isArray(d.otros) ? d.otros : []).slice(0, 20).map(function (x) { return {concepto: limpiar(x.concepto, 80), monto: num(x.monto)}; }).filter(function (x) { return x.concepto; });
  return {producto: prodOk(d.producto), medidas: JSON.stringify(med), receta: JSON.stringify(receta), confeccion: Math.max(0, num(d.confeccion)),
          envio: Math.max(0, num(d.envio)), otros: JSON.stringify(otros), notas: limpiar(d.notas, 300), actualizado: ahora(),
          bolsa: d.bolsa ? JSON.stringify(sanBolsa(d.bolsa)) : ''};
}
/* Bolsa de guardado: una pieza de tela doblada, con sus insumos (tela, hilo, cierre…) y agregados (sublimación, etc.). */
function sanBolsa(b) {
  var calcs = ['tela', 'abertura', 'fija'];
  return {
    activa: b.activa !== false, ancho: Math.max(0, r3(b.ancho)), alto: Math.max(0, r3(b.alto)), costura: Math.max(0, r3(b.costura)), rollo: Math.max(0, r3(b.rollo)),
    items: (Array.isArray(b.items) ? b.items : []).slice(0, 20).map(function (x) {
      return {insumo: limpiar(x.insumo, 40), calc: calcs.indexOf(x.calc) >= 0 ? x.calc : 'fija', uso: x.uso === '' || x.uso == null ? null : r3(x.uso)};
    }).filter(function (x) { return x.insumo; }),
    confeccion: Math.max(0, num(b.confeccion)),
    servicios: (Array.isArray(b.servicios) ? b.servicios : []).slice(0, 10).map(function (x) { return {concepto: limpiar(x.concepto, 60), monto: Math.max(0, num(x.monto))}; }).filter(function (x) { return x.concepto; })
  };
}
function sanGasto(d) {
  var o = {id: idOk(d.id, 'GA'), concepto: limpiar(d.concepto, 80), total: Math.max(0, num(d.total)), activo: d.activo === false ? 'NO' : 'SI'};
  if (!o.concepto) throw new Error('Poné el concepto del gasto.');
  return o;
}

/* ---------- catálogo ---------- */
function tallerGuardar(r) {
  var d = r.data || {}, o;
  if (r.tipo === 'proveedor') { o = sanProv(d, tFilas(T.prov)); upsert(T.prov, 'id', o); }
  else if (r.tipo === 'insumo') { o = sanIns(d); upsert(T.ins, 'id', o); }
  else if (r.tipo === 'ficha') { o = sanFicha(d); upsert(T.fichas, 'producto', o); }
  else if (r.tipo === 'gasto') { o = sanGasto(d); upsert(T.gastos, 'id', o); }
  else throw new Error('Tipo desconocido.');
  return {id: o.id || o.producto};
}
function tallerBorrar(r) {
  var id = String(r.id || ''), n = r.tipo === 'proveedor' ? T.prov : r.tipo === 'insumo' ? T.ins : r.tipo === 'gasto' ? T.gastos : null;
  if (!n) throw new Error('Tipo desconocido.');
  var x = tFilas(n).filter(function (f) { return String(f.id) === id; })[0];
  if (!x) throw new Error('No lo encontré.');
  var usado = false;
  if (r.tipo === 'insumo') usado = tFilas(T.stock).some(function (m) { return String(m.insumo) === id; }) ||
    tFilas(T.fichas).some(function (f) { return jsonDe(f.receta, []).some(function (e) { return e.insumo === id; }); });
  if (r.tipo === 'proveedor') usado = tFilas(T.ins).some(function (i) { return String(i.proveedor) === id; }) ||
    tFilas(T.compras).some(function (c) { return String(c.proveedor) === id; }) || tFilas(T.pagos).some(function (p) { return String(p.proveedor) === id; });
  if (usado) { setear(n, x._fila, {activo: 'NO'}); return {archivado: true}; }
  hoja(n).deleteRow(x._fila);
  return {borrado: true};
}

/* ---------- stock de insumos ---------- */
function stockAjuste(r) {
  var id = String(r.insumo || ''), q = r3(r.cantidad), det = limpiar(r.detalle, 150);
  if (!existe(T.ins, id)) throw new Error('No existe ese insumo.');
  if (!q) throw new Error('La cantidad no puede ser cero.');
  if (!det) throw new Error('Escribí el motivo del ajuste.');
  agregar(T.stock, {fecha: ahora(), insumo: id, cantidad: q, tipo: r.tipo === 'inicial' ? 'inicial' : 'ajuste', ref: '', detalle: det});
  return {};
}

/* ---------- compras y pagos ---------- */
function idCompra() { return 'C-' + Utilities.formatDate(ahora(), TZ, 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 4).toUpperCase(); }
function compraRegistrar(r) {
  var prov = String(r.proveedor || '');
  if (!existe(T.prov, prov)) throw new Error('Elegí el proveedor.');
  var ins = {}; tFilas(T.ins).forEach(function (i) { ins[String(i.id)] = i; });
  var items = (Array.isArray(r.items) ? r.items : []).map(function (x) {
    var i = ins[String(x.insumo)]; if (!i) throw new Error('Hay un insumo que no existe en el catálogo.');
    var env = r3(x.envases), pr = Math.max(0, num(x.precio));
    if (!(env > 0)) return null;
    return {insumo: String(i.id), nombre: String(i.nombre), envases: env, precio: pr, cantidad: r3(env * num(i.contenido)), unidad: String(i.unidad), envase: String(i.envase), _fila: i._fila, _precioAnt: num(i.precio)};
  }).filter(Boolean);
  var extra = Math.max(0, num(r.extra)), total = items.reduce(function (a, x) { return a + x.envases * x.precio; }, 0) + extra;
  if (!items.length && !(num(r.total) > 0)) throw new Error('Cargá al menos un insumo o un monto.');
  if (!items.length) total = num(r.total);
  var tipo = items.length ? 'insumos' : (r.tipo === 'confeccion' ? 'confeccion' : 'otro');
  var id = idCompra(), fecha = fechaDe(r.fecha);
  var detalle = limpiar(r.detalle, 200) || items.map(function (x) { return x.nombre + ' ' + x.envases + ' ' + x.envase; }).join(', ');
  agregar(T.compras, {id: id, fecha: fecha, tipo: tipo, proveedor: prov, detalle: detalle,
    items: JSON.stringify(items.map(function (x) { return {insumo: x.insumo, envases: x.envases, precio: x.precio, cantidad: x.cantidad}; }).concat(extra ? [{extra: extra}] : [])),
    total: Math.round(total), ref: limpiar(r.ref, 40), notas: limpiar(r.notas, 300)});
  agregarVarios(T.stock, items.map(function (x) { return {fecha: fecha, insumo: x.insumo, cantidad: x.cantidad, tipo: 'compra', ref: id, detalle: x.envases + ' × ' + x.envase + ' a ' + plata(x.precio)}; }));
  if (r.actualizarPrecios !== false) items.forEach(function (x) { if (x.precio > 0 && x.precio !== x._precioAnt) setear(T.ins, x._fila, {precio: x.precio, actualizado: ahora()}); });
  var pagado = Math.max(0, num(r.pagado));
  if (pagado > 0) agregar(T.pagos, {id: nuevoId('PG'), fecha: fecha, proveedor: prov, monto: Math.min(pagado, Math.round(total)) || pagado, medio: limpiar(r.medio, 30) || 'Transferencia', nota: 'Pago de la compra ' + id, compra: id});
  return {id: id, total: Math.round(total)};
}
function compraAnular(r) {
  var x = tFilas(T.compras).filter(function (c) { return String(c.id) === String(r.id); })[0];
  if (!x) throw new Error('No encontré esa compra.');
  if (tFilas(T.pagos).some(function (p) { return String(p.compra) === String(x.id); })) throw new Error('Esta compra tiene pagos asociados. Borrá primero los pagos.');
  var movs = tFilas(T.stock).filter(function (m) { return String(m.ref) === String(x.id) && m.tipo === 'compra'; });
  agregarVarios(T.stock, movs.map(function (m) { return {fecha: ahora(), insumo: String(m.insumo), cantidad: -r3(m.cantidad), tipo: 'anulación', ref: String(x.id), detalle: 'Compra anulada'}; }));
  hoja(T.compras).deleteRow(x._fila);
  return {};
}
function pagoRegistrar(r) {
  var prov = String(r.proveedor || ''), m = Math.round(num(r.monto));
  if (!existe(T.prov, prov)) throw new Error('Elegí el proveedor.');
  if (!(m > 0)) throw new Error('Poné un monto mayor a cero.');
  agregar(T.pagos, {id: nuevoId('PG'), fecha: fechaDe(r.fecha), proveedor: prov, monto: m, medio: limpiar(r.medio, 30) || 'Transferencia', nota: limpiar(r.nota, 150), compra: limpiar(r.compra, 40)});
  return {};
}
function pagoBorrar(r) {
  var x = tFilas(T.pagos).filter(function (p) { return String(p.id) === String(r.id); })[0];
  if (!x) throw new Error('No encontré ese pago.');
  hoja(T.pagos).deleteRow(x._fila);
  return {};
}

/* ---------- tandas de producción ---------- */
function sanItems(lista) {
  var out = {};
  (Array.isArray(lista) ? lista : []).forEach(function (x) { var p = prodOk(x.producto), q = Math.max(0, Math.min(1000, Math.floor(num(x.cantidad)))); if (q) out[p] = (out[p] || 0) + q; });
  var items = Object.keys(out).map(function (p) { return {producto: p, cantidad: out[p]}; });
  if (!items.length) throw new Error('Poné cuántas fundas tiene la tanda.');
  return items;
}
function tandaCrear(r) {
  var items = sanItems(r.items), estado = r.estado === 'planificada' ? 'planificada' : 'en_confeccion';
  var pref = 'T-' + Utilities.formatDate(ahora(), TZ, 'yyMMdd') + '-', n = 0;
  tFilas(T.tandas).forEach(function (t) { var s = String(t.id); if (s.indexOf(pref) === 0) n = Math.max(n, num(s.slice(pref.length))); });
  var id = pref + (n + 1);
  agregar(T.tandas, {id: id, fecha: fechaDe(r.fecha), estado: estado, items: JSON.stringify(items), recibido: '{}', proveedor: limpiar(r.proveedor, 40), notas: limpiar(r.notas, 300), actualizado: ahora()});
  return {id: id};
}
function tanda(id) { var t = tFilas(T.tandas).filter(function (x) { return String(x.id) === String(id); })[0]; if (!t) throw new Error('No encontré la tanda ' + id); return t; }
function tandaEstado(r) {
  var t = tanda(r.id), de = String(t.estado), a = String(r.estado);
  var ok = {planificada: ['en_confeccion', 'cancelada'], en_confeccion: ['planificada', 'cancelada', 'recibida']}[de] || [];
  if (ok.indexOf(a) < 0) throw new Error('No se puede pasar de ' + de + ' a ' + a + '.');
  if (a === 'planificada' && Object.keys(jsonDe(t.recibido, {})).length) throw new Error('Ya recibiste fundas de esta tanda.');
  var cambios = {estado: a, actualizado: ahora()};
  if (r.items) cambios.items = JSON.stringify(sanItems(r.items));
  if (r.proveedor != null) cambios.proveedor = limpiar(r.proveedor, 40);
  if (r.notas != null) cambios.notas = limpiar(r.notas, 300);
  setear(T.tandas, t._fila, cambios);
  return {};
}
function tandaRecibir(r) {
  var t = tanda(r.id);
  if (t.estado !== 'en_confeccion') throw new Error('Solo se reciben fundas de una tanda en confección.');
  var rec = {}, total = 0;
  PRODUCTOS_ID.forEach(function (p) { var q = Math.max(0, Math.floor(num((r.recibido || {})[p]))); if (q) { rec[p] = q; total += q; } });
  if (!total && !r.cerrar) throw new Error('Poné cuántas fundas recibiste.');
  var ins = {}; tFilas(T.ins).forEach(function (i) { ins[String(i.id)] = 1; });
  var cons = (Array.isArray(r.consumos) ? r.consumos : []).map(function (x) { return {insumo: String(x.insumo), cantidad: r3(x.cantidad)}; })
    .filter(function (x) { if (!ins[x.insumo]) throw new Error('Hay un insumo de la receta que no existe.'); return x.cantidad > 0; });
  var fecha = ahora(), desc = PRODUCTOS_ID.filter(function (p) { return rec[p]; }).map(function (p) { return rec[p] + ' ' + (p === 'doble' ? 'doble' : 'individual') + (rec[p] > 1 ? 's' : ''); }).join(' + ');
  agregarVarios(T.stock, cons.map(function (x) { return {fecha: fecha, insumo: x.insumo, cantidad: -x.cantidad, tipo: 'consumo', ref: String(t.id), detalle: 'Tanda ' + t.id + ': ' + desc}; }));
  agregarVarios(H.mov, PRODUCTOS_ID.filter(function (p) { return rec[p]; }).map(function (p) { return {fecha: fecha, tipo: 'ingreso', cantidad: rec[p], motivo: 'Tanda ' + t.id + ' recibida', producto: p}; }));
  var conf = r.confeccion || {}, monto = Math.round(num(conf.total));
  if (monto > 0) {
    if (!existe(T.prov, conf.proveedor)) throw new Error('Elegí quién confeccionó.');
    agregar(T.compras, {id: idCompra(), fecha: fecha, tipo: 'confeccion', proveedor: String(conf.proveedor), detalle: 'Confección ' + desc + ' (tanda ' + t.id + ')', items: '[]', total: monto, ref: String(t.id), notas: ''});
  }
  var acum = jsonDe(t.recibido, {});
  Object.keys(rec).forEach(function (p) { acum[p] = (acum[p] || 0) + rec[p]; });
  var completa = sanItems(jsonDe(t.items, [])).every(function (it) { return (acum[it.producto] || 0) >= it.cantidad; });
  setear(T.tandas, t._fila, {recibido: JSON.stringify(acum), estado: (r.cerrar || completa) ? 'recibida' : 'en_confeccion', actualizado: ahora()});
  return {recibidas: total, cerrada: !!(r.cerrar || completa)};
}

/* ---------- migración desde las herramientas viejas ---------- */
function tallerMigrar(r) {
  var d = r.data || {};
  if (!r.forzar && (tFilas(T.ins).length || tFilas(T.fichas).length)) throw new Error('El taller ya tiene datos. No importé nada para no duplicar.');
  var provs = [], vistos = [];
  (d.proveedores || []).forEach(function (p) { var o = sanProv(p, vistos); vistos.push(o); provs.push(o); });
  agregarVarios(T.prov, provs);
  agregarVarios(T.ins, (d.insumos || []).map(sanIns));
  agregarVarios(T.fichas, (d.fichas || []).map(sanFicha));
  agregarVarios(T.gastos, (d.gastos || []).map(sanGasto));
  agregarVarios(T.stock, (d.stock || []).filter(function (x) { return r3(x.cantidad); }).map(function (x) { return {fecha: ahora(), insumo: String(x.insumo), cantidad: r3(x.cantidad), tipo: 'inicial', ref: '', detalle: limpiar(x.detalle, 150) || 'Stock inicial (importado)'}; }));
  agregarVarios(T.compras, (d.compras || []).map(function (x) { return {id: idOk(x.id, 'C'), fecha: fechaDe(x.fecha), tipo: 'otro', proveedor: String(x.proveedor), detalle: limpiar(x.detalle, 200), items: '[]', total: Math.round(num(x.total)), ref: '', notas: limpiar(x.notas, 300)}; }));
  agregarVarios(T.pagos, (d.pagos || []).filter(function (x) { return num(x.monto) > 0; }).map(function (x) { return {id: idOk(x.id, 'PG'), fecha: fechaDe(x.fecha), proveedor: String(x.proveedor), monto: Math.round(num(x.monto)), medio: limpiar(x.medio, 30), nota: limpiar(x.nota, 150), compra: limpiar(x.compra, 40)}; }));
  var conf = {}; Object.keys(d.config || {}).forEach(function (k) { if (['rollo_ancho','rollo_largo','margen_costura','comision_mp','rentabilidad_objetivo','mix_tarjeta'].indexOf(k) >= 0) conf[k] = String(num(d.config[k])); });
  conf.taller_migrado = fmtFecha(ahora());
  guardarConfig(conf);
  if (d.tanda && d.tanda.items) tandaCrear(d.tanda);
  return {proveedores: provs.length, insumos: (d.insumos || []).length};
}
