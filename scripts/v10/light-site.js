const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
const t0=Date.now();while(await page.getByText('准备中').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(2500);
await page.locator('.chapters button').nth(2).click();await sleep(1200);
await page.getByRole('button',{name:'人视',exact:true}).click();await sleep(3200);
const shot=async n=>{await sleep(1800);return page.screenshot({name:args.prefix+n})};
await shot('eq-1222');
const slider=page.getByLabel('当地时刻');
await slider.press('PageDown');await slider.press('PageDown');await shot('eq-0734');
await slider.press('PageUp');await slider.press('PageUp');await slider.press('PageUp');await slider.press('PageUp');await shot('eq-1710');
await slider.press('PageDown');await slider.press('PageDown');
await page.getByRole('button',{name:'冬至',exact:true}).click();await shot('winter-1222');
await page.getByRole('button',{name:'夏至',exact:true}).click();await shot('summer-1222');
await page.getByRole('button',{name:'春分',exact:true}).click();
await page.getByRole('button',{name:'轴测',exact:true}).click();await sleep(1500);await shot('axo');
return {diagnostics:await page.diagnostics()};
