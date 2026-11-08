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
// ---------- pantalla Publicidad: lectura de resultados ----------
let insights=null; // null = Meta rechaza por permisos
const env2=makeEnv({file:require('path').join(__dirname,'..','Codigo.gs'),fetch:(url)=>{
  if(!/graph\.facebook\.com/.test(url)) return null;
  if(/\/insights/.test(url)){ if(!insights) return {getResponseCode:()=>400,getContentText:()=>'{"error":{"message":"(#200) Missing ads_read permission"}}'};
    const camp=/level=campaign/.test(url); return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({data:camp?insights.campanas:[insights.total]})}; }
  return {getResponseCode:()=>200,getContentText:()=>'{}'}; }});
env2.ctx.instalar(); require('./seed-store')(env2);
const A2=(a,d)=>{const r=env2.post(Object.assign({accion:a,token:env2.token},d||{})); if(!r.ok) throw new Error(a+': '+r.error); return r;};
let pub=A2('publicidad',{dias:7}); assert.equal(pub.meta.falta,'token');
env2.props.META_CAPI_TOKEN='solo-envio'; pub=A2('publicidad',{dias:7,forzar:1}); assert(/permiso ads_read/.test(pub.meta.error),'token sin permiso: explica qué falta');
env2.props.META_ADS_TOKEN='lectura'; insights={total:{spend:'0'},campanas:[]}; pub=A2('publicidad',{dias:7,forzar:1});
assert.equal(pub.meta.total.inversion,0); assert.equal(pub.meta.campanas.length,0); assert.equal(pub.ventas.pedidos,0);
insights={total:{spend:'60000.5',impressions:'12000',inline_link_clicks:'300',inline_link_click_ctr:'2.5',frequency:'1.8',
  actions:[{action_type:'landing_page_view',value:'220'},{action_type:'add_to_cart',value:'30'},{action_type:'offsite_conversion.fb_pixel_add_to_cart',value:'30'},{action_type:'initiate_checkout',value:'12'},{action_type:'omni_purchase',value:'4'},{action_type:'purchase',value:'4'}],
  action_values:[{action_type:'omni_purchase',value:'342000'}]},
  campanas:[{campaign_id:'1',campaign_name:'Chica',spend:'10000',frequency:'4.2',inline_link_click_ctr:'0.6',impressions:'5000'},{campaign_id:'2',campaign_name:'Grande',spend:'50000.5',actions:[{action_type:'purchase',value:'4'}]}]};
assert.equal(A2('publicidad',{dias:7}).meta.total.inversion,0,'usa lo guardado 10 minutos');
pub=A2('publicidad',{dias:7,forzar:1}); const tt=pub.meta.total;
assert.equal(tt.inversion,60000.5); assert.equal(tt.compras,4,'no suma dos veces omni + purchase'); assert.equal(tt.carrito,30); assert.equal(tt.visitas,220); assert.equal(tt.facturado,342000);
assert.deepEqual(pub.meta.campanas.map(c=>c.nombre),['Grande','Chica'],'ordenadas por inversión');
assert.match(env2.fetches.filter(f=>/insights/.test(f.url)).at(-1).url,/act_1181977813835023\/insights.*time_range=/);
// ventas reales del período (por fecha de pago)
const pv=env2.post({accion:'pedido',nombre:'Ana',apellido:'Test',dni:'30111222',email:'a@ej.com',cel_cod:'266',cel_num:'4123456',entrega:'domicilio',calle:'X',numero:'1',prov_loc_cp:'San Luis 5700',pago:'transferencia',items:[{producto:'doble',cantidad:2}]}).id;
A2('pagado',{id:pv}); pub=A2('publicidad',{dias:1}); assert.equal(pub.ventas.pedidos,1); assert.equal(pub.ventas.unidades.doble,2); assert.equal(pub.ventas.neto,85500*2);
console.log('PUBLICIDAD OK');
