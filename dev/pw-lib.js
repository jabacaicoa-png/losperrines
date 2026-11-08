// Sirve el repo en file:// y redirige las llamadas a Apps Script al emulador local
const {chromium}=require('playwright');
async function open(b,url,vp){const p=await b.newPage({viewport:vp});p._errs=[];
 p.on('pageerror',e=>p._errs.push(e.message));
 await p.route(/script\.google\.com/,async r=>{const res=await fetch('http://localhost:8787',{method:'POST',body:r.request().postData()||'{}'});r.fulfill({status:200,contentType:'application/json',body:await res.text()});});
 await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
 await p.route(/lh3\.googleusercontent/,r=>r.abort());
 await p.goto(url);await p.waitForTimeout(1200);return p;}
module.exports={chromium,open};
