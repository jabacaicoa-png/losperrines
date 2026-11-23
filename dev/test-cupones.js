// Códigos de descuento: porcentaje o monto fijo en $ por funda (16/11/2026). Uso: node dev/test-cupones.js
process.env.TZ='America/Argentina/Buenos_Aires';   // como el proyecto de Apps Script
const {makeEnv}=require('./gas-emu'); const assert=require('assert');
const env=makeEnv({file:require('path').join(__dirname,'..','Codigo.gs')}); env.ctx.instalar(); require('./seed-store.js')(env);
const tok=env.token; let r0; const P=b=>{const r=env.post(b); if(!r.ok) throw new Error(b.accion+': '+r.error); return r;};
P({accion:'guardarCupon',token:tok,codigo:'emiliano',monto:2000,porcentaje:10,unico:true,email:'emi@vende.com',comision:3000});
r0=env.post({accion:'guardarCupon',token:tok,codigo:'X1',monto:1000,email:'malmail'}); assert(!r0.ok&&/mail/.test(r0.error));
P({accion:'guardarCupon',token:tok,codigo:'VOLVE10',porcentaje:10});
let r=env.post({accion:'guardarCupon',token:tok,codigo:'MAL'}); assert(!r.ok);
const v=P({accion:'cupon',codigo:'EMILIANO',email:'a@b.com'}); assert.equal(+v.monto,2000);
const datos={nombre:'Ana',apellido:'P',dni:'30111222',email:'ana@x.com',cel_cod:'266',cel_num:'4111111',cp:'5700',prov_loc_cp:'SAN LUIS / SAN LUIS / 5700',entrega:'sucursal',sucursal:'San Luis Centro',pago:'transferencia'};
const o=P(Object.assign({accion:'pedido',cupon:'EMILIANO',items:[{producto:'doble',cantidad:2}]},datos));
console.log('2 dobles con EMILIANO:',o.total,o.descuento); assert.equal(o.descuento,4000); assert.equal(o.total,85500*2-4000);
const o2=P(Object.assign({accion:'pedido',cupon:'VOLVE10',items:[{producto:'doble',cantidad:1}]},datos,{email:'b@x.com'}));
console.log('1 doble con VOLVE10:',o2.total,o2.descuento); assert.equal(o2.descuento,8550);
r=env.post(Object.assign({accion:'pedido',cupon:'EMILIANO',items:[{producto:'doble',cantidad:1}]},datos)); assert(!r.ok&&/Ya usaste/.test(r.error)); 
// aviso al vendedor cuando se paga
const m0=env.mails.length; P({accion:'pagado',token:tok,id:o.id});
const mv=env.mails.slice(m0).filter(m=>m.to==='emi@vende.com'); assert.equal(mv.length,1,'le llega un mail al vendedor');
assert(/\$6\.000/.test(mv[0].htmlBody),'comisión de 2 fundas'); assert(/2 fundas/.test(mv[0].htmlBody)); assert(!/ana@x\.com|Ana|30111222|4111111/.test(mv[0].htmlBody),'sin datos del cliente');
const m1=env.mails.length; P({accion:'pagado',token:tok,id:o2.id}); assert.equal(env.mails.slice(m1).filter(m=>m.to==='emi@vende.com').length,0,'otro código no avisa');
console.log('aviso al vendedor:',mv[0].subject);
// ===== Vendedores: lo que se debe y los pagos de los viernes =====
const V=()=>P({accion:'vendedores',token:tok}).vendedores.find(v=>v.codigo==='EMILIANO');
let vd=V(); assert.equal(vd.deuda,6000); assert.equal(vd.pendientes.length,1); assert.equal(vd.fundasPend,2);
assert.equal(P({accion:'vendedores',token:tok}).vendedores.filter(x=>x.codigo==='VOLVE10').length,0,'un código común no es vendedor');
// si el cliente devuelve / se cancela después de pagar, se paga igual
P({accion:'cancelar',token:tok,id:o.id}); vd=V(); assert.equal(vd.deuda,6000,'cancelado después de pagar: se paga igual');
// si después cambia la comisión del código, lo ya vendido no cambia
P({accion:'guardarCupon',token:tok,codigo:'EMILIANO',monto:2000,unico:true,email:'emi@vende.com',comision:5000}); vd=V(); assert.equal(vd.deuda,6000,'la comisión queda fija al pagarse');
// una reserva sin pagar no genera comisión
const o3=P(Object.assign({accion:'pedido',cupon:'EMILIANO',items:[{producto:'doble',cantidad:1}]},datos,{email:'c@x.com'})); assert.equal(V().deuda,6000,'sin pagar no suma');
// pagar: con el monto que se vio
r0=env.post({accion:'pagarVendedor',token:tok,codigo:'EMILIANO',monto:9999}); assert(!r0.ok&&/Entró otra venta/.test(r0.error));
const m2=env.mails.length; P({accion:'pagarVendedor',token:tok,codigo:'EMILIANO',monto:6000});
assert.equal(env.mails.slice(m2).filter(m=>m.to==='emi@vende.com'&&/Te pagamos/.test(m.subject)).length,1,'mail de pago al vendedor');
vd=V(); assert.equal(vd.deuda,0); assert.equal(vd.cobrado,6000); assert.equal(vd.fundasCobradas,2);
r0=env.post({accion:'pagarVendedor',token:tok,codigo:'EMILIANO'}); assert(!r0.ok&&/No le debés/.test(r0.error));
// la reserva se paga después: nueva comisión con el valor nuevo ($5.000)
P({accion:'pagado',token:tok,id:o3.id}); vd=V(); assert.equal(vd.deuda,5000); assert.equal(vd.pendientes[0].id,o3.id);
assert.equal(P({accion:'vendedores',token:tok}).pagos.length,1);
// recordatorio en el resumen del viernes
env.ctx.ahora=()=>new Date('2026-11-20T20:10:00-03:00'); P({accion:'guardarConfig',token:tok,valores:{email_aviso:'yo@lp.com'}});
const m3=env.mails.length; P({accion:'resumenAhora',token:tok}); const res=env.mails.slice(m3).find(m=>/Resumen/.test(m.subject));
assert(res&&/Hoy es viernes: comisiones para pagar/.test(res.htmlBody)&&/EMILIANO/.test(res.htmlBody),'el resumen del viernes recuerda las comisiones');
env.ctx.ahora=()=>new Date('2026-11-18T20:10:00-03:00'); const m4=env.mails.length; P({accion:'resumenAhora',token:tok});
assert(!/comisiones para pagar/.test(env.mails.slice(m4).find(m=>/Resumen/.test(m.subject)).htmlBody),'el miércoles no');
console.log('vendedores: ok');

