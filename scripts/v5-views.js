await page.getByRole('button',{name:'进入二层静坐'}).click();
const noon=await page.screenshot({name:'v5-default-30N-noon-columns'});
await page.getByRole('button',{name:'15:00',exact:true}).click();
const afternoon=await page.screenshot({name:'v5-default-30N-afternoon-columns'});
await page.getByRole('button',{name:'05 屋顶',exact:true}).click();
const roof=await page.screenshot({name:'v5-cad-roof-and-stairs'});
await page.getByRole('button',{name:'02 内殿',exact:true}).click();
const hall=await page.screenshot({name:'v5-rain-chain-and-double-height-hall'});
return {shots:[noon,afternoon,roof,hall],diagnostics:await page.diagnostics()};
