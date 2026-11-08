// Prueba de la "oficina": etapas de la pantalla Hoy, acciones en lote y resumen diario por mail.
const {makeEnv}=require('./gas-emu'); const assert=require('assert');
const env=makeEnv({file:require('path').join(__dirname,'..','Codigo.gs')}); env.ctx.instalar();
require('./seed-store')(env);
let reloj=new Date('2026-11-08T13:00:00-03:00'); env.ctx.ahora=()=>new Date(reloj.getTime());
const hs=h=>{ reloj=new Date(reloj.getTime()+h*3600000); };
const P=b=>{const r=env.post(b); if(!r.ok) throw new Error(b.accion+': '+r.error); return r;};
const A=(a,d)=>P(Object.assign({accion:a,token:env.token},d||{}));
A('guardarConfig',{valores:{email_aviso:'duenio@ejemplo.com',plantilla_andreani_id:'PLANTILLA',url_web:'https://www.losperrines.com.ar'}});
env.ss.insertSheet('A domicilio'); env.ss.insertSheet('A sucursal');
const cli=(n,x)=>Object.assign({accion:'pedido',nombre:n,apellido:'Prueba',dni:'30111222',email:n.toLowerCase()+'@ej.com',cel_cod:'266',cel_num:'4123456',
  entrega:'domicilio',calle:'Pringles',numero:'100',prov_loc_cp:'San Luis, San Luis, 5700',pago:'transferencia',items:[{producto:'doble',cantidad:1}]},x||{});
