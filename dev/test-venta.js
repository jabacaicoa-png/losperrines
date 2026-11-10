// Prueba de "Nueva venta" (venta por fuera de la web): mismos datos y mails que la web,
// precio libre, entrega en mano, planilla de Andreani, stock, Tablero y nada a Meta.
const {makeEnv}=require('./gas-emu'); const assert=require('assert');
const env=makeEnv({file:require('path').join(__dirname,'..','Codigo.gs'),fetch:(url)=>/graph\.facebook\.com/.test(url)?{getResponseCode:()=>200,getContentText:()=>'{"events_received":1}'}:null});
env.ctx.instalar(); require('./seed-store')(env);   // 9 dobles y 3 individuales, transferencia 85.500 / 58.500
let reloj=new Date('2026-11-10T10:00:00-03:00'); env.ctx.ahora=()=>new Date(reloj.getTime()); const hs=h=>{ reloj=new Date(reloj.getTime()+h*3600000); };
const P=b=>{const r=env.post(b); if(!r.ok) throw new Error(b.accion+': '+r.error); return r;};
const A=(a,d)=>P(Object.assign({accion:a,token:env.token},d||{}));
const E=(a,d)=>env.post(Object.assign({accion:a,token:env.token},d||{})).error;
A('guardarConfig',{valores:{email_aviso:'duenio@ejemplo.com',plantilla_andreani_id:'PLANTILLA',alias:'losperrines.mp'}});
env.ss.insertSheet('A domicilio'); env.ss.insertSheet('A sucursal');
env.props.META_CAPI_TOKEN='TOKEN';
const meta=()=>env.fetches.filter(f=>/graph\.facebook\.com/.test(f.url)).length;
const ped=()=>Object.fromEntries(A('resumen').pedidos.map(p=>[p.id,p]));
const disp=id=>A('resumen').stock[id].disponible;
const cli=x=>Object.assign({nombre:'Juana',apellido:'Gómez',dni:'28111222',email:'Juana@Ej.com',cel_cod:'266',cel_num:'4555666',canal:'WhatsApp',
  entrega:'domicilio',calle:'Colón',numero:'500',prov_loc_cp:'SAN LUIS / SAN LUIS / 5700',medio:'efectivo',pagado:true,items:[{producto:'doble',cantidad:1,precio:75000}]},x||{});
let mails=()=>env.mails.slice(), m0;

// 1) Andreani a domicilio, pagada en efectivo, con envío bonificado
m0=env.mails.length; const d0=disp('doble');
let r=A('ventaManual',cli({bonificacion:'Envío bonificado'}));
let p=ped()[r.id];
assert.equal(p.estado,'pagado'); assert.equal(p.origen,'fuera'); assert.equal(p.medio,'efectivo'); assert.equal(p.canal,'WhatsApp'); assert.equal(p.pago,'transferencia');
assert.equal(+p.total,75000); assert.equal(+p.descuento,10500,'diferencia con el precio de la web'); assert.equal(p.email,'juana@ej.com');
assert.equal(p._etapa,'preparar'); assert.equal(disp('doble'),d0-1,'descuenta stock');
let nuevos=env.mails.slice(m0); assert.equal(nuevos.length,1); assert.equal(nuevos[0].to,'juana@ej.com'); assert(/Gracias por tu compra/.test(nuevos[0].subject));
assert(/Envío bonificado/.test(nuevos[0].htmlBody) && /efectivo/.test(nuevos[0].htmlBody) && /seguimiento/.test(nuevos[0].htmlBody));
assert.equal(meta(),0,'no se le avisa a Meta');
// entra a la planilla de Andreani igual que una de la web
A('preparado',{ids:[r.id]}); assert.equal(ped()[r.id]._etapa,'etiquetar');
assert.equal(A('exportar',{ids:[r.id]}).cantidad,1);
A('despacharLote',{items:[{id:r.id,tracking:'360000012345'}]}); assert(/en camino/.test(env.mails[env.mails.length-1].subject));
const idAndreani=r.id;

// 2) En mano, ya entregada: gracias ahora y pedido de foto a los 2 días (una sola vez)
m0=env.mails.length;
r=A('ventaManual',cli({entrega:'mano',entregado:true,dni:'',calle:'',numero:'',prov_loc_cp:'',items:[{producto:'individual',cantidad:1,precio:52000}],medio:'transferencia'}));
p=ped()[r.id]; assert.equal(p.estado,'entregado'); assert.equal(p._etapa,'entregado'); assert(p.entregado_el);
nuevos=env.mails.slice(m0); assert.equal(nuevos.length,1); assert(/Gracias por tu compra/.test(nuevos[0].subject)); assert(/En mano/.test(nuevos[0].htmlBody)); assert(!/Envío<\/td>/.test(nuevos[0].htmlBody));
env.ctx.tareaHoraria(); assert.equal(env.mails.filter(m=>/Cómo le quedó/.test(m.subject)).length,0,'todavía no');
hs(49); env.ctx.tareaHoraria(); env.ctx.tareaHoraria();
const fotos=env.mails.filter(m=>/Cómo le quedó/.test(m.subject)); assert.equal(fotos.length,1); assert(/foto de tu mascota/.test(fotos[0].htmlBody));
assert.equal(E('exportar',{ids:[r.id]}),'No hay pedidos pagados para exportar.');

