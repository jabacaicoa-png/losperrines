// Prueba del Tablero: ventas con comparación, transferencias, días de stock y Google Analytics (simulado).
const {makeEnv}=require('./gas-emu'); const assert=require('assert');
let llamadasGA=0, gaFalla=false;
const ga={Properties:{batchRunReports:(req,prop)=>{ llamadasGA++; if(gaFalla) throw new Error('User does not have sufficient permissions for this property');
  assert.equal(prop,'properties/471234567'); assert.equal(req.requests.length,5);
  return {reports:[
    {dimensionHeaders:[{name:'dateRange'}],rows:[{dimensionValues:[{value:'actual'}],metricValues:[{value:'400'},{value:'350'},{value:'300'}]},{dimensionValues:[{value:'anterior'}],metricValues:[{value:'200'},{value:'180'},{value:'150'}]}]},
    {rows:[{dimensionValues:[{value:'Organic Social'}],metricValues:[{value:'250'}]},{dimensionValues:[{value:'Direct'}],metricValues:[{value:'150'}]}]},
    {rows:[{dimensionValues:[{value:'mobile'}],metricValues:[{value:'340'}]},{dimensionValues:[{value:'desktop'}],metricValues:[{value:'60'}]}]},
    {rows:[{dimensionValues:[{value:'San Luis Province'}],metricValues:[{value:'200'}]}]},
    {rows:[{dimensionValues:[{value:'view_item_list'}],metricValues:[{value:'380'}]},{dimensionValues:[{value:'add_to_cart'}],metricValues:[{value:'40'}]},{dimensionValues:[{value:'begin_checkout'}],metricValues:[{value:'15'}]}]}]}; }}};
const env=makeEnv({file:require('path').join(__dirname,'..','Codigo.gs'),extra:{AnalyticsData:ga}});
env.ctx.instalar(); require('./seed-store')(env);
let reloj=new Date('2026-11-20T12:00:00-03:00'); env.ctx.ahora=()=>new Date(reloj.getTime());
const P=b=>{const r=env.post(b); if(!r.ok) throw new Error(b.accion+': '+r.error); return r;};
const A=(a,d)=>P(Object.assign({accion:a,token:env.token},d||{}));
A('movimiento',{tipo:'ingreso',cantidad:20,motivo:'x',producto:'doble'});
const ped=()=>P({accion:'pedido',nombre:'A',apellido:'B',dni:'30111222',email:'a@ej.com',cel_cod:'266',cel_num:'4123456',entrega:'domicilio',calle:'X',numero:'1',prov_loc_cp:'SL 5700',pago:'transferencia',items:[{producto:'doble',cantidad:1}]}).id;
// período anterior: 1 venta; período actual: 3 ventas, 1 reserva sin pagar
reloj=new Date('2026-11-10T12:00:00-03:00'); A('pagado',{id:ped()});
reloj=new Date('2026-11-18T12:00:00-03:00'); A('pagado',{id:ped()}); A('pagado',{id:ped()}); A('pagado',{id:ped()}); ped();
reloj=new Date('2026-11-20T12:00:00-03:00');
// sin propiedad de GA
let t=A('tablero',{dias:7}); assert.equal(t.ga.falta,'propiedad');
assert.equal(t.ventas.pedidos,3); assert.equal(t.anterior.pedidos,1); assert.equal(t.ventas.facturado,3*85500); assert.equal(t.ventas.unidades,3);
assert.deepEqual(t.reservas,{total:4,pagadas:3,vencidas:0,esperando:1});
assert.equal(t.stock.doble.disponible,29-4,'9+20 ingresadas, 4 vendidas (la reserva ya venció)'); assert.equal(t.stock.doble.porDia,Math.round(4/30*100)/100); assert.equal(t.stock.doble.dias,Math.floor(25/(4/30)));
assert.equal(t.meta.falta,'token');
// con GA
A('guardarConfig',{valores:{ga_property_id:'471234567'}}); t=A('tablero',{dias:7});
assert.equal(t.ga.total.actual.sesiones,400); assert.equal(t.ga.total.anterior.sesiones,200); assert.equal(t.ga.canales[0].nombre,'Organic Social');
assert.equal(t.ga.eventos.add_to_cart,40); assert.equal(t.ga.dispositivos[0].nombre,'mobile');
A('tablero',{dias:7}); assert.equal(llamadasGA,1,'usa lo guardado 30 minutos'); A('tablero',{dias:7,forzar:1}); assert.equal(llamadasGA,2);
// sin el servicio agregado
const env2=makeEnv({file:require('path').join(__dirname,'..','Codigo.gs')}); env2.ctx.instalar(); require('./seed-store')(env2);
env2.post({accion:'guardarConfig',token:env2.token,valores:{ga_property_id:'1'}}); assert.equal(env2.post({accion:'tablero',token:env2.token,dias:7}).ga.falta,'servicio');
// sin permiso
gaFalla=true; t=A('tablero',{dias:30,forzar:1}); assert(/no tiene acceso/.test(t.ga.error)); assert.equal(t.ventas.pedidos,4,'las ventas se ven igual');
console.log('TABLERO OK');
