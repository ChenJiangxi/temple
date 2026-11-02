const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
const t0=Date.now();while(await page.getByText('准备中').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(3500);
const shot=async n=>page.screenshot({name:args.prefix+n});
await shot('home');
await page.locator('.chapters button').nth(1).click();await sleep(2800);await shot('jade');
await page.getByRole('button',{name:'屋顶',exact:true}).click();await sleep(2800);await shot('roof');
await page.locator('.chapters button').nth(2).click();await sleep(2800);await shot('outside');
await page.getByRole('button',{name:'剖视',exact:true}).click();await sleep(3500);await shot('section');
await page.getByRole('button',{name:'说明',exact:true}).click();await sleep(800);await shot('info');
return {diagnostics:await page.diagnostics(),metrics:await page.metrics()};