// 3) En mano, la entrega después: Preparar → para entregar → Entregado
r=A('ventaManual',cli({entrega:'mano',dni:'',items:[{producto:'doble',cantidad:2,precio:80000}]}));
p=ped()[r.id]; assert.equal(p._etapa,'preparar'); assert(/despachar|entregado/.test(E('despachar',{id:r.id,tracking:'123456789'})));
A('preparado',{ids:[r.id]}); assert.equal(ped()[r.id]._etapa,'camino','lista para entregar');
assert.equal(E('exportar'),'No hay pedidos pagados para exportar.','la de entrega en mano no va a Andreani');
let rr=A('entregado',{ids:[r.id]}); assert.deepEqual(rr.hechos,[r.id]); assert.equal(ped()[r.id].estado,'entregado');
A('entregado',{ids:[r.id],valor:false}); assert.equal(ped()[r.id].estado,'pagado'); A('entregado',{ids:[r.id]});

// 4) Todavía no me pagó (transferencia): reserva sin vencimiento, stock apartado, mail con el alias; al pagar, sin Meta
m0=env.mails.length; const d1=disp('doble');
r=A('ventaManual',cli({pagado:false,medio:'transferencia'}));
p=ped()[r.id]; assert.equal(p.estado,'reserva'); assert.equal(p._etapa,'confirmar'); assert.equal(p._alerta,null); assert.equal(disp('doble'),d1-1,'queda apartada');
nuevos=env.mails.slice(m0); assert(/losperrines\.mp/.test(nuevos[0].htmlBody),'datos para transferir');
hs(24*10); env.ctx.tareaHoraria(); assert.equal(ped()[r.id].estado,'reserva','no se vence sola');
A('pagado',{id:r.id}); assert.equal(ped()[r.id].estado,'pagado'); assert(/Recibimos tu pago/.test(env.mails[env.mails.length-1].subject)); assert.equal(meta(),0);

// 5) Validaciones
assert(/dni/.test(E('ventaManual',cli({dni:''}))),'Andreani pide DNI');
assert(/email/.test(E('ventaManual',cli({email:''}))),'el mail es obligatorio');
assert(/sucursal/.test(E('ventaManual',cli({entrega:'sucursal'}))));
assert(/stock/.test(E('ventaManual',cli({items:[{producto:'doble',cantidad:40,precio:1}]}))));
assert(/precio/.test(E('ventaManual',cli({items:[{producto:'doble',cantidad:1,precio:0}]}))));
assert(/Elegí qué vendiste/.test(E('ventaManual',cli({items:[]}))));
// sucursal ok
r=A('ventaManual',cli({entrega:'sucursal',sucursal:'SAN LUIS (CENTRO)',calle:'x',numero:'1'})); p=ped()[r.id]; assert.equal(p.sucursal,'SAN LUIS (CENTRO)'); assert.equal(p.calle,'');

// 6) Una de la web sigue avisando a Meta, y Tablero/Publicidad separan las de afuera
const web=P({accion:'pedido',nombre:'Web',apellido:'Cliente',dni:'30111222',email:'web@ej.com',cel_cod:'11',cel_num:'44445555',entrega:'domicilio',calle:'A',numero:'1',prov_loc_cp:'CABA / CABA / 1000',pago:'transferencia',items:[{producto:'doble',cantidad:1}]}).id;
A('pagado',{id:web}); assert.equal(meta(),1,'la de la web sí');
const tb=A('tablero',{dias:30}); assert.equal(tb.ventas.fuera,5); assert.equal(tb.ventas.pedidos,6); assert.equal(tb.ventas.sinEnvio.doble,2); assert.equal(tb.ventas.sinEnvio.individual,1);
const pub=A('publicidad',{dias:30}); assert.equal(pub.ventas.pedidos,1,'Publicidad solo cuenta la de la web');
// reenviar el mail de una venta de afuera
m0=env.mails.length; A('reenviar',{id:idAndreani}); assert(/en camino/.test(env.mails[m0].subject));
console.log('OK venta por fuera de la web');
