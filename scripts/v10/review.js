const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
const t0=Date.now();while(await page.getByText('准备中').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(3000);
const shot=async n=>{await sleep(2600);return page.screenshot({name:args.prefix+n})};
await shot('home');
await page.locator('.chapters button').nth(1).click();await shot('chapter2');
await page.locator('.chapters button').nth(2).click();await shot('axo');
await page.getByRole('button',{name:'人视',exact:true}).click();await shot('eye');
await page.getByRole('button',{name:'内殿',exact:true}).click();await shot('inner');
await page.getByRole('button',{name:'剖视',exact:true}).click();await shot('section');
await page.getByRole('button',{name:'冬至',exact:true}).click();await page.locator('.chapters button').nth(0).click();await shot('winter-sutra');
return {diagnostics:await page.diagnostics()};
