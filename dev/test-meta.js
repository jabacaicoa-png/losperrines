// Prueba del aviso de compras a Meta (API de Conversiones), con Meta simulado.
const {makeEnv}=require('./gas-emu'); const assert=require('assert'); const crypto=require('crypto');
let respuesta={code:200,body:'{"events_received":1}'};
const env=makeEnv({file:require('path').join(__dirname,'..','Codigo.gs'),fetch:(url)=>/graph\.facebook\.com/.test(url)?{getResponseCode:()=>respuesta.code,getContentText:()=>respuesta.body}:null});
env.ctx.instalar(); require('./seed-store')(env);
env.post({accion:'movimiento',token:env.token,tipo:'ingreso',cantidad:20,motivo:'prueba',producto:'individual'}); env.post({accion:'movimiento',token:env.token,tipo:'ingreso',cantidad:20,motivo:'prueba',producto:'doble'});
const P=b=>{const r=env.post(b); if(!r.ok) throw new Error(b.accion+': '+r.error); return r;};
const A=(a,d)=>P(Object.assign({accion:a,token:env.token},d||{}));
const meta=()=>env.fetches.filter(f=>/graph\.facebook\.com/.test(f.url));
const h=v=>crypto.createHash('sha256').update(v).digest('hex');
const ped=(x)=>P(Object.assign({accion:'pedido',nombre:'Ana María',apellido:'Pérez',dni:'30111222',email:'Ana@Ej.com',cel_cod:'266',cel_num:'4123456',entrega:'domicilio',calle:'Pringles',numero:'1',prov_loc_cp:'San Luis, San Luis, 5700',pago:'transferencia',items:[{producto:'doble',cantidad:1},{producto:'individual',cantidad:1}]},x||{})).id;
// sin token: no llama a Meta y el pago se registra igual
let id=ped(); A('pagado',{id}); assert.equal(meta().length,0);
assert.equal(A('resumen').meta.token,false);
assert(/META_CAPI_TOKEN/.test(env.post({accion:'probarMeta',token:env.token}).error));
// con token
env.props.META_CAPI_TOKEN='TOKEN-DE-PRUEBA';
id=ped(); A('pagado',{id}); assert.equal(meta().length,1);
let f=meta()[0], body=JSON.parse(f.o.payload), ev=body.data[0];
assert(f.url.startsWith('https://graph.facebook.com/v21.0/1067987206265090/events?access_token=TOKEN-DE-PRUEBA'));
assert.equal(ev.event_name,'Purchase'); assert.equal(ev.event_id,'compra-'+id); assert.equal(ev.action_source,'website');
assert.equal(ev.custom_data.value,85500+58500); assert.equal(ev.custom_data.currency,'ARS'); assert.deepEqual(ev.custom_data.content_ids,['doble','individual']); assert.equal(ev.custom_data.num_items,2);
assert.deepEqual(ev.user_data.em,[h('ana@ej.com')]); assert.deepEqual(ev.user_data.ph,[h('5492664123456')]); assert.deepEqual(ev.user_data.fn,[h('ana')]); assert.deepEqual(ev.user_data.zp,[h('5700')]);
assert(!JSON.stringify(body).includes('Ana@Ej.com') && !JSON.stringify(body).includes('4123456'),'no viajan datos sin cifrar');
assert.equal(body.test_event_code,undefined); assert(A('resumen').meta.ok);
// también en lote, y con código de prueba
A('guardarConfig',{valores:{meta_test_code:'TEST73340'}});
const id2=ped(); A('pagadoLote',{ids:[id2]}); assert.equal(JSON.parse(meta().at(-1).o.payload).test_event_code,'TEST73340');
// tarjeta aprobada por Mercado Pago (webhook): mismo identificador que la web
const id3=ped(); { const p=env.ctx.pedido(id3); env.ctx.setear('Pedidos',p._fila,{pago:'tarjeta',estado:'pendiente_mp'}); } env.ctx.procesarPago({external_reference:id3,status:'approved',id:999,transaction_amount:95000});
ev=JSON.parse(meta().at(-1).o.payload).data[0]; assert.equal(ev.event_id,'compra-'+id3); assert.equal(ev.custom_data.value,95000); assert.equal(ev.custom_data.payment_type,'tarjeta');
// probar conexión
const n=meta().length; assert.equal(A('probarMeta').codigo,'TEST73340'); assert.equal(meta().length,n+1); assert.equal(JSON.parse(meta().at(-1).o.payload).data[0].custom_data.value,1);
A('guardarConfig',{valores:{meta_test_code:''}}); assert(/código de "Probar eventos"/.test(env.post({accion:'probarMeta',token:env.token}).error),'sin código no prueba');
// si Meta falla, el pago queda registrado y el error se ve en el panel
respuesta={code:400,body:'{"error":{"message":"Invalid OAuth access token."}}'};
const id4=ped(); A('pagado',{id:id4}); const r=A('resumen');
assert.equal(r.pedidos.find(p=>p.id===id4).estado,'pagado'); assert(/Invalid OAuth/.test(r.meta.error));
respuesta={code:200,body:'{}'}; const id5=ped(); A('pagado',{id:id5}); assert.equal(A('resumen').meta.error,'');
console.log('META OK');
// si la planilla deformó el ID del píxel (notación científica), se usa el de la web
A('guardarConfig',{valores:{meta_pixel_id:'1,06799E+15'}}); const id6=ped(); A('pagado',{id:id6});
assert(meta().at(-1).url.includes('/1067987206265090/events'));
console.log('ID DEFORMADO OK');
