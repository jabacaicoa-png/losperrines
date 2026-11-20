// Placa para grupos de WhatsApp de comerciantes (buscar mayoristas), 1080×1350 (20/11/2026).
// Uso: node dev/instagram/mayorista.js <carpeta-salida> <foto1.jpg> <foto2.jpg>
const {chromium}=require('playwright'), fs=require('fs'), path=require('path');
const [salida, foto1, foto2]=process.argv.slice(2);
if(!salida||!foto1||!foto2){ console.log('Uso: node dev/instagram/mayorista.js <salida> <foto1.jpg> <foto2.jpg>'); process.exit(1); }
(async()=>{
  fs.mkdirSync(salida,{recursive:true});
  const tmp=fs.mkdtempSync(path.join(salida,'.tmp-'));
  fs.copyFileSync(path.join(__dirname,'mayorista.html'),path.join(tmp,'m.html'));
  fs.copyFileSync(foto1,path.join(tmp,'foto1.jpg')); fs.copyFileSync(foto2,path.join(tmp,'foto2.jpg'));
  fs.copyFileSync(path.join(__dirname,'..','..','logo.png'),path.join(tmp,'logo.png'));
  const b=await chromium.launch(), p=await b.newPage({viewport:{width:1080,height:1350}});
  await p.goto('file://'+path.join(tmp,'m.html')); await p.waitForTimeout(2500);
  await p.locator('#h').screenshot({path:path.join(salida,'mayorista-whatsapp.png')});
  console.log('mayorista-whatsapp.png');
  await b.close(); fs.rmSync(tmp,{recursive:true,force:true});
})();
