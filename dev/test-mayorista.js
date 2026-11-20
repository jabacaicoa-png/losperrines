// Consultas de venta por mayor desde la web (19/11/2026): node dev/test-mayorista.js
const {makeEnv}=require('./gas-emu'); const assert=require('assert');
const env=makeEnv({file:require('path').join(__dirname,'..','Codigo.gs')});
env.ctx.instalar(); require('./seed-store')(env);
const tok=env.post({accion:'login',password:'test'}).token;
env.post({accion:'guardarConfig',token:tok,valores:{email_aviso:'dueno@ej.com'}});
const enviados=[]; const orig=env.ctx.MailApp.sendEmail; env.ctx.MailApp.sendEmail=function(o){ enviados.push(o); return orig&&orig.apply(this,arguments); };
const ok={accion:'mayorista',nombre:'Ana',apellido:'Pet',negocio:'Pet Shop Ana',localidad:'Villa Mercedes',whatsapp:'0266 15 4123456',email:'ana@petshop.com',doble:'8',individual:'2',mensaje:'Hola'};
assert(env.post(Object.assign({},ok,{nombre:''})).error,'sin nombre');
assert(env.post(Object.assign({},ok,{whatsapp:'12'})).error,'whatsapp corto');
assert(env.post(Object.assign({},ok,{doble:'0',individual:''})).error,'sin cantidad');
assert(env.post(Object.assign({},ok,{email:'no-es-mail'})).error,'mail inválido');
const r=env.post(ok); assert(r.ok,r.error);
const filas=env.ctx.filas(env.ctx.H.mayoristas); assert.strictEqual(filas.length,1); assert.strictEqual(filas[0].negocio,'Pet Shop Ana'); assert.strictEqual(String(filas[0].doble),'8');
const m=enviados.find(o=>/Consulta por mayor/.test(o.subject)); assert(m,'mail al dueño'); assert.strictEqual(m.to,'dueno@ej.com'); assert.strictEqual(m.replyTo,'ana@petshop.com');
assert(/wa\.me\/5492664123456/.test(m.htmlBody),'link de WhatsApp normalizado');
assert(env.post(Object.assign({},ok,{web:'spam'})).ok); assert.strictEqual(env.ctx.filas(env.ctx.H.mayoristas).length,1,'el robot no se guarda');
console.log('MAYORISTA OK');

/* ---------- pedidos mayoristas (20/11/2026) ---------- */
const disp=id=>env.ctx.stock()[id].disponible;
const d0=disp('doble'), i0=disp('individual');
let res=env.post({accion:'resumen',token:tok}); assert(res.mayoristas&&res.mayoristas.consultas.length===1,'consultas en el resumen');
const fila=res.mayoristas.consultas[0].fila;
assert(env.post({accion:'mayoristaGuardar',token:tok,data:{negocio:'X',items:[]}}).error,'sin fundas');
assert(env.post({accion:'mayoristaGuardar',token:tok,data:{negocio:'X',items:[{producto:'doble',cantidad:2,precio:0}]}}).error,'sin precio');
const nMails=enviados.length;
const g=env.post({accion:'mayoristaGuardar',token:tok,data:{negocio:'Pet Shop Ana',nombre:'Ana',apellido:'Pet',whatsapp:'0266 15 4123456',email:'ana@petshop.com',entrega:'domicilio',calle:'San Martín',numero:'100',prov_loc_cp:'San Luis / Villa Mercedes / 5730',
  items:[{producto:'doble',cantidad:3,precio:50000},{producto:'individual',cantidad:1,precio:33000}],envio:25000,pagado:false,consulta:String(fila)}});
