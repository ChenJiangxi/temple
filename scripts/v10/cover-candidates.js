const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
const t0=Date.now();while(await page.getByText('准备中').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(2500);
await page.locator('.chapters button').nth(2).click();await sleep(1500);
await page.getByRole('button',{name:'人视',exact:true}).click();await sleep(3500);
await page.screenshot({name:args.prefix+'approach-1530'});
await page.getByRole('button',{name:'夜景',exact:true}).click();await sleep(4500);
await page.screenshot({name:args.prefix+'approach-blue'});
await page.getByRole('button',{name:'轴测',exact:true}).click();await sleep(3500);
await page.screenshot({name:args.prefix+'outside-blue'});
return {diagnostics:await page.diagnostics()};
