const {makeEnv}=require('./gas-emu'); const assert=require('assert');
const env=makeEnv({file:require('path').join(__dirname,'..','Codigo.gs')}); env.ctx.instalar();
const P=b=>{const r=env.post(b); if(!r.ok) throw new Error(b.accion+': '+r.error); return r;};
const bad=(b,re)=>{const r=env.post(b); assert(!r.ok && re.test(r.error), b.accion+' debería fallar: '+JSON.stringify(r));};
const tok=P({accion:'login',password:'test'}).token; const A=(a,d)=>P(Object.assign({accion:a,token:tok},d||{}));
// login con freno
for(let i=0;i<8;i++) bad({accion:'login',password:'x'},/incorrecta/); bad({accion:'login',password:'test'},/Demasiados/); env.cache['login_fallos']='0';
// migración
A('tallerMigrar',{data:{proveedores:[{id:'PV1',nombre:'Mercería'},{id:'PV2',nombre:'Susana'}],
 insumos:[{id:'tela',nombre:'Matelassé',proveedor:'PV1',envase:'metro',contenido:1,unidad:'m',precio:7000},{id:'heb',nombre:'Hebilla',proveedor:'PV1',envase:'unidad',contenido:1,unidad:'u',precio:156}],
 stock:[{insumo:'tela',cantidad:60},{insumo:'heb',cantidad:40}],
 fichas:[{producto:'doble',medidas:{an:125,t1:48},receta:[{insumo:'tela',auto:'tela'},{insumo:'heb',auto:'correas'}],confeccion:10000,envio:9000}],
 gastos:[{concepto:'Flete',total:88000}], compras:[{id:'OLD1',proveedor:'PV1',detalle:'Tela 60 m',total:420000}], pagos:[{proveedor:'PV1',monto:150000,compra:'OLD1'}],
 config:{rollo_ancho:150,comision_mp:20}, tanda:{items:[{producto:'doble',cantidad:9},{producto:'individual',cantidad:3}],estado:'en_confeccion',proveedor:'PV2'}}});
bad({accion:'tallerMigrar',token:tok,data:{}},/ya tiene datos/);
let d=A('taller'); assert.equal(d.insumos.find(i=>i.id==='tela').stock,60); assert.equal(d.tandas.length,1); assert.equal(d.config.comision_mp,'20');
// compra con pago y actualización de precio
const c=A('compraRegistrar',{proveedor:'PV1',items:[{insumo:'heb',envases:30,precio:170}],pagado:5100,medio:'Efectivo'});
d=A('taller'); assert.equal(d.insumos.find(i=>i.id==='heb').stock,70); assert.equal(d.insumos.find(i=>i.id==='heb').precio,170); assert.equal(d.pagos.length,2);
bad({accion:'compraAnular',token:tok,id:c.id},/pagos asociados/);
// recibir tanda parcial y total
const t=d.tandas[0].id;
A('tandaRecibir',{id:t,recibido:{doble:5},consumos:[{insumo:'tela',cantidad:7.65},{insumo:'heb',cantidad:30}],confeccion:{proveedor:'PV2',total:50000}});
d=A('taller'); assert.equal(d.tandas[0].estado,'en_confeccion'); assert.equal(d.stockTienda.doble.ingresado,5); assert.equal(d.insumos.find(i=>i.id==='heb').stock,40);
A('tandaRecibir',{id:t,recibido:{doble:4,individual:3},consumos:[{insumo:'tela',cantidad:8}],confeccion:{proveedor:'PV2',total:70000}});
d=A('taller'); assert.equal(d.tandas[0].estado,'recibida'); assert.equal(d.stockTienda.individual.ingresado,3); assert.equal(d.compras.filter(x=>x.tipo==='confeccion').length,2);
bad({accion:'tandaRecibir',token:tok,id:t,recibido:{doble:1}},/en confección/);
// ajuste, borrar insumo usado -> archiva
A('stockAjuste',{insumo:'tela',cantidad:-1,detalle:'falla'}); assert.equal(A('taller').insumos.find(i=>i.id==='tela').stock,43.35);
assert(A('tallerBorrar',{tipo:'insumo',id:'heb'}).archivado);
A('tallerGuardar',{tipo:'proveedor',data:{nombre:'Nuevo'}}); bad({accion:'tallerGuardar',token:tok,tipo:'proveedor',data:{nombre:'nuevo'}},/Ya hay/);
// el panel viejo sigue funcionando
const r=A('resumen'); assert(r.pedidos); A('guardarCostos',{data:{productos:[]}});
// pedido público + config
const pc=env.post({accion:'config'}); assert(pc.ok);
console.log('TODO OK', d.compras.length, 'compras,', d.movimientos.length,'movimientos');
