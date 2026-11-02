await page.goto(args.url);
await page.getByRole('button',{name:'调整日照和屋顶'}).click();
await page.getByLabel('减少过渡动画').click();
await page.getByRole('button',{name:'关闭设置'}).click();
await page.getByRole('button',{name:'进入二层静坐',exact:true}).click();
await page.getByRole('button',{name:'12:00',exact:true}).click();
await page.getByRole('button',{name:'03 玉佛'}).click();
return {jade:await page.screenshot({name:'single-jade-final'}),errors:await page.diagnostics()};
