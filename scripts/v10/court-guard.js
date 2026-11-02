const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
const shots=[];
for(const [name,q] of args.views){
 await page.goto(args.url+'?'+q);
 const t0=Date.now();while(await page.getByText('准备中').count()>0&&Date.now()-t0<90000){await sleep(250)}
 await sleep(4500);shots.push(await page.screenshot({name:args.prefix+name}));
}
return {diagnostics:await page.diagnostics()};
