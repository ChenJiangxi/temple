const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
const t0=Date.now();while(await page.getByText('准备中').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(3000);
const shot=async n=>{await sleep(3200);return page.screenshot({name:args.prefix+n})};
await page.locator('.chapters button').nth(2).click();await sleep(1500);
await page.getByRole('button',{name:'剖视',exact:true}).click();await shot('section');
await page.getByRole('button',{name:'冬至',exact:true}).click();await shot('section-winter');
await page.getByRole('button',{name:'春分',exact:true}).click();
await page.getByRole('button',{name:'内殿',exact:true}).click();await shot('inner-after');
return {diagnostics:await page.diagnostics()};
