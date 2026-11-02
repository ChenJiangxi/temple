await page.getByRole('button',{name:'02 内殿',exact:true}).click();
return {shot:await page.screenshot({name:'v5-hall-final-rain-chain'}),diagnostics:await page.diagnostics()};
