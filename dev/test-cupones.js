// Códigos de descuento: porcentaje o monto fijo en $ por funda (16/11/2026). Uso: node dev/test-cupones.js
const {makeEnv}=require('./gas-emu'); const assert=require('assert');
const env=makeEnv({file:require('path').join(__dirname,'..','Codigo.gs')}); env.ctx.instalar(); require('./seed-store.js')(env);
const tok=env.token; const P=b=>{const r=env.post(b); if(!r.ok) throw new Error(b.accion+': '+r.error); return r;};
P({accion:'guardarCupon',token:tok,codigo:'emiliano',monto:2000,porcentaje:10,unico:true});
P({accion:'guardarCupon',token:tok,codigo:'VOLVE10',porcentaje:10});
let r=env.post({accion:'guardarCupon',token:tok,codigo:'MAL'}); assert(!r.ok);
const v=P({accion:'cupon',codigo:'EMILIANO',email:'a@b.com'}); assert.equal(+v.monto,2000);
const datos={nombre:'Ana',apellido:'P',dni:'30111222',email:'ana@x.com',cel_cod:'266',cel_num:'4111111',cp:'5700',prov_loc_cp:'SAN LUIS / SAN LUIS / 5700',entrega:'sucursal',sucursal:'San Luis Centro',pago:'transferencia'};
const o=P(Object.assign({accion:'pedido',cupon:'EMILIANO',items:[{producto:'doble',cantidad:2}]},datos));
console.log('2 dobles con EMILIANO:',o.total,o.descuento); assert.equal(o.descuento,4000); assert.equal(o.total,85500*2-4000);
const o2=P(Object.assign({accion:'pedido',cupon:'VOLVE10',items:[{producto:'doble',cantidad:1}]},datos,{email:'b@x.com'}));
console.log('1 doble con VOLVE10:',o2.total,o2.descuento); assert.equal(o2.descuento,8550);
r=env.post(Object.assign({accion:'pedido',cupon:'EMILIANO',items:[{producto:'doble',cantidad:1}]},datos)); assert(!r.ok&&/Ya usaste/.test(r.error)); 
console.log('ok');
