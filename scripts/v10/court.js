const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
const t0=Date.now();while(await page.getByText('准备中').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(3000);
const shot=async n=>{await sleep(2400);return page.screenshot({name:args.prefix+n})};
await page.locator('.chapters button').nth(2).click();await shot('axo');
await page.getByRole('button',{name:'人视',exact:true}).click();await shot('eye');
await page.getByRole('button',{name:'设置',exact:true}).click();await sleep(600);
await page.getByLabel('日期').fill('2026-10-28');await page.getByRole('button',{name:'应用',exact:true}).click();await shot('eye-autumn');
await page.getByRole('button',{name:'轴测',exact:true}).click();await shot('axo-autumn');
return {diagnostics:await page.diagnostics()};
