const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
const t0=Date.now();while(await page.getByText('准备中').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(2000);
await page.getByRole('button',{name:'600×',exact:true}).click();
await page.getByRole('button',{name:'播放日照时间'}).click();await sleep(6000);
await page.getByRole('button',{name:'暂停日照时间'}).click();
return {diagnostics:await page.diagnostics()};
