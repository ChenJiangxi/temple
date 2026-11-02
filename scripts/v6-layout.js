await page.getByRole('button',{name:'看二层布局',exact:true}).click();
const section=await page.screenshot({name:'v6-void-columns-meditation'});
await page.getByLabel('显示新增设计建议',{exact:true}).click();
const original=await page.screenshot({name:'v6-layout-without-proposals'});
await page.getByLabel('显示新增设计建议',{exact:true}).click();
await page.getByRole('button',{name:'恢复完整建筑，看柱面光影',exact:true}).click();
const meditation=await page.screenshot({name:'v6-meditation-with-guard'});
return {shots:[section,original,meditation],diagnostics:await page.diagnostics()};
