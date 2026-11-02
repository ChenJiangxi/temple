const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
const t0=Date.now();while(await page.getByText('准备中').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(3500);
await page.screenshot({name:args.prefix+'home'});
await page.locator('.chapters button').nth(2).click();await sleep(1500);
await page.getByRole('button',{name:'远望',exact:true}).tap();await sleep(3000);await page.screenshot({name:args.prefix+'approach'});
return {metrics:await page.metrics(),diagnostics:await page.diagnostics()};
