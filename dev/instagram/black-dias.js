// Genera las 3 historias del Black Friday: node dev/instagram/black-dias.js [carpeta]
const {chromium}=require('playwright'),path=require('path');
(async()=>{const out=process.argv[2]||'.';const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
 for(const d of [1,2,3]){await p.goto('file://'+path.join(__dirname,'black-dias.html')+'?d='+d);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);
  await (await p.$('#h')).screenshot({path:path.join(out,'black-dia'+d+'.png')});}
 await b.close();})();
