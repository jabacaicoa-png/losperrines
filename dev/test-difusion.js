// Mail a tus contactos (24/11/2026). Uso: node dev/test-difusion.js
process.env.TZ='America/Argentina/Buenos_Aires';
const {makeEnv}=require('./gas-emu'); const assert=require('assert');
const env=makeEnv({file:require('path').join(__dirname,'..','Codigo.gs'),quota:40}); env.ctx.instalar(); require('./seed-store.js')(env);
const tok=env.token, P=b=>{const r=env.post(Object.assign({token:tok},b)); if(!r.ok) throw new Error(b.accion+': '+r.error); return r;};
P({accion:'guardarConfig',valores:{email_aviso:'yo@lp.com',url_web:'https://www.losperrines.com.ar'}});
const lista=['ana@gmail.com Ana','Juan Pérez <juan@hotmail.com>','sin mail acá','ANA@gmail.com','pepe@x.com'];
for(let i=0;i<40;i++) lista.push('c'+i+'@mail.com');
let r=P({accion:'difusionCargar',texto:lista.join('\n')});
assert.equal(r.agregados,43); assert.equal(r.repetidos,1); assert.equal(r.invalidos,1);
assert.equal(r.estado.pendiente,43); assert.equal(r.estado.hoy,30,'cuota 40 - 10 para las ventas');
// baja: alguien ya dado de baja no recibe
const linkBaja=env.ctx.linkBaja('pepe@x.com'); const t=linkBaja.match(/t=([^&]+)/)[1]; env.ctx.darDeBaja('pepe@x.com',decodeURIComponent(t));
const mail={asunto:'🐶 Hola',texto:'Te quería contar de {nombre} y mi proyecto.',regalo:'🎁 $3.000 extra\nRespondé QUIERO',firma:'¡Gracias!',extraEnvio:'en San Luis en mano'};
const m0=env.mails.length; P(Object.assign({accion:'difusionPrueba'},mail)); assert.equal(env.mails[m0].to,'yo@lp.com'); assert(/\[Prueba\]/.test(env.mails[m0].subject));
const h=env.mails[m0].htmlBody; assert(/3 cuotas sin interés de/.test(h)&&/\$31\.667/.test(h)&&/\$85\.500/.test(h),'precios de la web'); assert(/10% OFF/.test(h)); assert(/darte de baja/.test(h)); assert(/img\/mail-perro\.jpg/.test(h));
const m1=env.mails.length; r=P(Object.assign({accion:'difusionEnviar',cantidad:100},mail));
assert.equal(r.enviados,30,'no pasa el cupo del día'); const env1=env.mails.slice(m1);
assert(env1.some(m=>m.to==='ana@gmail.com'&&/Hola <b>Ana<\/b>/.test(m.htmlBody)),'con el nombre');
assert(env1.some(m=>m.to==='juan@hotmail.com'&&/Hola <b>Juan<\/b>/.test(m.htmlBody)),'nombre de "Juan Pérez <mail>"');
assert(!env1.some(m=>m.to==='pepe@x.com'),'al de baja no'); assert(env1.every(m=>m.replyTo==='yo@lp.com'),'las respuestas te llegan a vos');
assert.equal(r.estado.pendiente,43-30-1);
r=env.post({accion:'difusionCargar',token:tok,texto:'ana@gmail.com'}); assert.equal(r.repetidos,1,'no le manda dos veces');
r=P({accion:'difusionVaciar'}); assert.equal(r.borrados,12); assert.equal(r.estado.enviado,30);
console.log('ok');
