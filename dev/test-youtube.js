// Videos de YouTube por link en Fotos y videos (18/11/2026): node dev/test-youtube.js
const {makeEnv}=require('./gas-emu'); const assert=require('assert');
const env=makeEnv({file:require('path').join(__dirname,'..','Codigo.gs')});
env.ctx.instalar(); require('./seed-store')(env);
const A=(a,d)=>env.post(Object.assign({accion:a,token:env.token},d||{}));
for(const [u,id] of [['https://youtu.be/dQw4w9WgXcQ?si=abc','dQw4w9WgXcQ'],['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3','dQw4w9WgXcQ'],['https://youtube.com/shorts/AbCdEfGhIjK?feature=share','AbCdEfGhIjK'],['https://m.youtube.com/watch?feature=x&v=AbCdEfGhIjK','AbCdEfGhIjK']])
  assert.strictEqual(env.ctx.idYoutube(u),id,u);
assert(A('linkMedia',{destino:'individual',url:'https://google.com'}).error,'link que no es de YouTube');
const r=A('linkMedia',{destino:'individual',url:'https://youtube.com/shorts/AbCdEfGhIjK'}); assert(r.ok,r.error);
let m=env.post({accion:'config'}).media.filter(x=>x.destino==='individual');
assert.strictEqual(m.length,1); assert.strictEqual(m[0].tipo,'yt'); assert.strictEqual(m[0].drive,'AbCdEfGhIjK'); assert.strictEqual(m[0].principal,false);
assert(A('linkMedia',{url:'https://youtu.be/dQw4w9WgXcQ'}).ok); 
assert(A('borrarMedia',{id:r.id}).ok);
assert.strictEqual(env.post({accion:'config'}).media.filter(x=>x.destino==='individual').length,0);
console.log('YOUTUBE OK');
