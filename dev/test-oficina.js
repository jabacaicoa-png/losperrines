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
let d=ped(); assert(ids.every(i=>d[i]._etapa==='confirmar')); assert.equal(A('resumen').oficina,1);
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
console.log('OFICINA OK');