// ===== Código que vale también con tarjeta y con fecha de inicio (Black Friday, 23/11/2026) =====
{
  let pref=null;
  const e2=makeEnv({file:require('path').join(__dirname,'..','Codigo.gs'),fetch:(url,o)=>{ if(/checkout\/preferences/.test(url)){ pref=JSON.parse(o.payload); return {getResponseCode:()=>201,getContentText:()=>JSON.stringify({id:'PREF1',init_point:'https://mp/x'})}; } }});
  e2.ctx.instalar(); require('./seed-store.js')(e2); e2.props.MP_ACCESS_TOKEN='TEST';
  const Q=b=>{const r=e2.post(b); if(!r.ok) throw new Error(b.accion+': '+r.error); return r;};
  e2.ctx.ahora=()=>new Date('2026-11-24T10:00:00-03:00');
  Q({accion:'guardarCupon',token:e2.token,codigo:'BLACK',porcentaje:5,desde:'2026-11-25',vence:'2026-11-27',tarjeta:true});
  const c=Q({accion:'recuperar',token:e2.token}).cupones.find(x=>x.codigo==='BLACK'); assert(c.tarjeta&&c.desde==='25/11/2026'&&c.vence==='27/11/2026','se guarda tarjeta y desde');
  let r1=e2.post({accion:'cupon',codigo:'BLACK',email:'z@x.com'}); assert(!r1.ok&&/empieza a valer el 25\/11/.test(r1.error),'antes del 25 no vale: '+r1.error);
  e2.ctx.ahora=()=>new Date('2026-11-25T00:05:00-03:00');
  const ok=Q({accion:'cupon',codigo:'BLACK',email:'z@x.com'}); assert.equal(ok.tarjeta,true);
  const dt={nombre:'Ana',apellido:'P',dni:'30111222',email:'t@x.com',cel_cod:'266',cel_num:'4111111',cp:'5700',prov_loc_cp:'SAN LUIS / SAN LUIS / 5700',entrega:'sucursal',sucursal:'San Luis Centro',pago:'tarjeta'};
  const t=Q(Object.assign({accion:'pedido',cupon:'BLACK',items:[{producto:'doble',cantidad:1},{producto:'individual',cantidad:1}]},dt));
  assert.equal(t.pago,'tarjeta');
  assert.deepEqual(pref.items.map(i=>i.unit_price),[95000-4750,65000-3250],'Mercado Pago cobra con el 5% adentro');
  const tr=Q(Object.assign({accion:'pedido',cupon:'BLACK',items:[{producto:'doble',cantidad:1}]},dt,{pago:'transferencia',email:'u@x.com'}));
  assert.equal(tr.descuento,4275); assert.equal(tr.total,85500-4275);
  // un código común (sin "también con tarjeta") no toca el precio con tarjeta
  Q({accion:'guardarCupon',token:e2.token,codigo:'SOLOTR',porcentaje:10});
  Q(Object.assign({accion:'pedido',cupon:'SOLOTR',items:[{producto:'doble',cantidad:1}]},dt,{email:'v@x.com'}));
  assert.deepEqual(pref.items.map(i=>i.unit_price),[95000],'sin tarjeta: precio lleno');
  e2.ctx.ahora=()=>new Date('2026-11-28T00:05:00-03:00');
  r1=e2.post({accion:'cupon',codigo:'BLACK',email:'z@x.com'}); assert(!r1.ok&&/vencido/.test(r1.error),'el 28 ya no vale');
  console.log('código con tarjeta y fecha de inicio: ok');
}

