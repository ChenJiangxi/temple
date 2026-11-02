const sleep=async ms=>{try{await page.waitForTimeout(ms)}catch{await new Promise(r=>setTimeout(r,ms))}};
await page.goto(args.url);await sleep(2500);
await page.locator('video').click();await sleep(3000);
await page.getByRole('button',{name:'B 极简钢琴'}).click();await sleep(1500);
const pressed=await page.locator('.bgm button[aria-pressed=true]').textContent();
const shot=await page.screenshot({name:'bgm-page'});
return {pressed,diagnostics:await page.diagnostics()};
