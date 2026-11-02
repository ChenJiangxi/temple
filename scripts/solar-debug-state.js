return {ready:await page.getByRole('button',{name:'进入二层静坐'}).count(),errors:await page.diagnostics(),title:await page.title()};
