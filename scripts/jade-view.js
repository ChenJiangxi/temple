await page.getByRole('button',{name:'调整日照和屋顶'}).click();
await page.getByLabel('减少过渡动画').click();
await page.getByRole('button',{name:'关闭设置'}).click();
await page.getByRole('button',{name:'03 玉佛'}).click();
return {shot:await page.screenshot({name:'jade-relief'}),errors:await page.diagnostics()};
