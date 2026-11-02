const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
const t0=Date.now();while(await page.getByText('准备中').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(3500);
await page.screenshot({name:args.prefix+'home'});
await page.locator('.chapters button').nth(1).click();await sleep(2800);await page.screenshot({name:args.prefix+'jade'});
await page.locator('.chapters button').nth(2).click();await sleep(2800);await page.screenshot({name:args.prefix+'outside'});
return {diagnostics:await page.diagnostics()};
