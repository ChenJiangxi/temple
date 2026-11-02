const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
const t0=Date.now();while(await page.getByText('准备中').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(3000);
await page.locator('.chapters button').nth(2).tap();await sleep(3000);await page.screenshot({name:args.prefix+'axo'});
await page.getByRole('button',{name:'人视',exact:true}).tap();await sleep(3000);await page.screenshot({name:args.prefix+'eye'});
return {diagnostics:await page.diagnostics(),overflow:(await page.metrics()).horizontalOverflow};
