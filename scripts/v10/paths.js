await page.goto(args.url);
const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
const t0=Date.now();
while(await page.getByText('正在准备空间与光影').count()>0&&Date.now()-t0<90000){await sleep(250)}
const readyAfterGotoMs=Date.now()-t0;
await sleep(3500);
await page.screenshot({name:args.prefix+'home'});
await page.getByRole('button',{name:'记下此刻',exact:true}).click();await sleep(400);
const settlingNotice=await page.getByText('画面仍在调整，请稍候再记录。').count();
await page.getByRole('button',{name:'15:00',exact:true}).click();await sleep(1200);
await page.screenshot({name:args.prefix+'compare'});
const comparing=await page.getByRole('button',{name:'退出对照',exact:true}).count();
if(comparing)await page.getByRole('button',{name:'退出对照',exact:true}).click();
await page.locator('.chapter-nav button').nth(2).click();await sleep(800);
await page.getByRole('button',{name:'二层剖视',exact:true}).click();await sleep(3500);
await page.screenshot({name:args.prefix+'section'});
await page.getByRole('button',{name:'原作参考',exact:true}).click();await sleep(1500);
await page.screenshot({name:args.prefix+'photos'});
return {readyAfterGotoMs,settlingNotice,comparing,diagnostics:await page.diagnostics()};
