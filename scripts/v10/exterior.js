const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
const t0=Date.now();while(await page.getByText('准备中').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(3000);
const shot=async n=>{await sleep(3400);return page.screenshot({name:args.prefix+n})};
await page.locator('.chapters button').nth(2).click();await shot('axo');
await page.getByRole('button',{name:'人视',exact:true}).click();await shot('eye');
await page.getByRole('button',{name:'剖视',exact:true}).click();await shot('section');
return {diagnostics:await page.diagnostics()};
