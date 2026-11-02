const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
const t0=Date.now();while(await page.getByText('准备中').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(4500);
await page.getByRole('button',{name:'出图',exact:true}).click();
await sleep(6000);
const shot=await page.screenshot({name:args.prefix+'after-export'});
return {shot,diagnostics:await page.diagnostics()};
