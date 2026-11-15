// Prueba de "Actualizar el sistema" desde el panel, con GitHub y la API de Apps Script simulados.
const {makeEnv}=require('./gas-emu'); const assert=require('assert'); const fs=require('fs'); const path=require('path');
const ARCH=path.join(__dirname,'..','Codigo.gs'), ACTUAL=fs.readFileSync(ARCH,'utf8');
const VER=ACTUAL.match(/var SISTEMA_VERSION = '([^']+)'/)[1];
let enGitHub=ACTUAL.replace(/var SISTEMA_VERSION = '[^']+'/,"var SISTEMA_VERSION = 'NUEVA · 2'");
let sinProyecto=false, apiActivada=true, conPermiso=true, rawCae=false, apiCae=false;
const G={files:[{name:'appsscript',type:'JSON',source:'{"timeZone":"America/Argentina/Buenos_Aires"}'},{name:'Codigo',type:'SERVER_JS',source:ACTUAL},{name:'Otro',type:'SERVER_JS',source:'function x(){}'}],
  deployments:[{deploymentId:'HEAD',deploymentConfig:{},entryPoints:[{entryPointType:'WEB_APP'}]},{deploymentId:'DEP1',deploymentConfig:{versionNumber:7},entryPoints:[{entryPointType:'WEB_APP'}]},{deploymentId:'LIB',deploymentConfig:{versionNumber:3},entryPoints:[{entryPointType:'LIBRARY'}]}],
  versiones:7, puts:[], depPuts:[]};
