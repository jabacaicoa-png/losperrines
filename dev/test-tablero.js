// Prueba del Tablero: ventas con comparación, transferencias, días de stock y Google Analytics (simulado).
const {makeEnv}=require('./gas-emu'); const assert=require('assert');
let llamadasGA=0, gaFalla=false, gaCupo=0;
const ga={Properties:{batchRunReports:(req,prop)=>{ llamadasGA++; if(gaCupo){gaCupo--; throw new Error('Exhausted concurrent requests quota. Please send fewer requests concurrently.');} if(gaFalla) throw new Error('User does not have sufficient permissions for this property');
  assert.equal(prop,'properties/471234567');
  const fila=(d,m)=>({dimensionValues:d.map(v=>({value:v})),metricValues:[{value:String(m)}]});
  const soloAR=q=>q.dimensionFilter&&q.dimensionFilter.filter&&q.dimensionFilter.filter.fieldName==='countryId'&&q.dimensionFilter.filter.stringFilter.value==='AR';
  if(req.requests.length===3){ assert(!soloAR(req.requests[0]),'las fuentes cuentan todo'); assert(soloAR(req.requests[1])&&soloAR(req.requests[2]),'provincias y ciudades: solo Argentina'); }
  else { assert(soloAR(req.requests[3]),'provincias del primer pedido: solo Argentina'); assert(!req.requests[0].dimensionFilter,'el total cuenta todo'); }
  if(req.requests.length===3) return {reports:[
    {rows:[fila(['l.instagram.com','referral'],180),fila(['ig','paid'],90),fila(['m.facebook.com','referral'],40),fila(['(direct)','(none)'],60),fila(['google','organic'],30)]},
    {rows:[fila(['San Luis Province'],150),fila(['Cordoba Province'],100),fila(['Buenos Aires'],80),fila(['Buenos Aires Province'],70)]},
    {rows:[fila(['San Luis','San Luis Province'],90),fila(['Villa Mercedes','San Luis Province'],60),fila(['Cordoba','Cordoba Province'],100),fila(['Buenos Aires','Buenos Aires'],80)]}]};
  assert.equal(req.requests.length,5);
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
const ped=()=>P({accion:'pedido',nombre:'A',apellido:'B',dni:'30111222',email:'a@ej.com',cel_cod:'266',cel_num:'4123456',entrega:'domicilio',calle:'X',numero:'1',prov_loc_cp:(globalThis.DEST||'SAN LUIS / SAN LUIS / 5700'),pago:'transferencia',items:[{producto:'doble',cantidad:1}]}).id;
// período anterior: 1 venta; período actual: 3 ventas, 1 reserva sin pagar
reloj=new Date('2026-11-10T12:00:00-03:00'); A('pagado',{id:ped()});
reloj=new Date('2026-11-18T12:00:00-03:00'); A('pagado',{id:ped()}); globalThis.DEST='CORDOBA / CORDOBA / 5000'; A('pagado',{id:ped()}); globalThis.DEST='CAPITAL FEDERAL / PALERMO / 1425'; A('pagado',{id:ped()}); globalThis.DEST=''; ped();
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
A('tablero',{dias:7}); assert.equal(llamadasGA,2,'usa lo guardado 30 minutos (2 pedidos la primera vez)'); A('tablero',{dias:7,forzar:1}); assert.equal(llamadasGA,4);
// fuentes y zonas
assert.equal(t.ga.fuentes.length,5); assert.equal(t.ga.fuentes[1].medio,'paid');
const Z=t.zonas, pz=k=>Z.provincias.find(x=>x.clave===k);
assert.deepEqual([pz('san luis').visitas,pz('san luis').ventas],[150,1]);
assert.deepEqual([pz('cordoba').visitas,pz('cordoba').ventas],[100,1]);
assert.deepEqual([pz('capital federal').visitas,pz('capital federal').ventas],[80,1],'"Buenos Aires" de Analytics es la Ciudad');
assert.deepEqual([pz('buenos aires').visitas,pz('buenos aires').ventas],[70,0],'"Buenos Aires Province" es la provincia');
assert(Z.ciudades.find(x=>x.nombre==='Villa Mercedes' && x.visitas===60 && x.ventas===0)); assert(Z.ciudades.find(x=>x.nombre==='Ciudad de Buenos Aires' && x.ventas===1 && x.visitas===80),'los barrios de Capital se juntan con la ciudad de Analytics');
// sin Analytics, igual muestra dónde se vendió
assert.equal(env.post({accion:'tablero',token:env.token,dias:7}).zonas.provincias.length>=3,true);
// sin el servicio agregado
const env2=makeEnv({file:require('path').join(__dirname,'..','Codigo.gs')}); env2.ctx.instalar(); require('./seed-store')(env2);
env2.post({accion:'guardarConfig',token:env2.token,valores:{ga_property_id:'1'}}); assert.equal(env2.post({accion:'tablero',token:env2.token,dias:7}).ga.falta,'servicio');
// sin permiso
gaFalla=true; t=A('tablero',{dias:30,forzar:1}); assert(/no tiene acceso/.test(t.ga.error)); assert.equal(t.ventas.pedidos,4,'las ventas se ven igual');
gaFalla=false;
// Google sin cupo un momento: reintenta y trae los números
gaCupo=2; t=A('tablero',{dias:30,forzar:1}); assert(t.ga.total&&!t.ga.viejo,'reintenta y anda'); assert(t.ga.guardado);
// Google sin cupo todo el rato: muestra los últimos números buenos
gaCupo=99; t=A('tablero',{dias:30,forzar:1}); assert(t.ga.viejo&&t.ga.total,'usa los últimos buenos'); assert(/Exhausted/.test(t.ga.detalle));
// sin números guardados (otro período): aviso de falla momentánea
t=A('tablero',{dias:3,forzar:1}); assert.equal(t.ga.error,'temporal'); gaCupo=0;
console.log('TABLERO OK');
