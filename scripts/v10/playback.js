const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);
const t0=Date.now();while(await page.getByText('准备中').count()>0&&Date.now()-t0<90000){await sleep(250)}
await sleep(3000);
await page.locator('.chapters button').nth(2).click();await sleep(1200);
await page.getByRole('button',{name:'内殿',exact:true}).click();await sleep(2500);
await page.getByRole('button',{name:'播放日照时间',exact:true}).click();
const shots=[];for(let i=0;i<4;i++){await sleep(700);shots.push(await page.screenshot({name:args.prefix+'play-'+i}))}
return {diagnostics:await page.diagnostics()};
