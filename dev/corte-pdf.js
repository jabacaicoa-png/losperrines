// Genera en PDF el plano de confección (A4 apaisado) y la ficha (A4 vertical) de corte.html, para revisarlos como
// salen impresos. Primero levantá un servidor:  python3 -m http.server 8000   (desde la raíz del repo)
// Uso:  node dev/corte-pdf.js <carpeta-de-salida>   → plano-doble.pdf, plano-individual.pdf, ficha-uno.pdf (3 dobles), ficha-varios.pdf
// Medidas: las reales del dueño (10/11/2026), margen de costura 1 cm.
const {chromium}=require('playwright'), path=require('path'), fs=require('fs');
const out=path.resolve(process.argv[2]||'.'); fs.mkdirSync(out,{recursive:true});
const D={an:130,t1:54,t2:42,t3:40,la:42,lb:40,nl:2,nc:6,tf:20,tr:80}, I={an:55,t1:54,t2:42,t3:40,la:42,lb:40,nl:2,nc:2,tf:20,tr:80};
const casos=[['plano','plano-doble',[{id:'d',nom:'Canasto de 2 plazas',q:1,...D}]],['plano','plano-individual',[{id:'i',nom:'Canasto de 1 plaza',q:1,...I}]],
  ['ficha','ficha-uno',[{id:'d',nom:'Canasto de 2 plazas',q:3,...D}]],['ficha','ficha-varios',[{id:'d',nom:'Canasto de 2 plazas',q:9,...D},{id:'i',nom:'Canasto de 1 plaza',q:3,...I}]]];
(async()=>{const b=await chromium.launch();
  for(const [boton,nombre,modelos] of casos){ const p=await b.newPage(); p.on('pageerror',e=>console.log('ERROR',e.message));
    await p.route(/fonts\.|googletagmanager|facebook|cdnjs/,r=>r.abort());
    const datos={ts:1,modelos,rollo:{rw:'150',rl:'59',rp:'8100',mg:'1'}};
    await p.goto('http://localhost:8000/corte.html?v=1#panel='+encodeURIComponent(JSON.stringify(datos))); await p.waitForTimeout(800);
    await p.evaluate(id=>{ window.print=()=>{}; document.getElementById(id).click(); },boton); await p.waitForTimeout(400);
    await p.pdf({path:path.join(out,nombre+'.pdf'),preferCSSPageSize:true}); await p.close(); }
  await b.close(); console.log('Listo en',out);})();
