await page.goto(args.url);
const first=await page.screenshot({name:'v10-probe-load'});
const buttons=await page.getByRole('button').count();
const loading=await page.getByText('正在准备空间与光影').count();
return {title:await page.title(),buttons,loading,first,metrics:await page.metrics(),diagnostics:await page.diagnostics()};