const R=(code,obj)=>({getResponseCode:()=>code,getContentText:()=>typeof obj==='string'?obj:JSON.stringify(obj)});
const fetch=(url,o)=>{ o=o||{}; const m=(o.method||'get').toLowerCase();
  if(/raw\.githubusercontent\.com\/jabacaicoa-png\/losperrines\/main\/Codigo\.gs/.test(url)) return rawCae?R(500,''):R(200,enGitHub);
  if(/api\.github\.com\/repos\/jabacaicoa-png\/losperrines\/contents\/Codigo\.gs/.test(url)) return apiCae?R(403,'{"message":"API rate limit exceeded"}'):R(200,enGitHub);
  if(/api\.github\.com/.test(url)&&apiCae) return R(403,'{"message":"API rate limit exceeded"}');
  if(/api\.github\.com\/repos\/jabacaicoa-png\/losperrines\/commits/.test(url)) return R(200,[{commit:{message:'Plano: cintas editables\n\ndetalle',committer:{date:'2026-11-15T12:00:00Z'}}}]);
  const g=url.match(/script\.googleapis\.com\/v1\/projects\/SCRIPT-ID(\/.*)$/); if(!g) return null;
  assert.equal(o.headers.Authorization,'Bearer x');
  if(!apiActivada) return R(403,{error:{message:'User has not enabled the Apps Script API. Enable it by visiting https://script.google.com/home/usersettings then retry.'}});
  if(sinProyecto) return R(403,{error:{message:'Apps Script API has not been used in project 123 before or it is disabled.'}});
  if(!conPermiso) return R(403,{error:{message:'Request had insufficient authentication scopes.'}});
  const ruta=g[1];
  if(ruta==='/deployments'&&m==='get') return R(200,{deployments:G.deployments});
  if(ruta==='/content'&&m==='get') return R(200,{files:G.files});
  if(ruta==='/content'&&m==='put'){ G.puts.push(JSON.parse(o.payload)); return R(200,{}); }
  if(ruta==='/versions'&&m==='post') return R(200,{versionNumber:++G.versiones});
  const d=ruta.match(/^\/deployments\/(\w+)$/); if(d&&m==='put'){ G.depPuts.push({id:d[1],body:JSON.parse(o.payload)}); return R(200,{}); }
  return R(404,{error:{message:'no simulado '+m+' '+ruta}});
};
const env=makeEnv({file:ARCH,fetch}); env.ctx.instalar(); env.token=env.post({accion:'login',password:'test'}).token; assert(env.token,'login');
const A=(a,d)=>env.post(Object.assign({accion:a,token:env.token},d||{}));
// sin sesión no anda
assert(!env.post({accion:'actualizarSistema'}).ok,'pide la contraseña');
// estado: versión actual, la nueva y el último cambio
let e=A('sistemaEstado'); assert(e.ok); assert.equal(e.version,VER); assert.equal(e.nueva,'NUEVA · 2'); assert.equal(e.cambios,'Plano: cintas editables'); assert.equal(e.puede,true);
// la API de GitHub limitada (403, lo que pasó el 15/11): igual baja el archivo por raw y no muestra el último cambio
apiCae=true; e=A('sistemaEstado'); assert.equal(e.nueva,'NUEVA · 2'); assert.equal(e.puede,true); assert.equal(e.cambios,'');
// si raw falla, prueba con la API; si fallan los dos, lo dice (y también revisa lo de Apps Script)
rawCae=true; apiCae=false; e=A('sistemaEstado'); assert.equal(e.nueva,'NUEVA · 2');
apiCae=true; apiActivada=false; e=A('sistemaEstado'); assert.equal(e.puede,false); assert(/GitHub/.test(e.motivo)&&/usersettings/.test(e.motivo),e.motivo);
rawCae=false; apiCae=false; apiActivada=true;
sinProyecto=true; e=A('sistemaEstado'); assert(/proyecto de Google Cloud/.test(e.motivo)&&/project 123/.test(e.motivo),e.motivo); sinProyecto=false;
// sin la API activada o sin permiso: explica qué falta y no toca nada
apiActivada=false; e=A('sistemaEstado'); assert.equal(e.puede,false); assert(/API de Google Apps Script/.test(e.motivo));
let r=A('actualizarSistema'); assert(!r.ok&&/usersettings/.test(r.error)); assert.equal(G.puts.length,0);
apiActivada=true; conPermiso=false; r=A('actualizarSistema'); assert(!r.ok&&/appsscript\.json/.test(r.error)); assert.equal(G.puts.length,0);
conPermiso=true;
// archivo roto o incompleto en GitHub: no toca nada
enGitHub='function rutear(){} var SISTEMA_VERSION = \'X\'; function actualizarSistema(){'; r=A('actualizarSistema'); assert(!r.ok&&/no parece completo/.test(r.error));
enGitHub=ACTUAL.replace(/var SISTEMA_VERSION = '[^']+'/,"var SISTEMA_VERSION = 'ROTA'")+'\nfunction roto( {'; r=A('actualizarSistema'); assert(!r.ok&&/tiene un error/.test(r.error),r.error);
assert.equal(G.puts.length,0); assert.equal(G.depPuts.length,0);
// actualización buena: reemplaza solo el archivo del sistema, crea versión 8 y la publica en la app web (no en la de prueba ni en la biblioteca)
enGitHub=ACTUAL.replace(/var SISTEMA_VERSION = '[^']+'/,"var SISTEMA_VERSION = 'NUEVA · 2'");
r=A('actualizarSistema'); assert(r.ok,r.error); assert.equal(r.version,'NUEVA · 2'); assert.equal(r.antes,VER); assert.equal(r.numero,8); assert.equal(r.implementaciones,1);
const p=G.puts[0].files; assert.equal(p.length,3); assert.equal(p.find(f=>f.name==='Codigo').source,enGitHub); assert.equal(p.find(f=>f.name==='appsscript').source,G.files[0].source); assert.equal(p.find(f=>f.name==='Otro').source,'function x(){}');
assert.deepEqual(G.depPuts.map(d=>d.id),['DEP1']); assert.equal(G.depPuts[0].body.deploymentConfig.versionNumber,8); assert.equal(G.depPuts[0].body.deploymentConfig.manifestFileName,'appsscript');
// después corre instalar() con el código nuevo
r=A('sistemaInstalar'); assert(r.ok); assert.equal(r.version,VER);
console.log('ACTUALIZAR OK');
