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
