const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
const t0=Date.now();while(await page.getByText('准备中').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(3000);
await page.locator('.chapters button').nth(2).click();await sleep(2800);await page.screenshot({name:args.prefix+'outside'});
await page.getByRole('button',{name:'远望',exact:true}).click();await sleep(3000);await page.screenshot({name:args.prefix+'approach'});
await page.locator('.chapters button').nth(1).click();await sleep(1200);
await page.getByRole('button',{name:'屋顶',exact:true}).click();await sleep(2800);await page.screenshot({name:args.prefix+'roof'});
await page.locator('.chapters button').nth(0).click();await sleep(1500);
await page.getByRole('button',{name:'说明',exact:true}).click();await sleep(700);
await page.getByText('看冬至满柱（12 月 21 日 10:00）→').click();await sleep(3000);await page.screenshot({name:args.prefix+'winter'});
return {diagnostics:await page.diagnostics()};
