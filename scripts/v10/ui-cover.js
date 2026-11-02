const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
await sleep(1200);await page.screenshot({name:args.prefix+'loading'});
const t0=Date.now();while(await page.locator('.cover-chapters button:disabled').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(3500);
await page.screenshot({name:args.prefix+'cover'});
await page.locator('.cover-chapters button').nth(0).click();await sleep(1500);
await page.screenshot({name:args.prefix+'enter-sutra'});
await sleep(3500);await page.screenshot({name:args.prefix+'sutra'});
await page.locator('.chapters button').nth(1).click();await sleep(1400);
await page.screenshot({name:args.prefix+'enter-buddha'});
await sleep(3500);await page.screenshot({name:args.prefix+'buddha'});
if(args.info){await page.getByRole('button',{name:'说明',exact:true}).click();await sleep(900);await page.screenshot({name:args.prefix+'buddha-info'});await page.getByRole('button',{name:'关闭',exact:true}).click();await sleep(500)}
await page.locator('.chapters button').nth(2).click();await sleep(4500);
await page.screenshot({name:args.prefix+'space'});
await page.locator('.brand').click();await sleep(4000);
await page.screenshot({name:args.prefix+'back-cover'});
return {diagnostics:await page.diagnostics(),overflow:(await page.metrics()).horizontalOverflow};
