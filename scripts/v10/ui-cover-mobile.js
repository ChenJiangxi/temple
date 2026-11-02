const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
const t0=Date.now();while(await page.locator('.cover-chapters button:disabled').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(3500);
await page.screenshot({name:args.prefix+'cover'});
await page.locator('.cover-chapters button').nth(0).click();await sleep(1500);
await page.screenshot({name:args.prefix+'enter-sutra'});
if(args.mobile){await sleep(3000);await page.locator('.chapters button').nth(1).click();await sleep(4000);await page.screenshot({name:args.prefix+'buddha'})}
return {diagnostics:await page.diagnostics(),overflow:(await page.metrics()).horizontalOverflow};
