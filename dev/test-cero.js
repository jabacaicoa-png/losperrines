// Prueba de "Empezar de cero": borra solo lo de prueba y deja el stock en el conteo real.
const {makeEnv}=require('./gas-emu'); const assert=require('assert');
const env=makeEnv({file:require('path').join(__dirname,'..','Codigo.gs')}); env.ctx.instalar(); require('./seed-store')(env);
const P=b=>{const r=env.post(b); if(!r.ok) throw new Error(b.accion+': '+r.error); return r;};
const A=(a,d)=>P(Object.assign({accion:a,token:env.token},d||{}));
// datos reales del taller
A('tallerMigrar',{data:{proveedores:[{id:'PV1',nombre:'Mercería'}],insumos:[{id:'tela',nombre:'Matelassé',proveedor:'PV1',envase:'metro',contenido:1,unidad:'m',precio:7000}],stock:[{insumo:'tela',cantidad:60}],
  fichas:[{producto:'doble',medidas:{an:125,t1:48},receta:[{insumo:'tela',auto:'tela'}],confeccion:10000}],compras:[{id:'C1',proveedor:'PV1',detalle:'Tela',total:420000}],pagos:[{proveedor:'PV1',monto:150000,compra:'C1'}]}});
A('guardarConfig',{valores:{email_aviso:'d@ej.com',alias:'mi.alias'}});
// datos de prueba
const ped=x=>P(Object.assign({accion:'pedido',nombre:'Ana',apellido:'T',dni:'30111222',email:'a@ej.com',cel_cod:'266',cel_num:'4123456',entrega:'domicilio',calle:'X',numero:'1',prov_loc_cp:'San Luis 5700',pago:'transferencia',items:[{producto:'doble',cantidad:2}]},x||{})).id;
const p1=ped(); A('pagado',{id:p1}); ped();
P({accion:'carrito',email:'b@ej.com',items:[{producto:'doble',cantidad:1}]}); P({accion:'aviso',email:'interesado@ej.com'});
A('guardarCupon',{codigo:'PRUEBA10',porcentaje:10});
const antes=A('taller'); const stockAntes=A('resumen').stock;
assert.equal(stockAntes.doble.disponible,9-4,'2 vendidas + 2 reservadas');
// vista previa
const pv=A('ceroPreview'); assert.equal(pv.pedidos,2); assert(pv.carritos>=1); assert.deepEqual(pv.avisos,['interesado@ej.com']); assert.deepEqual(pv.cupones,['PRUEBA10']);
assert.equal(pv.stockSinPruebas.doble,9); assert.equal(pv.stockSinPruebas.individual,3);
// sin confirmar no borra
assert(/BORRAR/.test(env.post({accion:'dejarEnCero',token:env.token,confirmar:'borrar'}).error)); assert.equal(A('ceroPreview').pedidos,2);
// borrar, conservando avisos y cupones, con conteo real
const r=A('dejarEnCero',{confirmar:'BORRAR',stock:{doble:'8',individual:''}});
assert.equal(env.copias.length,1,'hace el respaldo antes'); assert(/respaldo antes de empezar de cero/.test(env.copias[0].nombre)); assert(r.respaldo);
assert.equal(r.pedidos,2); assert.equal(r.avisos,0); assert.equal(r.cupones,0);
const d=A('resumen'); assert.equal(d.pedidos.length,0); assert.equal(d.ventasMes.unidades,0);
assert.equal(d.stock.doble.disponible,8,'queda el conteo real'); assert.equal(d.stock.individual.disponible,3,'sin conteo, no se toca');
assert.deepEqual(r.ajustes,[{producto:'doble',cantidad:-1,queda:8}]);
assert(d.movimientos.some(m=>/Conteo real/.test(m.motivo))); assert(d.movimientos.some(m=>m.motivo==='Lote 1'),'los movimientos reales quedan');
assert.deepEqual(d.avisos,['interesado@ej.com']); assert.equal(d.config.alias,'mi.alias');
const despues=A('taller');
['insumos','fichas','compras','pagos','proveedores','tandas'].forEach(k=>assert.deepEqual(despues[k],antes[k],k+' no se toca'));
assert.equal(A('recuperar').lista.length,0);
// la tienda sigue andando: un pedido nuevo arranca la numeración y descuenta del stock real
const p2=ped(); assert(/-001$/.test(p2)); assert.equal(A('resumen').stock.doble.disponible,6);
// segunda vez, borrando también avisos y cupones
const r2=A('dejarEnCero',{confirmar:'BORRAR',avisos:true,cupones:true}); assert.equal(r2.avisos,1); assert.equal(r2.cupones,1); assert.equal(A('resumen').avisos.length,0);
console.log('CERO OK');
