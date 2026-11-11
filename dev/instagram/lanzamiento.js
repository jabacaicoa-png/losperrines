// Placas de lanzamiento para anuncio: historia (1080 × 1920) y publicación cuadrada (1080 × 1080).
// Uso:  node dev/instagram/lanzamiento.js <carpeta-de-salida> [foto.jpg]
//   Sin foto usa el dibujo de la funda de la web. La foto NO se guarda en el repo (es público).
const {chromium}=require('playwright'), path=require('path'), fs=require('fs');
const out=path.resolve(process.argv[2]||'.'), foto=process.argv[3]; fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch();
  for(const [sel,w,h,nom] of [['#h',1080,1920,'lanzamiento-historia.png'],['#p',1080,1080,'lanzamiento-publicacion.png']]){
    const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
    await p.goto('file://'+path.join(__dirname,'lanzamiento.html'));
    if(foto&&fs.existsSync(foto)) await p.evaluate(u=>{document.body.className='confoto';document.querySelectorAll('img.foto').forEach(i=>i.src=u);},'file://'+path.resolve(foto));
    await p.waitForTimeout(2500); await (await p.$(sel)).screenshot({path:path.join(out,nom)}); await p.close(); }
  await b.close(); console.log('Listo en',out);})();