assert(g.ok,g.error); assert(/^MY-\d{6}-001$/.test(g.id),g.id);
assert.strictEqual(disp('doble'),d0,'pendiente: no toca el stock'); assert.strictEqual(disp('individual'),i0);
res=env.post({accion:'resumen',token:tok}); const pm=res.mayoristas.pedidos[0];
assert.strictEqual(pm.total,183000); assert.strictEqual(pm.estado,'pendiente'); assert.strictEqual(res.mayoristas.consultas[0].estado,'pedido','la consulta queda como "hizo pedido"');
// editar mientras está pendiente
assert(env.post({accion:'mayoristaGuardar',token:tok,data:Object.assign({},pm,{items:[{producto:'doble',cantidad:2,precio:50000},{producto:'individual',cantidad:1,precio:33000}],pagado:false})}).ok);
res=env.post({accion:'resumen',token:tok}); assert.strictEqual(res.mayoristas.pedidos[0].total,133000,'editado');
// sacar del stock: crea el pedido mayorista, descuenta, sin mails
const sa=env.post({accion:'mayoristaSacar',token:tok,id:g.id}); assert(sa.ok,sa.error);
assert.strictEqual(disp('doble'),d0-2,'descontó dobles'); assert.strictEqual(disp('individual'),i0-1,'descontó individual');
assert(env.post({accion:'mayoristaSacar',token:tok,id:g.id}).error,'no se saca dos veces');
let P=env.ctx.filas(env.ctx.H.pedidos).find(p=>p.id===sa.id);
assert.strictEqual(P.origen,'mayorista'); assert.strictEqual(P.estado,'reserva','sin pagar: espera el pago'); assert.strictEqual(P.email,''); assert.strictEqual(String(P.cel_num),'2664123456');
assert.strictEqual(env.ctx.stock().doble.disponible,d0-2,'la reserva mayorista no vence');
assert.strictEqual(enviados.length,nMails,'no se mandó ningún mail');
assert(env.post({accion:'pagado',token:tok,id:sa.id}).ok); assert.strictEqual(enviados.length,nMails,'pago confirmado sin mail');
assert(env.post({accion:'despachar',token:tok,id:sa.id,tracking:'360000123456'}).ok); assert.strictEqual(enviados.length,nMails,'despacho sin mail');
assert(env.post({accion:'mayoristaCancelar',token:tok,id:g.id}).error,'ya despachado: no se cancela');
// no alcanza el stock
const g2=env.post({accion:'mayoristaGuardar',token:tok,data:{negocio:'Grande',items:[{producto:'doble',cantidad:500,precio:45000}],pagado:true}}); assert(g2.ok);
const sa2=env.post({accion:'mayoristaSacar',token:tok,id:g2.id}); assert(sa2.error&&/No alcanza el stock/.test(sa2.error),sa2.error);
// sacar pagado y cancelar: vuelve al stock
const g3=env.post({accion:'mayoristaGuardar',token:tok,data:{negocio:'Chico',items:[{producto:'doble',cantidad:1,precio:52000}],pagado:true,entrega:'mano'}}); assert(g3.ok);
const dA=disp('doble'); const sa3=env.post({accion:'mayoristaSacar',token:tok,id:g3.id}); assert(sa3.ok);
assert.strictEqual(env.ctx.filas(env.ctx.H.pedidos).find(p=>p.id===sa3.id).estado,'pagado'); assert.strictEqual(disp('doble'),dA-1);
assert(env.post({accion:'mayoristaCancelar',token:tok,id:g3.id}).ok); assert.strictEqual(disp('doble'),dA,'cancelado: vuelve al stock');
// consultas: archivar
assert(env.post({accion:'mayoristaConsulta',token:tok,fila:fila,estado:'archivada'}).ok);
assert.strictEqual(env.post({accion:'resumen',token:tok}).mayoristas.consultas[0].estado,'archivada');
// no cuenta para Publicidad (no vino de un anuncio)
assert.strictEqual(env.ctx.esFuera(P),true);
console.log('PEDIDOS MAYORISTAS OK');

/* ---------- cotizaciones guardadas (20/11/2026) ---------- */
assert(env.post({accion:'mayorista',nombre:'Bea',apellido:'Vet',negocio:'Vete Bea',localidad:'Merlo',whatsapp:'2664999888',doble:'4',individual:'0'}).ok);
const fc=env.ctx.filas(env.ctx.H.mayoristas).slice(-1)[0]._fila;
const dS=disp('doble');
const ct=env.post({accion:'mayoristaGuardar',token:tok,data:{cotizacion:true,negocio:'',items:[{producto:'doble',cantidad:4,precio:52000}],envio:12000,validez:15,consulta:String(fc)}});
assert(ct.ok,ct.error);
let cx=env.post({accion:'resumen',token:tok}).mayoristas; let co=cx.pedidos.find(x=>x.id===ct.id);
assert.strictEqual(co.estado,'cotizacion'); assert.strictEqual(co.validez,15); assert.strictEqual(co.total,208000); assert.strictEqual(disp('doble'),dS,'la cotización no toca el stock');
assert.strictEqual(cx.consultas.find(c=>c.fila===fc).estado,'cotizada');
assert(env.post({accion:'mayoristaSacar',token:tok,id:ct.id}).error,'una cotización no sale del stock');
// retomarla y cambiar el precio desde la calculadora
assert(env.post({accion:'mayoristaGuardar',token:tok,data:{id:ct.id,cotizacion:true,negocio:'Vete Bea',items:[{producto:'doble',cantidad:5,precio:50000}],envio:12000,validez:15}}).ok);
co=env.post({accion:'resumen',token:tok}).mayoristas.pedidos.find(x=>x.id===ct.id); assert.strictEqual(co.total,250000); assert.strictEqual(co.estado,'cotizacion'); assert.strictEqual(co.negocio,'Vete Bea');
// pasar a pedido
assert(env.post({accion:'mayoristaGuardar',token:tok,data:Object.assign({},co,{estado:undefined,nombre:'Bea',whatsapp:'2664999888',pagado:true})}).ok);
cx=env.post({accion:'resumen',token:tok}).mayoristas; co=cx.pedidos.find(x=>x.id===ct.id);
assert.strictEqual(co.estado,'pendiente'); assert.strictEqual(cx.consultas.find(c=>c.fila===fc).estado,'pedido'); assert.strictEqual(disp('doble'),dS,'pendiente tampoco toca el stock');
// descartar otra cotización
const ct2=env.post({accion:'mayoristaGuardar',token:tok,data:{cotizacion:true,negocio:'Otro',items:[{producto:'individual',cantidad:2,precio:33000}]}});
assert(env.post({accion:'mayoristaCancelar',token:tok,id:ct2.id}).ok);
assert.strictEqual(env.post({accion:'resumen',token:tok}).mayoristas.pedidos.find(x=>x.id===ct2.id).estado,'cancelado');
// borrar una consulta de prueba: desaparece de la lista sin correr las filas de las demás
const antes=env.post({accion:'resumen',token:tok}).mayoristas.consultas; const borr=antes[antes.length-1].fila;
assert(env.post({accion:'mayoristaConsulta',token:tok,fila:borr,estado:'borrada'}).ok);
const desp=env.post({accion:'resumen',token:tok}).mayoristas.consultas; assert.strictEqual(desp.length,antes.length-1); assert(!desp.some(c=>c.fila===borr));
assert(desp.every(c=>antes.find(a=>a.fila===c.fila)),'las demás conservan su número');
console.log('COTIZACIONES OK');
