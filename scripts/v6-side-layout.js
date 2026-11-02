await page.getByRole('button',{name:'看二层布局',exact:true}).click();
return {shot:await page.screenshot({name:'v6-side-void-layout-final'}),diagnostics:await page.diagnostics()};
