await page.goto(args.url);
const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
let waited=0;
while(await page.getByText('正在准备空间与光影').count()>0&&waited<60000){await sleep(1000);waited+=1000}
const shots={};const go=async(name,key)=>{await page.getByRole('button',{name,exact:true}).click();await sleep(2500);shots[key]=await page.screenshot({name:'v10-survey-'+key})};
await sleep(1500);
await page.locator('.chapter-nav button').nth(1).click();await sleep(2500);
shots.jade=await page.screenshot({name:'v10-survey-jade'});
await go('屋顶开孔','roof');
await page.locator('.chapter-nav button').nth(2).click();await sleep(2500);
shots.outside=await page.screenshot({name:'v10-survey-outside'});
await go('一层内殿','hall');
await go('二层剖视','section');
return {waited,shots,diagnostics:await page.diagnostics()};
