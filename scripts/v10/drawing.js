const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
const t0=Date.now();while(await page.getByText('准备中').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(3000);
await page.locator('.chapters button').nth(2).click();await sleep(3000);await page.screenshot({name:args.prefix+'axo'});
await page.getByRole('button',{name:'人视',exact:true}).click();await sleep(3000);await page.screenshot({name:args.prefix+'eye'});
await page.getByRole('button',{name:'剖视',exact:true}).click();await sleep(3500);await page.screenshot({name:args.prefix+'section'});
await page.locator('.chapters button').nth(1).click();await sleep(1200);
await page.getByRole('button',{name:'屋顶',exact:true}).click();await sleep(3000);await page.screenshot({name:args.prefix+'roof'});
return {diagnostics:await page.diagnostics()};
