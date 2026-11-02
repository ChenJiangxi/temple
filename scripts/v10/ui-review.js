const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
const t0=Date.now();while(await page.getByText('准备中').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(3500);
await page.screenshot({name:args.prefix+'home'});
await page.getByRole('button',{name:'说明',exact:true}).click();await sleep(900);
await page.screenshot({name:args.prefix+'info'});
await page.getByRole('button',{name:'关闭',exact:true}).click();await sleep(500);
await page.locator('.chapters button').nth(1).click();await sleep(3000);
await page.screenshot({name:args.prefix+'buddha'});
await page.locator('.chapters button').nth(2).click();await sleep(3000);
await page.screenshot({name:args.prefix+'space'});
return {diagnostics:await page.diagnostics(),overflow:(await page.metrics()).horizontalOverflow};
