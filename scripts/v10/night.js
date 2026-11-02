const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
const t0=Date.now();while(await page.getByText('准备中').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(3000);
const shot=async n=>{await sleep(4500);return page.screenshot({name:args.prefix+n})};
await page.locator('.chapters button').nth(2).click();await sleep(1500);
await page.getByRole('button',{name:'人视',exact:true}).click();await sleep(1500);
await page.getByRole('button',{name:'夜景',exact:true}).click();await shot('eye-night');
await page.getByRole('button',{name:'轴测',exact:true}).click();await shot('axo-night');
await page.getByRole('button',{name:'内殿',exact:true}).click();await shot('hall-night');
await page.locator('.chapters button').nth(0).click();await sleep(1200);
await page.getByRole('button',{name:'夜景',exact:true}).click();await shot('columns-night');
return {diagnostics:await page.diagnostics()};
