// Tienda de ejemplo con pedidos en todas las etapas de la pantalla Hoy.
// node dev/gas-emu.js Codigo.gs 8787 dev/seed-oficina.js
module.exports=function(env){
  require('./seed-store')(env);
  const T=env.token, A=(a,d)=>{const r=env.post(Object.assign({accion:a,token:T},d||{})); if(!r.ok) throw new Error(a+': '+r.error); return r;};
  A('guardarConfig',{valores:{email_aviso:'duenio@ejemplo.com',plantilla_andreani_id:'PLANTILLA'}});
  env.ss.insertSheet('A domicilio'); env.ss.insertSheet('A sucursal');
  const real=env.ctx.ahora; let corr=0; env.ctx.ahora=()=>new Date(Date.now()+corr);
  const ped=(n,ap,x)=>{const r=env.post(Object.assign({accion:'pedido',nombre:n,apellido:ap,dni:'30111222',email:n.toLowerCase()+'@ej.com',cel_cod:'266',cel_num:'4123456',
    entrega:'domicilio',calle:'Av. Illia',numero:'250',prov_loc_cp:'San Luis, Juana Koslay, 5701',pago:'transferencia',items:[{producto:'doble',cantidad:1}]},x||{})); if(!r.ok) throw new Error(r.error); return r.id;};
  corr=-3*86400000; const viejo=ped('Marta','Gómez',{observaciones:'Tocar timbre 2B'}); A('pagado',{id:viejo});
  corr=-40*3600000; const porVencer=ped('Lucas','Fernández');
  corr=-5*3600000; const t1=ped('Sofía','Ruiz',{items:[{producto:'individual',cantidad:1}]}); const t2=ped('Diego','Pérez',{entrega:'sucursal',sucursal:'San Luis Centro'});
  corr=-20*3600000; const p1=ped('Valeria','López',{items:[{producto:'doble',cantidad:1},{producto:'individual',cantidad:1}]}); A('pagado',{id:p1});
  const e1=ped('Jorge','Sosa'); A('pagado',{id:e1}); A('preparado',{ids:[e1]});
  corr=-30*3600000; const d1=ped('Carla','Medina',{entrega:'sucursal',sucursal:'Villa Mercedes'}); const d2=ped('Pablo','Díaz'); A('pagadoLote',{ids:[d1,d2]}); A('preparado',{ids:[d1,d2]}); A('exportar',{ids:[d1,d2]});
  const c1=ped('Ana','Torres'); A('pagado',{id:c1}); A('preparado',{ids:[c1]}); A('exportar',{ids:[c1]}); A('despachar',{id:c1,tracking:'360002345678901'});
  corr=0; env.ctx.ahora=real;
};
