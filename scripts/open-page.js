await page.goto(args.url);
return {title:await page.title(),shot:await page.screenshot({name:'temple-exterior'}),errors:await page.diagnostics()};
