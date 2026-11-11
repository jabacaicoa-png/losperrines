// Genera las placas de Instagram (PNG) a partir de las plantillas HTML de esta carpeta.
// Uso:  node dev/instagram/generar.js <carpeta-de-salida> <foto.jpg>
//   La foto NO se guarda en el repo (es público): se la pide al dueño (la del golden sonriendo en la funda) y se pasa acá.
//   carrusel.html  → carrusel-1..7.png   (1080 × 1080, cuadradas: entran enteras en Instagram toques lo que toques)
//   historias.html → historia-1..4.png   (1080 × 1920, con espacio libre para el sticker: encuesta, preguntas, cuenta regresiva, enlace)
// El logo es ../../logo.png. Colores y letra de la marca (Bricolage Grotesque).
const {chromium}=require('playwright'), path=require('path'), fs=require('fs');
const out=path.resolve(process.argv[2]||'.'), foto=process.argv[3]; fs.mkdirSync(out,{recursive:true});
if(!foto||!fs.existsSync(foto)){ console.error('Falta la foto: node dev/instagram/generar.js <salida> <foto.jpg>'); process.exit(1); }
const url='file://'+path.resolve(foto);
(async()=>{const b=await chromium.launch();
  for(const [html,sel,n,w,h,pre] of [['carrusel.html','#s',7,1080,1080,'carrusel-'],['historias.html','#h',4,1080,1920,'historia-']]){
    const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
    await p.goto('file://'+path.join(__dirname,html)); await p.evaluate(u=>document.querySelectorAll('img').forEach(i=>{ if(/golden\.jpg$/.test(i.getAttribute('src'))) i.src=u; }),url); await p.waitForTimeout(2500);
    for(let i=1;i<=n;i++) await (await p.$(sel+i)).screenshot({path:path.join(out,pre+i+'.png')});
    await p.close(); }
  await b.close(); console.log('Listo en',out);})();
