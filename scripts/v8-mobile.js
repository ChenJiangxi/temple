await page.goto(args.url);
await page.getByRole('button',{name:'柱面近看',exact:true}).click();
const column=await page.screenshot({name:'v8-mobile-column-light'});
await page.getByRole('button',{name:'记下此刻',exact:true}).click();
await page.getByRole('button',{name:'15:00',exact:true}).click();
const comparison=await page.screenshot({name:'v8-mobile-time-comparison'});
return {shots:[column,comparison],metrics:await page.metrics(),diagnostics:await page.diagnostics()};
