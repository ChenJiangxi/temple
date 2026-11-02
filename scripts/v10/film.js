// Renders film shots (or still previews) via ?film=; each run downloads one .mjpeg per item.
const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
const results=[];
for(const q of args.items){
 await page.goto(args.url+'?'+q);
 const t0=Date.now();let s='';
 while(Date.now()-t0<(args.wait||280000)){s=(await page.locator('.film-status').textContent())||'';if(/film-(done|error)/.test(s))break;await sleep(500)}
 results.push(q+' => '+s);
 await sleep(1500);
}
return {results,diagnostics:await page.diagnostics()};
