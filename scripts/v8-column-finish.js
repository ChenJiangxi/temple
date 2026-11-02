await page.goto(args.url);
await page.getByRole('button',{name:'柱面近看',exact:true}).click();
return {shot:await page.screenshot({name:'v8-corrected-column-light'}),diagnostics:await page.diagnostics()};
