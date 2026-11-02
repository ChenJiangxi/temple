await page.goto(args.url);
await page.getByRole('button',{name:'调整日照和屋顶'}).click();
await page.getByLabel('减少过渡动画').click();
await page.getByRole('button',{name:'关闭设置'}).click();
const exterior=await page.screenshot({name:'temple-final-exterior'});
await page.getByRole('button',{name:'03 玉佛'}).click();
const jade=await page.screenshot({name:'temple-final-jade'});
return {exterior,jade,errors:await page.diagnostics()};
