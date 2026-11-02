await page.goto(args.url);
await page.getByRole('button',{name:'整柱看光',exact:true}).click();
const south=await page.screenshot({name:'v9-south-noon-whole-column'});
await page.goto(args.studyUrl);
await page.getByRole('button',{name:'整柱看光',exact:true}).click();
const west=await page.screenshot({name:'v9-west-1630-whole-column'});
return {shots:[south,west],diagnostics:await page.diagnostics()};
