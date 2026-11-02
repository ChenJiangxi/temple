await page.goto(args.url);
return {title:await page.title(),diagnostics:await page.diagnostics()};
