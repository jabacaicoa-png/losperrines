// Placa de estado de WhatsApp para vendedores, con el código de cada uno (16/11/2026).
// Uso: node dev/instagram/vendedor.js <carpeta-salida> <foto.jpg> CODIGO [CODIGO2 ...]
// Precios: los de la plantilla vendedor.html (cambiarlos ahí si cambian en la web).
const {chromium}=require('playwright'), fs=require('fs'), path=require('path');
const [salida, foto, ...codigos]=process.argv.slice(2);
if(!salida||!foto||!codigos.length){ console.log('Uso: node dev/instagram/vendedor.js <salida> <foto.jpg> CODIGO [...]'); process.exit(1); }
(async()=>{
  fs.mkdirSync(salida,{recursive:true});
  const tmp=fs.mkdtempSync(path.join(salida,'.tmp-'));
  fs.copyFileSync(path.join(__dirname,'vendedor.html'),path.join(tmp,'v.html'));
  fs.copyFileSync(foto,path.join(tmp,'foto.jpg'));
  fs.copyFileSync(path.join(__dirname,'..','..','logo.png'),path.join(tmp,'logo.png'));
  const b=await chromium.launch(), p=await b.newPage({viewport:{width:1080,height:1920}});
  await p.goto('file://'+path.join(tmp,'v.html')); await p.waitForTimeout(2000);
  for(const c of codigos){
    const cod=c.toUpperCase().normalize('NFD').replace(/[^A-Z0-9]/g,'');
    await p.evaluate(x=>{ const e=document.getElementById('codigo'); e.textContent=x; e.style.fontSize=(x.length>8?Math.max(56,96*8/x.length):96)+'px'; },cod);
    await p.locator('#h').screenshot({path:path.join(salida,'estado-'+cod+'.png')});
    console.log('estado-'+cod+'.png');
  }
  await b.close(); fs.rmSync(tmp,{recursive:true,force:true});
})();