// ===== Promo en la web (franja que carga el dueño, 23/11/2026) =====
{
  const e3=makeEnv({file:require('path').join(__dirname,'..','Codigo.gs')}); e3.ctx.instalar(); require('./seed-store.js')(e3);
  const Q=b=>{const r=e3.post(b); if(!r.ok) throw new Error(b.accion+': '+r.error); return r;};
  Q({accion:'guardarConfig',token:e3.token,valores:{promo_texto:'🖤 BLACK FRIDAY: 5% OFF con el código BLACK',promo_codigo:'black',promo_desde:'2026-11-25',promo_hasta:'2026-11-27'}});
  e3.ctx.ahora=()=>new Date('2026-11-24T12:00:00-03:00'); assert.equal(Q({accion:'config'}).promo,null,'antes no se ve');
  e3.ctx.ahora=()=>new Date('2026-11-25T00:01:00-03:00'); const pr=Q({accion:'config'}).promo; assert(pr&&pr.codigo==='BLACK'&&/BLACK FRIDAY/.test(pr.texto),'el 25 se ve');
  e3.ctx.ahora=()=>new Date('2026-11-27T23:58:00-03:00'); assert(Q({accion:'config'}).promo,'el 27 a la noche sigue');
  e3.ctx.ahora=()=>new Date('2026-11-28T00:01:00-03:00'); assert.equal(Q({accion:'config'}).promo,null,'el 28 se va sola');
  Q({accion:'guardarConfig',token:e3.token,valores:{promo_texto:''}}); e3.ctx.ahora=()=>new Date('2026-11-26T12:00:00-03:00'); assert.equal(Q({accion:'config'}).promo,null,'sin texto no hay promo');
  console.log('promo en la web: ok');
}
console.log('ok');
