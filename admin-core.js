/* Núcleo del panel: sesión, datos, navegación y las vistas de ventas y tienda.
   El taller (insumos, productos, tandas, proveedores, rentabilidad) está en admin-taller.js. */
window.LP=(function(){
"use strict";
var LOGO='<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="20" fill="#4E5B3A"/><ellipse cx="20" cy="25" rx="7" ry="6" fill="#D9E15A"/><circle cx="12" cy="16" r="3.2" fill="#D9E15A"/><circle cx="18" cy="11.5" r="3.2" fill="#D9E15A"/><circle cx="25" cy="12" r="3.2" fill="#D9E15A"/><circle cx="29.5" cy="17.5" r="3.2" fill="#D9E15A"/></svg>';
var fmt=new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0});
var QF=new Intl.NumberFormat("es-AR",{maximumFractionDigits:2});
function money(v){return fmt.format(Math.round(v||0));}
function q(v){return QF.format(Math.round((+v||0)*100)/100+0);}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function $(s,r){return (r||document).querySelector(s);}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
function nd(v){var s=String(v==null?"":v).trim(); if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s=s.replace(/\./g,""); var x=parseFloat(s.replace(",","."));return isFinite(x)?x:0;}
function qi(v){ return String(Math.round((+v||0)*100)/100).replace(".",","); }
function nm(v){var x=parseFloat(String(v==null?"":v).replace(/\./g,"").replace(",","."));return isFinite(x)?x:0;}
function toast(t,ms){var e=$("#toast");e.textContent=t;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(function(){e.classList.remove("show");},ms||2800);}
var S={token:sessionStorage.getItem("lp_token")||"", view:(location.hash||"#inicio").slice(1), filtro:"activos", data:null, taller:null, tallerError:"", menu:false};
var LABEL={reserva:"Reservado · espera transferencia",pendiente_mp:"Esperando pago con tarjeta",pagado:"Pagado · listo para exportar",exportado:"Exportado · falta el seguimiento",despachado:"Despachado",vencido:"Reserva vencida",cancelado:"Cancelado"};

function api(accion,data){
  var body=Object.assign({accion:accion,token:S.token},data||{});
  return fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(body)})
    .then(function(r){return r.json();}).then(function(j){
      if(!j.ok){ if(j.error==="SESION"){ salir(); throw new Error("Tu sesión venció. Volvé a entrar."); } throw new Error(j.error||"Error"); }
      return j; });
}
function salir(){ S.token=""; sessionStorage.removeItem("lp_token"); S.data=null; S.taller=null; render(); }
function cargarTaller(){
  return api("taller").then(function(t){ S.taller=t; S.tallerError=""; })
    .catch(function(e){ S.taller=null; S.tallerError=/desconocida/i.test(e.message)?"backend":e.message; });
}
function cargar(msg){
  return Promise.all([api("resumen").then(function(d){ S.data=d; }),cargarTaller()])
    .then(function(){ render(); if(msg) toast(msg); }).catch(function(e){ toast(e.message); });
}
function accion(nombre,datos,msg,btn){
  if(btn){ btn.disabled=true; btn.dataset.txt=btn.innerHTML; btn.innerHTML='<span class="spinner"></span>'; }
  return api(nombre,datos).then(function(r){ return cargar(msg).then(function(){return r;}); })
    .catch(function(e){ toast(e.message,4500); if(btn&&document.body.contains(btn)){ btn.disabled=false; btn.innerHTML=btn.dataset.txt; } });
}
function dlg(html,wide){
  var d=$("#dlg"), yaAbierto=d.open; d.className=wide?"wide":""; $("#dlgIn").innerHTML=html; if(!yaAbierto) d.showModal();
  // el cursor va al primer campo solo cuando la ventana se abre, nunca al actualizarla mientras escribís
  var f=$("#dlgIn input:not([type=checkbox]),#dlgIn select"); if(f&&!wide&&!yaAbierto) setTimeout(function(){ if(document.activeElement===document.body||!$("#dlgIn").contains(document.activeElement)) try{f.focus();}catch(e){} },40);
}
function cerrarDlg(){ var d=$("#dlg"); if(d.open) d.close(); }

/* ---------- navegación ---------- */
var VIEWS={}, ORDEN=[];
function vista(id,grupo,titulo,fn,badge){ VIEWS[id]={id:id,grupo:grupo,titulo:titulo,fn:fn,badge:badge}; ORDEN.push(id); }
function ir(v){ if(!VIEWS[v]) v="inicio"; S.view=v; S.menu=false; if(location.hash!=="#"+v) history.replaceState(null,"","#"+v); render(); window.scrollTo(0,0); }

