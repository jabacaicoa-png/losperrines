// Prueba de "Avisame cuando vuelva" automático: sale solo con la tienda abierta y stock, una vez por persona.
const {makeEnv}=require('./gas-emu'); const assert=require('assert');
const env=makeEnv({file:require('path').join(__dirname,'..','Codigo.gs'),quota:3}); env.ctx.instalar();
const P=b=>{const r=env.post(b); if(!r.ok) throw new Error(b.accion+': '+r.error); return r;};
env.token=env.post({accion:'login',password:'test'}).token;
const A=(a,d)=>P(Object.assign({accion:a,token:env.token},d||{}));
const avisos=()=>env.mails.filter(m=>/Volvieron las fundas/.test(m.subject));
const alDuenio=()=>env.mails.filter(m=>/Les avisé/.test(m.subject));
A('guardarConfig',{valores:{tienda_abierta:'NO',email_aviso:'duenio@ejemplo.com'}});
['a@ej.com','b@ej.com','c@ej.com'].forEach(e=>P({accion:'aviso',email:e}));
P({accion:'aviso',email:'a@ej.com'});   // repetido: no se anota dos veces
// sin stock y tienda abierta: no manda nada
A('guardarConfig',{valores:{tienda_abierta:'SI'}}); assert.equal(avisos().length,0);
A('guardarConfig',{valores:{tienda_abierta:'NO'}});
// con stock pero tienda cerrada: tampoco (el botón "Comprar ahora" llevaría a "Muy pronto")
A('movimiento',{tipo:'ingreso',cantidad:9,motivo:'Tanda',producto:'doble'}); env.ctx.tareaHoraria(); assert.equal(avisos().length,0);
// al abrir la tienda salen en el momento; el cupo de mails es chico (quedan 3 - 5 de margen = ninguno)
A('guardarConfig',{valores:{tienda_abierta:'SI'}}); assert.equal(avisos().length,0,'respeta el límite diario');
// al día siguiente hay cupo: la tarea de cada hora los manda
env.ctx.MailApp.getRemainingDailyQuota=()=>100;
env.ctx.tareaHoraria();
assert.equal(avisos().length,3); assert.deepEqual(avisos().map(m=>m.to).sort(),['a@ej.com','b@ej.com','c@ej.com']);
assert.equal(alDuenio().length,1); assert(/3 personas/.test(alDuenio()[0].subject));
// no se repiten
env.ctx.tareaHoraria(); A('movimiento',{tipo:'ingreso',cantidad:1,motivo:'Otra',producto:'individual'});
assert.equal(avisos().length,3); assert.equal(alDuenio().length,1);
assert.equal(A('resumen').avisos.length,0,'nadie queda esperando');
// alguien nuevo que se anota con stock y tienda abierta recibe el aviso en la próxima corrida
P({accion:'aviso',email:'d@ej.com'}); env.ctx.tareaHoraria(); assert.equal(avisos().length,4); assert(/1 persona que/.test(alDuenio()[1].subject));
console.log('OK avisos automáticos de stock');