const ids=['Ana','Beto','Caro','Dani'].map((n,i)=>P(cli(n,i===3?{entrega:'sucursal',sucursal:'San Luis Centro',items:[{producto:'individual',cantidad:2}]}:{})).id);
const ped=()=>Object.fromEntries(A('resumen').pedidos.map(p=>[p.id,p]));
let d=ped(); assert(ids.every(i=>d[i]._etapa==='confirmar')); assert.equal(A('resumen').oficina,2);
// pagar en lote (uno inexistente devuelve error sin frenar al resto)
let mails=env.mails.length;
let r=A('pagadoLote',{ids:[ids[0],ids[1],ids[3],'LP-NO-EXISTE']});
assert.deepEqual(r.hechos,[ids[0],ids[1],ids[3]]); assert.equal(r.errores.length,1);
assert.equal(env.mails.length-mails,3,'un mail por cliente');
d=ped(); assert.equal(d[ids[0]]._etapa,'preparar'); assert.equal(d[ids[2]]._etapa,'confirmar'); assert(d[ids[0]].pagado_el);
// preparar → etiquetar, y volver atrás
A('preparado',{ids:[ids[0],ids[3]]}); d=ped(); assert.equal(d[ids[0]]._etapa,'etiquetar'); assert.equal(d[ids[1]]._etapa,'preparar');
A('preparado',{ids:[ids[3]],valor:false}); assert.equal(ped()[ids[3]]._etapa,'preparar');
assert.equal(A('preparado',{ids:[ids[2]]}).errores.length,1,'no se prepara algo sin pagar');
// exportar solo los elegidos
r=A('exportar',{ids:[ids[0]]}); assert.equal(r.cantidad,1); d=ped(); assert.equal(d[ids[0]]._etapa,'despachar'); assert.equal(d[ids[1]].estado,'pagado');
// despachar en lote: uno bien, uno con número malo, uno sin exportar ni pagar
r=A('despacharLote',{items:[{id:ids[0],tracking:'3600 0001 2345'},{id:ids[1],tracking:'12'},{id:ids[2],tracking:'99999999'}]});
assert.deepEqual(r.hechos,[ids[0]]); assert.equal(r.errores.length,2); d=ped(); assert.equal(d[ids[0]]._etapa,'camino'); assert.equal(d[ids[0]].tracking,'360000012345');
// avisos de atraso
hs(40); d=ped(); assert.equal(d[ids[2]]._alerta.nivel,'warn','transferencia por vencer');
hs(10); d=ped(); assert.equal(d[ids[2]].estado,'vencido'); assert.equal(d[ids[2]]._etapa,'confirmar'); assert.equal(d[ids[2]]._alerta.nivel,'bad');
assert.equal(d[ids[1]]._alerta.nivel,'bad'); assert(/Pagado hace 2 días/.test(d[ids[1]]._alerta.texto));
// resumen diario: no sale antes de la hora, sale una sola vez por día
reloj=new Date('2026-11-10T19:30:00-03:00'); mails=env.mails.length; env.ctx.tareaHoraria(); assert.equal(env.mails.filter(m=>/Resumen/.test(m.subject)).length,0);
reloj=new Date('2026-11-10T20:12:00-03:00'); env.ctx.tareaHoraria();
let res=env.mails.filter(m=>/Resumen del día/.test(m.subject)); assert.equal(res.length,1); assert.equal(res[0].to,'duenio@ejemplo.com');
console.log('Asunto:',res[0].subject);
assert(/1 por confirmar/.test(res[0].subject) && /2 para preparar/.test(res[0].subject) && /atrasado/.test(res[0].subject));
assert(/admin\.html#hoy/.test(res[0].htmlBody)); assert(/Se están atrasando/.test(res[0].htmlBody));
hs(1); env.ctx.tareaHoraria(); assert.equal(env.mails.filter(m=>/Resumen del día/.test(m.subject)).length,1,'una vez por día');
// lo nuevo desde el resumen anterior
P(cli('Eli')); hs(1); r=A('pagadoLote',{ids:[ids[2]]}); assert.equal(r.hechos.length,1,'vencido con stock se puede pagar igual');
reloj=new Date('2026-11-11T20:05:00-03:00'); env.ctx.tareaHoraria();
res=env.mails.filter(m=>/Resumen del día/.test(m.subject)); assert.equal(res.length,2);
assert(/1 pedido nuevo<\/b> y <b>1 pago confirmado<\/b>/.test(res[1].htmlBody), res[1].htmlBody.slice(0,1500));
// "mandarme uno ahora" no cambia el día del automático; hora vacía = no se manda
r=A('resumenAhora'); assert(/Resumen del día/.test(r.asunto));
A('guardarConfig',{valores:{resumen_hora:''}}); reloj=new Date('2026-11-12T21:00:00-03:00'); const n=env.mails.length; env.ctx.tareaHoraria();
assert.equal(env.mails.filter((m,i)=>i>=n&&/Resumen del día/.test(m.subject)).length,0);
// ---------- entrega: "¿Ya te llegó?" ----------
A('guardarConfig',{valores:{resumen_hora:'20'}});
const ent=ids[0]; // despachado el 08/11 13:00
const tareas=()=>env.ctx.tareaHoraria(), consultas=()=>env.mails.filter(m=>/Ya te llegó/.test(m.subject));
reloj=new Date('2026-11-12T14:00:00-03:00'); tareas(); assert.equal(consultas().length,0,'antes de 5 días no pregunta');
reloj=new Date('2026-11-13T14:00:00-03:00'); tareas(); assert.equal(consultas().length,1); assert.equal(consultas()[0].to,'ana@ej.com');
tareas(); assert.equal(consultas().length,1,'pregunta una sola vez');
const html=consultas()[0].htmlBody, link=r=>{ const m=html.match(new RegExp('entrega=([^&]+)&r='+r+'&t=([^"]+)')); return {entrega:decodeURIComponent(m[1]),r:r,t:m[2]}; };
// link falsificado
assert(/no válido/.test(env.ctx.doGet({parameter:{entrega:ent,r:'si',t:'trucho'}}).html));
// abrir el link solo muestra el botón (un antivirus que lo abre no marca nada)
let pg=env.ctx.doGet({parameter:link('si')}).html; assert(/Sí, recibí mi pedido/.test(pg)); assert.equal(ped()[ent].estado,'despachado');
let n0=env.mails.length; pg=env.ctx.doGet({parameter:Object.assign(link('si'),{ok:'1'})}).html;
assert(/instagram\.com\/losperrines_/.test(pg) && /foto de tu mascota/.test(pg));
d=ped(); assert.equal(d[ent].estado,'entregado'); assert.equal(d[ent]._etapa,'entregado');
assert.equal(env.mails.length-n0,1,'mail de gracias'); assert(/losperrines_/.test(env.mails.at(-1).htmlBody));
env.ctx.doGet({parameter:Object.assign(link('si'),{ok:'1'})}); assert.equal(env.mails.length-n0,1,'no repite el gracias');
// problema después de recibir: vuelve a la vista con aviso rojo y le avisa al dueño
pg=env.ctx.doGet({parameter:Object.assign(link('problema'),{ok:'1',detalle:'Llegó con un cierre roto'})}).html; assert(/Gracias por avisarnos/.test(pg));
assert(/URGENTE.*cierre roto/.test(env.mails.at(-1).subject)); assert.equal(env.mails.at(-1).to,'duenio@ejemplo.com');
d=ped(); assert.equal(d[ent]._etapa,'camino'); assert.equal(d[ent]._alerta.nivel,'bad'); assert(/cierre roto/.test(d[ent].notas));
A('problemaResuelto',{id:ent}); d=ped(); assert.equal(d[ent]._etapa,'entregado'); assert(/resuelto/.test(d[ent].notas));
// marcar a mano y volver atrás
r=A('entregado',{ids:[ent,ids[1]]}); assert.equal(r.errores.length,2,'ya entregado y sin despachar dan error'); assert(/ya figura entregado/.test(r.errores[0].error));
A('entregado',{ids:[ent],valor:false}); assert.equal(ped()[ent].estado,'despachado');
r=A('entregado',{ids:[ent]}); assert.deepEqual(r.hechos,[ent]);
// a los 7 días sale de la vista; sigue contando como venta
reloj=new Date('2026-11-21T14:00:00-03:00'); d=ped(); assert.equal(d[ent]._etapa,''); assert(A('resumen').stock.doble.vendidas>=1);
// aviso de demora: despachado hace 7+ días sin confirmar
P(cli('Fede')); const fe=Object.values(ped()).find(p=>p.nombre==='Fede').id;
A('pagadoLote',{ids:[fe]}); A('despacharLote',{items:[{id:fe,tracking:'11112222'}]});
A('guardarConfig',{valores:{consulta_entrega_dias:''}}); reloj=new Date('2026-11-29T14:00:00-03:00'); const nc=consultas().length; tareas();
assert.equal(consultas().length,nc,'vacío = no pregunta'); assert.equal(ped()[fe]._alerta.nivel,'warn');
console.log('ENTREGA OK');
console.log('OFICINA OK');
