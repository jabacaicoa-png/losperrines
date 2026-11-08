module.exports=function(env){
  const tok=env.post({accion:'login',password:'test'}).token;
  env.post({accion:'guardarConfig',token:tok,valores:{tienda_abierta:'SI',precio_tarjeta:'95000',precio_transferencia:'85500',precio2_tarjeta:'65000',precio2_transferencia:'58500',whatsapp:'5492664000000',alias:'losperrines.mp'}});
  env.post({accion:'movimiento',token:tok,tipo:'ingreso',cantidad:9,motivo:'Lote 1',producto:'doble'});
  env.post({accion:'movimiento',token:tok,tipo:'ingreso',cantidad:3,motivo:'Lote 1',producto:'individual'});
  env.token=tok;
};
