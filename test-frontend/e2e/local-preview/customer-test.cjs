const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
// Isolated technical regression. This does not replace the built-in browser acceptance.
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const width of [1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:950}});const page=await context.newPage();
  let posts=0,external=0,fail=false;const payloads=[];const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.origin!=='http://localhost:8765'){external++;return route.abort();}
   if(url.pathname==='/test-config.js'){
    const response=await route.fetch();
    // Keep the user's local config unchanged. Start this isolated test at empty contacts.
    let config=(await response.text())+'\nwindow.MALARS_LOCAL_CUSTOMER_FIXTURE=null;window.MALARS_LOCAL_CUSTOMER_START_TASK=false;';
    if(width===390)config+='\nlocalStorage.setItem("malars-test-russia-cities-v1",JSON.stringify({savedAt:Date.now(),entries:window.MALARS_LOCAL_CITY_FIXTURE}));window.MALARS_LOCAL_CITY_FIXTURE=[];';
    if(width===320)config+='\nlocalStorage.setItem("malars-test-russia-cities-v1","invalid JSON");';
    return route.fulfill({response,body:config});
   }
   if(url.pathname==='/api/customer-requests'){
    posts++;payloads.push(req.postDataJSON());
    if(fail)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'unavailable'})});
    await new Promise(r=>setTimeout(r,200));
   }
   return route.continue();
  });
  await page.goto('http://localhost:8765/#clients');await page.waitForFunction(()=>window.MALARS_TEST_DATA);
  const form=page.locator('#clientForm');const next=form.locator('[data-client-next]');
  const fill=async(name,v)=>form.locator(`[name="${name}"]`).fill(v);
  const shot=async(name)=>{if(process.env.MALARS_SCREENSHOTS)await page.screenshot({path:require('node:path').join(process.env.MALARS_SCREENSHOTS,`client-${width}-${name}.png`)});};
  await shot('contacts');await next.click();assert.equal(await form.locator('[aria-invalid=true]').count(),1);
  await fill('name','Тестовый заказчик');await fill('contact','9000000000');await fill('email','bad');await next.click();assert.equal(await form.locator('[aria-invalid=true]').getAttribute('name'),'email');
  await fill('email','client@example.invalid');await fill('organization','Синтетическая организация');await next.click();
  assert.equal(await form.locator('[data-client-title]').textContent(),'Задача');
  await page.waitForTimeout(350);let top=await form.evaluate(x=>x.getBoundingClientRect().top);assert(top>=80 && top<150,`scroll top ${top}`);
  await next.click();assert.equal(await form.locator('[aria-invalid=true]').getAttribute('id'),'clientRegion');
  const citySearch=form.locator('#clientCity');
  await citySearch.fill('Каз');await citySearch.press('ArrowDown');await page.keyboard.press('Enter');
  assert.equal(await form.locator('#clientRegion').inputValue(),'REG-016');assert.equal(await citySearch.inputValue(),'Казань');
  await form.locator('#clientRegion').selectOption('REG-077');assert.equal(await citySearch.inputValue(),'');
  await citySearch.fill('Каз');assert.equal(await form.locator('[data-client-city]').count(),0);assert((await form.locator('#clientCityOptions').innerText()).includes('Город не найден'));
  await citySearch.press('Escape');assert.equal(await citySearch.getAttribute('aria-expanded'),'false');
await form.locator('#clientCity').fill('Моск');await next.click();assert.equal(await form.locator('[aria-invalid=true]').getAttribute('id'),'clientCity');await form.locator('#clientCity').fill('Моск');await form.locator('[data-client-city]').first().click();await next.click();assert.equal(await form.locator('[aria-invalid=true]').getAttribute('name'),'task');
  await fill('task','Синтетическая задача\nПроверить инженерные системы <test>');await fill('deadline','Через две недели');
  assert(await form.locator('#clientFiles').isDisabled());await shot('task');await next.click();
  assert((await form.locator('[data-client-review]').innerText()).includes('Синтетическая организация'));
  assert((await form.locator('[data-client-review]').innerText()).includes('<test>'));
  assert((await form.locator('[data-client-review]').innerText()).includes('Москва'));await form.locator('[data-client-edit="1"]').click();assert.equal(await citySearch.inputValue(),'Москва');await next.click();
  await form.locator('[data-client-edit="0"]').click();assert.equal(await form.locator('[name=name]').inputValue(),'Тестовый заказчик');await next.click();assert.equal(await form.locator('[name=task]').inputValue(),'Синтетическая задача\nПроверить инженерные системы <test>');
  await form.locator('[data-client-back]').click();await next.click();await next.click();
  await form.locator('.form-submit').click();assert.equal(posts,0);assert.equal(await form.locator('[aria-invalid=true]').getAttribute('name'),'consent');
  await form.locator('[name=consent]').check();await shot('review');
  fail=true;await form.locator('.form-submit').click();await page.waitForFunction(()=>!document.querySelector('#clientForm').hasAttribute('aria-busy'));
  assert((await form.locator('[data-message]').innerText()).includes('недоступен'));assert.equal(await form.locator('[name=organization]').inputValue(),'Синтетическая организация');assert(!(await form.locator('.form-submit').isDisabled()));
  fail=false;await form.evaluate(f=>{f.requestSubmit();f.requestSubmit();});await page.waitForFunction(()=>document.querySelector('#clientForm [data-message]').textContent.includes('Локальная имитация завершена'));
  assert.equal(posts,2);assert(await form.locator('.form-submit').isDisabled());await form.evaluate(f=>f.requestSubmit());assert.equal(posts,2);
  const body=payloads.at(-1);assert.deepEqual(Object.keys(body).sort(),['name','contact','email','region','city','description','desired_deadline','organization','consent','consent_version'].sort());assert.equal(body.organization,'Синтетическая организация');assert.equal(body.city,'Москва / Москва');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(errors.length,0,errors.join('\n'));assert.equal(external,0,`external requests ${external}`);
  await shot('result');console.log(`PASS headless ${width} (local fixture, not full directory): validation, values, navigation, review, disabled upload, 503/retry, API body, single submit, no external requests, no overflow/errors`);await context.close();
 }
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