function render(){
  var r=$("#root");
  if(!/^https:\/\/script\.google\.com\//.test(API)){ r.innerHTML='<div class="login"><form><h1>Los Perrines</h1><p>Falta configurar la dirección del Apps Script en este archivo (variable API).</p></form></div>'; return; }
  if(!S.token){
    r.innerHTML='<div class="login"><form id="login"><h1>Los Perrines</h1><p>Panel de administración</p>'
      +'<label class="f">Contraseña<input type="password" id="pw" autocomplete="current-password" required></label>'
      +'<button class="btn main big" style="width:100%" id="loginBtn">Entrar</button><p class="err" id="lerr"></p></form></div>';
    return;
  }
  if(!S.data){ r.innerHTML='<div style="min-height:100vh;display:grid;place-items:center"><span class="spinner"></span></div>'; cargar(); return; }
  if(!VIEWS[S.view]) S.view="inicio";
  var V=VIEWS[S.view], grupos=[], gi={};
  ORDEN.forEach(function(id){ var x=VIEWS[id]; if(!gi.hasOwnProperty(x.grupo)){ gi[x.grupo]=grupos.length; grupos.push({n:x.grupo,v:[]}); } grupos[gi[x.grupo]].v.push(x); });
  var nav='<div class="brand">'+LOGO+'<span>Los Perrines<small>Administración</small></span></div>'
    +grupos.map(function(g){ return (g.n?'<div class="ngroup">'+esc(g.n)+'</div>':'')+g.v.map(function(x){ var b=x.badge?x.badge():null;
      return '<button class="nlink" data-go="'+x.id+'"'+(x.id===S.view?' aria-current="page"':'')+'><span>'+esc(x.titulo)+'</span>'+(b&&b.n?'<span class="pill'+(b.bad?' bad':'')+'">'+b.n+'</span>':'')+'</button>'; }).join(""); }).join("")
    +'<div class="foot"><button class="btn ghost sm" data-a="refrescar">↻ Actualizar</button><button class="btn ghost sm" data-a="salir">Salir</button></div>'
    +(window.PANEL_VERSION?'<div class="muted small" style="padding:8px 4px 0">Versión del panel: '+esc(window.PANEL_VERSION)+'</div>':'');
  var body; try{ body=V.fn(S.data); }catch(e){ console.error(e); body='<div class="note bad">No pude mostrar esta sección: '+esc(e.message)+'</div>'; }
  var a=document.activeElement, fid=a&&a.id, pos=null; try{ pos=a&&a.selectionStart; }catch(e){}
  var navAnt=$("aside.nav"), navY=navAnt?navAnt.scrollTop:0;   // el menú queda donde estaba
  var y=window.scrollY;
  r.innerHTML='<div class="shell'+(S.menu?' menu':'')+'"><aside class="nav" aria-label="Secciones">'+nav+'</aside><div style="min-width:0">'
    +'<div class="topm"><button class="btn ghost sm" data-a="menu" aria-label="Abrir menú">☰ Menú</button><b>'+esc(V.titulo)+'</b><button class="btn ghost sm" data-a="refrescar" aria-label="Actualizar">↻</button></div>'
    +'<main id="main">'+body+'</main></div></div>';
  var navN=$("aside.nav"); if(navN) navN.scrollTop=navY;
  if(fid){ var el=document.getElementById(fid); if(el){ el.focus({preventScroll:true}); try{ if(pos!=null) el.setSelectionRange(pos,pos); }catch(e){} } }
  window.scrollTo(0,y);
}
/* re-render parcial de la sección actual (mantiene foco) */
function refrescar(){ render(); }

/* ---------- vistas de ventas y tienda ---------- */
function nombreProd(d,id){ var p=(d.productos||[]).filter(function(x){return x.id===id;})[0]; return p?p.nombre:(id==="individual"?"Individual":"Doble"); }
function idsActivos(d){ var ids=["doble"]; if(d.config.activo2==="SI"||(d.stock.individual&&d.stock.individual.ingresado>0)) ids.push("individual"); return ids; }
function heroes(d){ var min=Number(d.config.stock_minimo);
  return idsActivos(d).map(function(id){ return '<h3 style="margin:14px 0 8px">'+esc(nombreProd(d,id))+'</h3>'+stockHero(d.stock[id],min); }).join(""); }
function stockHero(s,min){
  var tot=Math.max(s.ingresado+s.ajustes,1);
  return '<div class="stock"><div class="avail"><b>'+Math.max(0,s.disponible)+'</b><span>disponibles para vender</span></div><div>'
    +'<div class="meter" aria-hidden="true"><i style="width:'+(s.vendidas/tot*100)+'%;background:#F2F3EC"></i><i style="width:'+(s.reservadas/tot*100)+'%;background:#E3A84B"></i><i style="width:'+(Math.max(0,s.disponible)/tot*100)+'%;background:#D9E15A"></i></div>'
    +'<div class="legend"><span style="--c:#F2F3EC">'+s.vendidas+' vendidas</span><span style="--c:#E3A84B">'+s.reservadas+' reservadas</span><span style="--c:#D9E15A">'+Math.max(0,s.disponible)+' disponibles</span><span style="--c:transparent">'+s.ingresado+' ingresadas'+(s.ajustes?', '+s.ajustes+' por ajustes':'')+'</span></div>'
    +(s.ingresado>0&&s.disponible<=min?'<div class="alert">Quedan '+Math.max(0,s.disponible)+' unidades. Es momento de planificar la próxima tanda.</div>':'')
    +(s.ingresado===0?'<div class="alert">Todavía no hay fundas en stock. Cuando recibas una tanda en Taller → Tandas, se suman solas.</div>':'')
    +'</div></div>';
}
function vInicio(d){
  var c=d.config, abierta=c.tienda_abierta==="SI", v=d.ventasMes, P=d.pedidos;
  var h='<div class="ph"><div><h2>Inicio</h2><p class="sub">Lo que pasa hoy en la tienda y en el taller.</p></div></div>'
    +'<div class="block store" style="margin-top:0"><div><b><span class="dot" style="background:'+(abierta?'var(--ok)':'var(--bad)')+'"></span>Tienda '+(abierta?'abierta al público':'cerrada')+'</b>'
    +'<div class="muted small" style="margin-top:4px">'+(abierta?'Cualquiera puede comprar en la web.':'El público ve "Muy pronto". Vos la ves con el link de vista previa.')+'</div></div>'
    +'<button class="btn '+(abierta?'ghost':'main')+'" data-a="tienda" data-v="'+(abierta?'NO':'SI')+'">'+(abierta?'Cerrar tienda':'Abrir tienda')+'</button></div>'
    +(!abierta?'<div class="block"><h3>Link de vista previa</h3><div class="copy">'+esc(d.urlVista)+'</div><p class="muted small" style="margin:8px 0 0">Abrilo en tu celular para ver y probar la tienda completa. Las compras que hagas son reales.</p></div>':'');
  var disp=idsActivos(d).map(function(id){ return {id:id,s:d.stock[id]}; });
  h+='<div class="cards">'+disp.map(function(x){ var s=x.s, bajo=s.ingresado>0&&s.disponible<=Number(c.stock_minimo); return '<div class="kpi'+(bajo?' warn':'')+'"><small>'+esc(nombreProd(d,x.id))+' en stock</small><b>'+Math.max(0,s.disponible)+'</b><span class="k2">'+s.reservadas+' reservadas · '+s.vendidas+' vendidas</span></div>'; }).join("")
    +'<div class="kpi"><small>Vendidas este mes</small><b>'+v.unidades+'</b><span class="k2">'+money(v.total)+' cobrado</span></div>'
    +'<div class="kpi"><small>Cobrado este mes</small><b>'+money(v.total)+'</b><span class="k2">'+money(v.transferencia)+' transf. · '+money(v.tarjeta)+' tarjeta</span></div></div>';
  var res=P.filter(function(p){return p.estado==="reserva";}).length, pag=P.filter(function(p){return p.estado==="pagado";}).length, exp=P.filter(function(p){return p.estado==="exportado";}).length;
  var todo=[];
  var falta=[]; if(!c.alias&&!c.cbu) falta.push("alias o CBU"); if(!c.email_aviso) falta.push("tu email"); if(!c.whatsapp||c.whatsapp.length<8) falta.push("WhatsApp"); if(!d.tokenMP) falta.push("token de Mercado Pago"); if(!c.plantilla_andreani_id) falta.push("plantilla de Andreani");
  if(falta.length) todo.push(['bad','Falta configurar: '+falta.join(", ")+'.','config','Configurar']);
  if(res) todo.push(['warn',res+' transferencia'+(res>1?'s':'')+' esperando pago.','pedidos','Ver',"reserva"]);
  if(pag) todo.push(['warn',pag+' pedido'+(pag>1?'s':'')+' pagado'+(pag>1?'s':'')+' para exportar a Andreani.','envios','Exportar']);
  if(exp) todo.push(['info',exp+' envío'+(exp>1?'s':'')+' exportado'+(exp>1?'s':'')+' sin número de seguimiento.','envios','Cargar']);
  if(d.avisos.length && (d.stock.doble.disponible>0||d.stock.individual.disponible>0)) todo.push(['info',d.avisos.length+' persona'+(d.avisos.length>1?'s':'')+' esperan aviso de stock.','stock','Ver']);
  if(window.TALLER) todo=todo.concat(TALLER.pendientes());
  h+='<div class="block"><h3>Para hacer</h3>'+(todo.length?'<ul class="todo">'+todo.map(function(t){ return '<li class="'+t[0]+'"><span>'+esc(t[1])+'</span><button class="btn ghost sm" data-go="'+t[2]+'"'+(t[4]?' data-f="'+t[4]+'"':'')+'>'+esc(t[3])+'</button></li>'; }).join("")+'</ul>':'<p class="muted" style="margin:0">Todo al día.</p>')+'</div>';
  if(window.TALLER) h+=TALLER.inicio();
  return h;
}
function tarjetaPedido(p){
  var dest=p.entrega==="sucursal"?'Retira en sucursal '+p.sucursal:(p.calle+' '+p.numero+(p.piso?' piso '+p.piso:'')+(p.depto?' '+p.depto:'')+' · '+p.prov_loc_cp);
  var acts='';
  if(p.estado==="reserva"||p.estado==="vencido"||p.estado==="pendiente_mp"){
    if(p.estado==="reserva"){ var hs=Math.max(0,Math.ceil((p._vence_ts-Date.now())/3600000)); acts+='<span class="muted small">Vence en '+hs+' h</span>'; }
    acts+='<button class="btn main" data-a="pagado" data-id="'+esc(p.id)+'">Marcar como pagado</button><button class="btn ghost" data-a="cancelar" data-id="'+esc(p.id)+'">Cancelar</button>';
  }
  if(p.estado==="pagado"||p.estado==="exportado"){
    acts+='<div class="inline" style="width:100%"><input class="inp" inputmode="numeric" placeholder="N° de seguimiento Andreani" id="tr-'+esc(p.id)+'"><button class="btn main" data-a="despachar" data-id="'+esc(p.id)+'">Despachar</button></div>';
  }
  if(["reserva","pagado","exportado","despachado"].indexOf(p.estado)>=0) acts+='<button class="btn ghost" data-a="reenviar" data-id="'+esc(p.id)+'">Reenviar mail</button>';
  var wa=String(p.cel_cod||"")+String(p.cel_num||""); if(wa) acts+='<a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/549'+esc(wa.replace(/\D/g,""))+'">WhatsApp</a>';
  return '<article class="order"><div class="head"><div class="who"><b>'+esc(p.nombre+" "+p.apellido)+'</b><small>'+esc(p.id)+' · '+esc(p.fecha)+'</small></div>'
    +'<div class="amt"><b>'+money(p.total)+'</b><small class="meta">'+(p.pago==="transferencia"?"Transferencia":"Tarjeta")+' · '+esc(p._items||(p.cantidad+' u.'))+'</small></div></div>'
    +'<div class="meta"><span class="st '+esc(p.estado)+'">'+esc(LABEL[p.estado]||p.estado)+'</span></div>'
    +'<div class="meta">'+esc(dest)+'</div><div class="meta">DNI '+esc(p.dni)+' · '+esc(p.email)+' · '+esc(p.cel_cod+" "+p.cel_num)+'</div>'
    +(p.tracking?'<div class="meta">Seguimiento: <a href="https://www.andreani.com/envio/'+esc(p.tracking)+'" target="_blank" rel="noopener">'+esc(p.tracking)+'</a></div>':'')
    +(p.cupon?'<div class="meta">Código '+esc(p.cupon)+': −'+money(p.descuento)+'</div>':'')
    +(p.notas?'<div class="meta">Nota: '+esc(p.notas)+'</div>':'')
    +'<div class="acts" style="margin-top:12px">'+acts+'</div></article>';
}
function vPedidos(d){
  var fs=[["activos","Para atender"],["reserva","Esperan pago"],["pagado","Pagados"],["exportado","Exportados"],["despachado","Despachados"],["vencido","Vencidos"],["todos","Todos"]];
  var act=["reserva","pendiente_mp","pagado","exportado"];
  var list=d.pedidos.filter(function(p){ return S.filtro==="todos"?true:S.filtro==="activos"?act.indexOf(p.estado)>=0:p.estado===S.filtro; });
  return '<div class="ph"><div><h2>Pedidos</h2></div></div><div class="filters">'+fs.map(function(f){return '<button class="chip" data-f="'+f[0]+'" aria-pressed="'+(S.filtro===f[0])+'">'+f[1]+'</button>';}).join("")+'</div>'
    +(list.length?list.map(tarjetaPedido).join(""):'<div class="empty">No hay pedidos en este estado.</div>');
}
function vStock(d){
  var h='<div class="ph"><div><h2>Stock de fundas</h2><p class="sub">Las fundas terminadas que se venden en la web. Cuando recibís una tanda en el taller se suman solas y las ventas se descuentan solas.</p></div></div>'+heroes(d);
  h+='<div class="block"><h3>Corregir el stock a mano</h3><p class="muted small" style="margin:-4px 0 10px">Solo para casos especiales: una funda fallada, un regalo, una devolución.</p><div class="g3">'
    +'<label class="f">Producto<select id="mvProd"><option value="doble">'+esc(nombreProd(d,"doble"))+'</option><option value="individual">'+esc(nombreProd(d,"individual"))+'</option></select></label>'
    +'<label class="f">Tipo<select id="mvTipo"><option value="ajuste-">Resta (fallada, regalo)</option><option value="ajuste+">Suma (devolución)</option><option value="ingreso">Ingreso fuera de una tanda</option></select></label>'
    +'<label class="f">Cantidad<input id="mvCant" type="number" min="1" step="1" inputmode="numeric" value="1"></label></div>'
    +'<label class="f">Motivo<input id="mvMot" placeholder="Ej. Funda con falla de costura"></label>'
    +'<button class="btn main" data-a="mov">Guardar movimiento</button></div>';
  h+='<div class="block"><h3>Historial</h3>'+(d.movimientos.length?'<div class="tw"><table><thead><tr><th>Fecha</th><th>Producto</th><th>Movimiento</th><th class="n">Cantidad</th></tr></thead><tbody>'
    +d.movimientos.map(function(m){return '<tr><td>'+esc(m.fecha)+'</td><td>'+(m.producto==="individual"?"Individual":"Doble")+'</td><td>'+esc(m.motivo)+'</td><td class="n '+(m.cantidad>0?'pos':'neg')+'">'+(m.cantidad>0?'+':'')+m.cantidad+'</td></tr>';}).join("")
    +'</tbody></table></div>':'<p class="muted" style="margin:0">Sin movimientos todavía.</p>')+'</div>';
  h+='<div class="block"><h3>Avisame cuando vuelva</h3>'+(d.avisos.length?'<p class="muted" style="margin:0 0 10px">'+d.avisos.length+' personas esperan aviso.</p><ul style="margin:0 0 12px;padding-left:18px">'+d.avisos.map(function(a){return '<li>'+esc(a)+'</li>';}).join("")+'</ul><button class="btn main" data-a="avisar"'+((d.stock.doble.disponible>0||d.stock.individual.disponible>0)?'':' disabled')+'>Avisarles que hay stock</button>':'<p class="muted" style="margin:0">Nadie en espera.</p>')+'</div>';
  return h;
}
function vEnvios(d){
  var pag=d.pedidos.filter(function(p){return p.estado==="pagado";}), exp=d.pedidos.filter(function(p){return p.estado==="exportado";});
  var h='<div class="ph"><div><h2>Envíos</h2><p class="sub">Exportá los pedidos pagados, subí el Excel en andreani.com y después cargá el número de seguimiento de cada uno: al cliente le llega el mail con el link.</p></div></div>';
  h+='<div class="block" style="margin-top:0"><h3>1. Para exportar ('+pag.length+')</h3>';
  if(pag.length){
    h+='<div class="tw"><table><thead><tr><th>Pedido</th><th>Destinatario</th><th>Destino</th></tr></thead><tbody>'
      +pag.map(function(p){return '<tr><td>'+esc(p.id)+'</td><td>'+esc(p.nombre+" "+p.apellido)+'</td><td>'+(p.entrega==="sucursal"?'Sucursal '+esc(p.sucursal):esc(p.prov_loc_cp))+'</td></tr>';}).join("")
      +'</tbody></table></div><div style="margin-top:14px"><button class="btn main big" data-a="exportar">Exportar planilla para Andreani</button></div>';
  } else h+='<p class="muted" style="margin:0">No hay pedidos pagados pendientes.</p>';
  h+='</div><div class="block"><h3>2. Cargar seguimiento ('+exp.length+')</h3>'+(exp.length?exp.map(tarjetaPedido).join(""):'<p class="muted" style="margin:0">Nada pendiente.</p>')+'</div>';
  return h;
}
var CFG_LBL={alias:"Alias",cbu:"CBU / CVU",titular:"Titular de la cuenta",banco:"Banco o billetera",whatsapp:"WhatsApp (ej. 5492664123456)",email_aviso:"Tu email para avisos",precio_tarjeta:"Precio con tarjeta",precio_transferencia:"Precio por transferencia",cuotas_max:"Cuotas (máximo)",producto2:"Nombre del producto (el que ve el cliente)",precio2_tarjeta:"Precio con tarjeta",precio2_transferencia:"Precio por transferencia",activo2:"Mostrarlo en la web (SI / NO)",valor_envio:"Valor del envío que se muestra tachado (0 = no mostrar)",stock_minimo:"Stock mínimo para avisar",reserva_transferencia_horas:"Reserva por transferencia (horas)",reserva_tarjeta_horas:"Reserva por tarjeta (horas)",plantilla_andreani_id:"ID de la plantilla de Andreani",peso_gr:"Peso (g)",alto_cm:"Alto (cm)",ancho_cm:"Ancho (cm)",profundidad_cm:"Profundidad (cm)",valor_declarado:"Valor declarado",url_web:"Dirección de la web",producto:"Nombre del producto (el que ve el cliente)",sub1:"Descripción corta",medidas1:"Medidas y detalles",sub2:"Descripción corta",medidas2:"Medidas y detalles",clave_vista:"Clave de vista previa"};
var CFG_GRUPOS=[
  ["Producto 1 (doble)",["producto","sub1","medidas1","precio_tarjeta","precio_transferencia"]],
  ["Producto 2 (individual)",["producto2","sub2","medidas2","precio2_tarjeta","precio2_transferencia","activo2"]],
  ["Cobros",["cuotas_max","alias","cbu","titular","banco"]],
  ["Contacto",["whatsapp","email_aviso"]],
  ["Envíos",["valor_envio","plantilla_andreani_id","peso_gr","alto_cm","ancho_cm","profundidad_cm","valor_declarado"]],
  ["Stock y reservas",["stock_minimo","reserva_transferencia_horas","reserva_tarjeta_horas"]],
  ["Web",["url_web","clave_vista"]]
];
function vConfig(d){
  var c=d.config;
  return '<div class="ph"><div><h2>Configuración</h2><p class="sub">Los precios también los podés probar y aplicar desde Precios y rentabilidad.</p></div></div>'
    +'<div class="block" style="margin-top:0"><b>Mercado Pago:</b> '+(d.tokenMP?'<span class="pos">conectado</span>':'<span class="neg">falta el Access Token</span> (se carga en Apps Script → Propiedades del script).')+'</div>'
    +'<form id="cfg">'+CFG_GRUPOS.map(function(g){ return '<div class="block"><h3>'+esc(g[0])+'</h3>'+g[1].map(function(k){return '<div class="cfg-row"><label class="f" style="margin:0">'+esc(CFG_LBL[k]||k)+(/^medidas/.test(k)?'<textarea name="'+k+'" rows="5">'+esc(c[k]||"")+'</textarea><small style="font-weight:500">Un renglón por cada punto. Se muestran en “Medidas y detalles”.</small>':'<input name="'+k+'" value="'+esc(c[k]||"")+'">')+'</label></div>';}).join("")+'</div>'; }).join("")
    +'</form><button class="btn main big" data-a="guardarCfg" style="margin:14px 0 20px">Guardar cambios</button>';
}
var MED_DEST="portada";
function urlImg(id,w){ return "https://lh3.googleusercontent.com/d/"+id+"=w"+(w||400); }
function vFotos(d){
  var dest=[["portada","Portada de la web"]].concat((d.productos||[]).map(function(p){return [p.id,p.nombre];}));
  if(!dest.some(function(x){return x[0]===MED_DEST;})) MED_DEST="portada";
  var lista=(d.media||[]).filter(function(m){return m.destino===MED_DEST;});
  var h='<div class="ph"><div><h2>Fotos y videos</h2><p class="sub">Elegí dónde van, subilos y ordenalos. La foto marcada con ★ es la principal (la que se ve primero).</p></div></div>'
    +'<div class="filters">'+dest.map(function(x){ var n=(d.media||[]).filter(function(m){return m.destino===x[0];}).length; return '<button class="chip" data-med="'+x[0]+'" aria-pressed="'+(MED_DEST===x[0])+'">'+esc(x[1])+(n?' ('+n+')':'')+'</button>'; }).join("")+'</div>'
    +'<div class="block" style="margin-top:0"><label class="btn main" style="cursor:pointer">＋ Subir fotos o videos<input type="file" id="medFile" accept="image/*,video/*" multiple hidden></label>'
    +'<p class="muted small" style="margin:10px 0 0">Las fotos se achican solas para que la web cargue rápido. Videos: cortos, hasta 25 MB.</p><div id="medProg" class="muted small" style="margin:8px 0 0"></div></div>';
  if(!lista.length) return h+'<div class="empty" style="margin-top:14px">Todavía no hay fotos ni videos acá.</div>';
  h+='<div class="medgrid" style="margin-top:14px">'+lista.map(function(m,i){
    var prev=m.tipo==="img"?'<img src="'+urlImg(m.drive,400)+'" alt="'+esc(m.nombre)+'" loading="lazy">':'<div class="medvid">▶<small>Video</small></div>';
    return '<div class="medcard">'+prev+(m.principal?'<span class="medbadge">★ Principal</span>':'')
      +'<div class="medacts"><button class="btn ghost" data-a="mOrd" data-id="'+esc(m.id)+'" data-dir="-1" aria-label="Mover antes"'+(i===0?' disabled':'')+'>◀</button>'
      +'<button class="btn ghost" data-a="mOrd" data-id="'+esc(m.id)+'" data-dir="1" aria-label="Mover después"'+(i===lista.length-1?' disabled':'')+'>▶</button>'
      +(m.tipo==="img"&&!m.principal?'<button class="btn ghost" data-a="mPri" data-id="'+esc(m.id)+'" aria-label="Hacer principal">★</button>':'')
      +'<button class="btn ghost" style="color:var(--bad)" data-a="mDel" data-id="'+esc(m.id)+'" aria-label="Borrar">🗑</button></div></div>';
  }).join("")+'</div>';
  return h;
}
function achicar(file){ return new Promise(function(ok,bad){
  var img=new Image(), url=URL.createObjectURL(file);
  img.onload=function(){ var max=1600, w=img.naturalWidth, h=img.naturalHeight, k=Math.min(1,max/Math.max(w,h));
    var c=document.createElement("canvas"); c.width=Math.round(w*k); c.height=Math.round(h*k); c.getContext("2d").drawImage(img,0,0,c.width,c.height);
    URL.revokeObjectURL(url); ok({data:c.toDataURL("image/jpeg",0.82).split(",")[1],mime:"image/jpeg",nombre:file.name.replace(/\.[^.]+$/,"")+".jpg"}); };
  img.onerror=function(){ URL.revokeObjectURL(url); bad(new Error("No pude leer la imagen "+file.name)); };
  img.src=url; }); }
function leerB64(file){ return new Promise(function(ok,bad){ var r=new FileReader(); r.onload=function(){ ok({data:String(r.result).split(",")[1],mime:file.type,nombre:file.name}); }; r.onerror=function(){bad(new Error("No pude leer "+file.name));}; r.readAsDataURL(file); }); }
function subirArchivos(files){
  var prog=$("#medProg"), lista=Array.prototype.slice.call(files), i=0, ok=0;
  function sig(){
    if(i>=lista.length){ prog.textContent=ok+" de "+lista.length+" subidos."; cargar(ok?"Archivos subidos":null); return; }
    var f=lista[i++]; prog.innerHTML='<span class="spinner"></span> Subiendo '+i+' de '+lista.length+': '+esc(f.name);
    var esVid=/^video\//.test(f.type);
    if(!/^(image|video)\//.test(f.type)){ toast(f.name+": no es foto ni video"); return sig(); }
    if(esVid&&f.size>25*1024*1024){ toast(f.name+": el video pesa más de 25 MB"); return sig(); }
    (esVid?leerB64(f):achicar(f)).then(function(x){ return api("subirMedia",{destino:MED_DEST,nombre:x.nombre,mime:x.mime,data:x.data}); })
      .then(function(){ ok++; sig(); }).catch(function(e){ toast(e.message); sig(); });
  }
  sig();
}
var RC=null, RCsel={};
function cargarRecuperar(){ api("recuperar").then(function(r){ RC=r; render(); }).catch(function(e){ toast(e.message); }); }
function waRecuperar(x){
  var tel=String(x.cel||"").replace(/\D/g,""); if(tel.length<8) return "";
  if(!/^54/.test(tel)) tel="549"+tel;
  var nombre=(x.nombre||"").split(" ")[0];
  var txt="Hola "+nombre+"! Te escribo de Los Perrines 🐾 Vi que te quedó pendiente "+(x.items||"tu funda")+". ¿Te quedó alguna duda con las medidas o con el envío? Te ayudo a terminar la compra.";
  return "https://wa.me/"+tel+"?text="+encodeURIComponent(txt);
}
function vRecuperar(){
  if(!RC){ cargarRecuperar(); return '<div class="ph"><div><h2>Recuperar ventas</h2></div></div><p class="muted"><span class="spinner"></span> Cargando…</p>'; }
  var st=RC.stats||{}, L=RC.lista||[], cups=RC.cupones||[];
  var h='<div class="ph"><div><h2>Recuperar ventas</h2><p class="sub">Clientes que empezaron a comprar y no terminaron, y ya recibieron el primer recordatorio automático. Escribiles por WhatsApp o mandales un segundo mail con un beneficio.</p></div></div>'
    +'<div class="cards" style="margin-top:0"><div class="kpi"><small>Recordatorios automáticos</small><b>'+(st.recordatorios||0)+'</b></div><div class="kpi"><small>Segundos mails</small><b>'+(st.segundos||0)+'</b></div><div class="kpi ok"><small>Ventas recuperadas</small><b>'+(st.recuperadas||0)+'</b></div><div class="kpi"><small>Sin comprar ahora</small><b>'+L.length+'</b></div></div>';
  h+='<div class="block"><h3>Clientes sin comprar</h3>';
  if(!L.length) h+='<p class="muted" style="margin:0">No hay nadie en la lista.</p>';
  else {
    h+='<label class="check" style="margin-bottom:8px"><input type="checkbox" id="rcAll"'+(L.every(function(x){return RCsel[x.email];})?' checked':'')+'> Seleccionar todos</label><div class="tw"><table><thead><tr><th></th><th>Cliente</th><th>Qué dejó</th><th>Origen</th><th>Fecha</th><th>Mails</th><th></th></tr></thead><tbody>'
      +L.map(function(x){ var wa=waRecuperar(x); return '<tr><td><input type="checkbox" class="rcChk" data-em="'+esc(x.email)+'"'+(RCsel[x.email]?' checked':'')+' aria-label="Elegir '+esc(x.email)+'"></td><td><b>'+esc((x.nombre+" "+x.apellido).trim()||"—")+'</b><br><small class="muted">'+esc(x.email)+(x.cel?' · '+esc(x.cel):'')+'</small></td><td>'+esc(x.items)+'</td><td>'+esc(x.origen)+'</td><td>'+esc(x.fecha)+'</td><td><small>'+(x.recordatorio?'1°: '+esc(x.recordatorio)+'<br>':'')+(x.segundo?'2°: '+esc(x.segundo):'')+(!x.recordatorio&&!x.segundo?'—':'')+'</small></td><td>'+(wa?'<a class="btn ghost sm" target="_blank" rel="noopener" href="'+esc(wa)+'">WhatsApp</a>':'')+'</td></tr>'; }).join("")
      +'</tbody></table></div>';
    var activos=cups.filter(function(c){return c.activo;});
    h+='<h3 style="margin-top:16px">Segundo mail promocional</h3>'
      +'<label class="f">Asunto<input id="rcAsunto" value="¡Tenemos un regalo para vos! 🐾"></label>'
      +'<label class="f">Mensaje (escribí {nombre} y se reemplaza por el nombre de cada cliente)<textarea id="rcMsg" rows="5">Hola {nombre}, vimos que te quedó pendiente tu funda. Para que te animes, te dejamos un descuento extra pagando por transferencia. ¡Tu mascota y tu auto te lo van a agradecer!</textarea></label>'
      +'<label class="f">Código de descuento (opcional)<select id="rcCupon"><option value="">Sin código</option>'+activos.map(function(c){return '<option value="'+esc(c.codigo)+'">'+esc(c.codigo)+' · '+c.porcentaje+'% off'+(c.vence?' (hasta '+esc(c.vence)+')':'')+'</option>';}).join("")+'</select></label>'
      +'<button class="btn main big" data-a="rcEnviar">Enviar a los seleccionados ('+Object.keys(RCsel).filter(function(k){return RCsel[k];}).length+')</button>';
  }
  h+='</div><div class="block"><h3>Códigos de descuento</h3><p class="muted small" style="margin:-4px 0 10px">Se aplican solo pagando por transferencia, sobre el precio de transferencia.</p>'
    +(cups.length?'<div class="tw"><table><thead><tr><th>Código</th><th>Descuento</th><th>Vence</th><th>Uso</th><th>Estado</th><th></th></tr></thead><tbody>'+cups.map(function(c){ return '<tr><td><b>'+esc(c.codigo)+'</b></td><td>'+c.porcentaje+'%</td><td>'+esc(c.vence||"—")+'</td><td>'+(c.unico?'Una vez por cliente':'Ilimitado')+'</td><td>'+(c.activo?'<span class="pill ok">Activo</span>':'<span class="pill mute">Pausado</span>')+'</td><td style="white-space:nowrap"><button class="btn ghost sm" data-a="cupToggle" data-cod="'+esc(c.codigo)+'">'+(c.activo?'Pausar':'Activar')+'</button> <button class="btn danger sm" data-a="cupDel" data-cod="'+esc(c.codigo)+'">Borrar</button></td></tr>'; }).join("")+'</tbody></table></div>':'<p class="muted">Todavía no creaste códigos.</p>')
    +'<div class="g2" style="margin-top:12px"><label class="f">Código<input id="cpCod" placeholder="Ej. VOLVE10" style="text-transform:uppercase"></label><label class="f">% de descuento<input id="cpPct" type="number" min="1" max="99" value="10"></label></div>'
    +'<div class="g2"><label class="f">Vence (opcional)<input id="cpVence" type="date"></label><label class="check" style="margin-top:18px"><input type="checkbox" id="cpUnico" checked> Una vez por cliente</label></div>'
    +'<button class="btn main" data-a="cupCrear">Crear código</button></div>';
  return h;
}

/* registro de vistas (el taller agrega las suyas) */
function pendientesPedidos(){ var P=S.data?S.data.pedidos:[]; return P.filter(function(p){return ["reserva","pagado","exportado"].indexOf(p.estado)>=0;}).length; }
vista("inicio","","Inicio",vInicio);
vista("pedidos","Ventas","Pedidos",vPedidos,function(){ return {n:pendientesPedidos()}; });
vista("envios","Ventas","Envíos",vEnvios,function(){ var P=S.data?S.data.pedidos:[]; return {n:P.filter(function(p){return p.estado==="pagado"||p.estado==="exportado";}).length}; });
vista("recuperar","Ventas","Recuperar ventas",vRecuperar);

/* ---------- eventos ---------- */
var CLICK={}, INPUT={};   // el taller registra sus manejadores acá
document.addEventListener("change",function(e){
  var t=e.target;
  if(t.id==="rcAll"){ (RC&&RC.lista||[]).forEach(function(x){ RCsel[x.email]=t.checked; }); render(); return; }
  if(t.classList&&t.classList.contains("rcChk")){ RCsel[t.dataset.em]=t.checked; render(); return; }
  if(t.id==="medFile"&&t.files.length){ subirArchivos(t.files); t.value=""; return; }
  if(t.dataset&&t.dataset.ch&&INPUT[t.dataset.ch+":change"]) INPUT[t.dataset.ch+":change"](t,e);
});
document.addEventListener("input",function(e){ var t=e.target; if(t.dataset&&t.dataset.in&&INPUT[t.dataset.in]) INPUT[t.dataset.in](t,e); });
document.addEventListener("submit",function(e){
  if(e.target.id!=="login"){ return; } e.preventDefault();
  var b=$("#loginBtn"); b.disabled=true; b.innerHTML='<span class="spinner"></span>';
  api("login",{password:$("#pw").value}).then(function(r){ S.token=r.token; sessionStorage.setItem("lp_token",r.token); S.data=null; render(); })
    .catch(function(x){ $("#lerr").textContent=x.message; b.disabled=false; b.textContent="Entrar"; });
});
window.addEventListener("hashchange",function(){ var v=location.hash.slice(1); if(v&&v!==S.view&&VIEWS[v]){ S.view=v; render(); } });
document.addEventListener("click",function(e){
  var t=e.target.closest("button,[data-a]"); if(!t||t.disabled) return;
  if(t.dataset.go){ if(t.dataset.f) S.filtro=t.dataset.f; if(t.dataset.go==="recuperar") RC=null; ir(t.dataset.go); return; }
  if(t.dataset.med){ MED_DEST=t.dataset.med; render(); return; }
  if(t.classList.contains("chip")&&t.dataset.f){ S.filtro=t.dataset.f; render(); return; }
  var a=t.dataset.a, id=t.dataset.id; if(!a) return;
  if(CLICK[a]){ CLICK[a](t,e); return; }
  if(a==="menu"){ S.menu=!S.menu; render(); }
  else if(a==="salir") salir();
  else if(a==="refrescar") cargar("Actualizado");
  else if(a==="cerrar") cerrarDlg();
  else if(a==="tienda"){ if(t.dataset.v==="SI" && !confirm("¿Abrir la tienda al público? Cualquiera va a poder comprar.")) return; accion("guardarConfig",{valores:{tienda_abierta:t.dataset.v}},t.dataset.v==="SI"?"Tienda abierta":"Tienda cerrada",t); }
  else if(a==="pagado"){ if(confirm("¿Confirmás que recibiste el pago del pedido "+id+"? Le llega un mail al cliente.")) accion("pagado",{id:id},"Pedido marcado como pagado",t); }
  else if(a==="cancelar"){ if(confirm("¿Cancelar el pedido "+id+"? Se libera el stock.")) accion("cancelar",{id:id},"Pedido cancelado",t); }
  else if(a==="reenviar") accion("reenviar",{id:id},"Mail reenviado",t);
  else if(a==="despachar"){ var v=($("#tr-"+CSS.escape(id))||{}).value||""; if(!v.trim()){ toast("Poné el número de seguimiento."); return; } accion("despachar",{id:id,tracking:v},"Despachado: le avisamos al cliente",t); }
  else if(a==="mov"){
    var tipo=$("#mvTipo").value, cant=parseInt($("#mvCant").value,10), mot=$("#mvMot").value.trim();
    if(!(cant>0)){ toast("Poné una cantidad mayor a cero."); return; } if(!mot){ toast("Escribí el motivo."); return; }
    accion("movimiento",{producto:$("#mvProd").value,tipo:tipo==="ingreso"?"ingreso":"ajuste",cantidad:tipo==="ajuste-"?-cant:cant,motivo:mot},"Movimiento guardado",t);
  }
  else if(a==="avisar") accion("avisar",{},null,t).then(function(r){ if(r) toast("Avisos enviados: "+r.avisados+(r.faltan?". Faltan "+r.faltan+" por el límite diario de mails: probá mañana.":""),6000); });
  else if(a==="mOrd") accion("ordenMedia",{id:id,dir:t.dataset.dir},null,t);
  else if(a==="mPri") accion("principalMedia",{id:id},"Foto principal actualizada",t);
  else if(a==="mDel"){ if(confirm("¿Borrar este archivo? Se va a la papelera de tu Drive.")) accion("borrarMedia",{id:id},"Archivo borrado",t); }
  else if(a==="rcEnviar"){
    var ems=Object.keys(RCsel).filter(function(k){return RCsel[k];});
    if(!ems.length){ toast("Elegí al menos un cliente."); return; }
    if(!confirm("¿Enviar el mail a "+ems.length+" cliente"+(ems.length>1?"s":"")+"?")) return;
    t.disabled=true; api("enviarSegundo",{emails:ems,asunto:$("#rcAsunto").value,mensaje:$("#rcMsg").value,cupon:$("#rcCupon").value}).then(function(r){ toast("Mails enviados: "+r.enviados); RCsel={}; cargarRecuperar(); }).catch(function(e){ toast(e.message); t.disabled=false; });
  }
  else if(a==="cupCrear"){ var cod=$("#cpCod").value.trim(); if(!cod){ toast("Poné el código."); return; }
    t.disabled=true; api("guardarCupon",{codigo:cod,porcentaje:$("#cpPct").value,vence:$("#cpVence").value,unico:$("#cpUnico").checked}).then(function(){ toast("Código creado"); cargarRecuperar(); }).catch(function(e){ toast(e.message); t.disabled=false; }); }
  else if(a==="cupToggle"){ var c0=(RC.cupones||[]).filter(function(x){return x.codigo===t.dataset.cod;})[0]; if(!c0) return;
    var vv=c0.vence?c0.vence.split("/").reverse().join("-"):""; api("guardarCupon",{codigo:c0.codigo,porcentaje:c0.porcentaje,vence:vv,unico:c0.unico,activo:!c0.activo}).then(function(){ cargarRecuperar(); }).catch(function(e){ toast(e.message); }); }
  else if(a==="cupDel"){ if(confirm("¿Borrar el código "+t.dataset.cod+"?")) api("borrarCupon",{codigo:t.dataset.cod}).then(function(){ cargarRecuperar(); }).catch(function(e){ toast(e.message); }); }
  else if(a==="guardarCfg"){ var vals={}; new FormData($("#cfg")).forEach(function(v,k){vals[k]=v;}); accion("guardarConfig",{valores:vals},"Configuración guardada",t); }
  else if(a==="exportar"){
    accion("exportar",{},null,t).then(function(r){ if(!r) return;
      dlg('<div class="row"><h3>Planilla lista</h3><button class="x" data-a="cerrar" aria-label="Cerrar">×</button></div>'
        +'<p class="muted" style="margin:0 0 12px">'+r.cantidad+' envíos ('+r.domicilio+' a domicilio, '+r.sucursal+' a sucursal). Descargala y subila en andreani.com.</p>'
        +'<a class="btn main big" style="display:flex" href="'+esc(r.url)+'" target="_blank" rel="noopener">Descargar Excel</a>'
        +'<p class="muted small" style="margin:12px 0 0">También queda guardada en tu Drive, en la carpeta "Los Perrines - Envíos Andreani".</p>'); });
  }
});
$("#dlg").addEventListener("click",function(e){ if(e.target===this) this.close(); });
document.addEventListener("keydown",function(e){ if(e.key==="Escape"&&S.menu){ S.menu=false; render(); } });

/* lo que usa admin-taller.js */
return {S:S,api:api,cargar:cargar,cargarTaller:cargarTaller,accion:accion,render:render,refrescar:refrescar,dlg:dlg,cerrarDlg:cerrarDlg,toast:toast,ir:ir,vista:vista,
  CLICK:CLICK,INPUT:INPUT,money:money,q:q,qi:qi,esc:esc,$:$,$$:$$,nd:nd,nm:nm,
  arrancar:function(){
    vista("stock","Tienda","Stock de fundas",vStock);
    vista("fotos","Tienda","Fotos y videos",vFotos);
    vista("config","Tienda","Configuración",vConfig);
    render();
  }};
})();
