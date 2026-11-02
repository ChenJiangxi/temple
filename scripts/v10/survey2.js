await page.goto(args.url);
const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
let waited=0;
while(await page.getByText('正在准备空间与光影').count()>0&&waited<90000){await sleep(500);waited+=500}
const shots={};const go=async(name,key)=>{await page.getByRole('button',{name,exact:true}).click();await sleep(2500);shots[key]=await page.screenshot({name:args.prefix+key})};
await sleep(1500);
shots.home=await page.screenshot({name:args.prefix+'home'});
await go('柱面近看','column');
await go('二层静坐','gallery');
await page.locator('.chapter-nav button').nth(1).click();await sleep(2500);
shots.jade=await page.screenshot({name:args.prefix+'jade'});
await page.locator('.chapter-nav button').nth(2).click();await sleep(2500);
shots.outside=await page.screenshot({name:args.prefix+'outside'});
await go('一层内殿','hall');
return {waited,diagnostics:await page.diagnostics()};
