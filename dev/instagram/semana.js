// Paquete semanal de Instagram: 3 publicaciones cuadradas y 4 historias (ver semana.html).
// Uso:  node dev/instagram/semana.js <carpeta-de-salida> <foto-golden> <foto-dos-perros> <foto-funda-vacia>
//   Las fotos NO se guardan en el repo (es público): las pasa el dueño por el chat.
const {chromium}=require('playwright'), path=require('path'), fs=require('fs');
const out=path.resolve(process.argv[2]||'.'); fs.mkdirSync(out,{recursive:true});
const fotos={golden:process.argv[3], dos:process.argv[4], vacia:process.argv[5]};
const piezas=[['s1','1-lunes-publicacion'],['s2','2-martes-historia'],['s3','3-miercoles-publicacion'],['s4','4-jueves-historia'],['s5','5-viernes-publicacion'],['s6','6-sabado-historia'],['s7','7-domingo-historia']];
(async()=>{const b=await chromium.launch(), p=await b.newPage({viewport:{width:1100,height:2000},deviceScaleFactor:1});
  await p.goto('file://'+path.join(__dirname,'semana.html'));
  await p.evaluate(f=>document.querySelectorAll('img[data-f]').forEach(i=>{ if(f[i.dataset.f]) i.src=f[i.dataset.f]; }),
    Object.fromEntries(Object.entries(fotos).filter(([,v])=>v&&fs.existsSync(v)).map(([k,v])=>[k,'file://'+path.resolve(v)])));
  await p.waitForTimeout(2500);
  for(const [id,nom] of piezas) await (await p.$('#'+id)).screenshot({path:path.join(out,nom+'.png')});
  await b.close(); console.log('Listo en',out);})();
