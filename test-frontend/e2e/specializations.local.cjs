/* Local-only browser regression. No cloud endpoints are used. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const legacy = JSON.parse('[' + fs.readFileSync(path.join(root,'script-core.js'),'utf8').split('const WORKS = [')[1].split('];')[0] + ']');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'test-frontend/specialization-catalog.js'),'utf8'),context);
const C = context.window.MalarsSpecializationCatalog;
const catalog = C.create(legacy);
assert.equal(C.directions.length,6);
const codes=catalog.flatMap(s=>s.specializations.filter(x=>x.legacy).map(x=>x.id));
assert.equal(codes.length,70);assert.equal(new Set(codes).size,70);
assert.deepEqual([...codes].sort(),legacy.map(x=>x[2]).sort());
for(const query of ['СКУД','скуд','LOW-03','ОВ','овик','ПЛК','SCADA','метрология','электро','КЖ','BIM']) {
  assert(catalog.some(sys=>C.matches(sys,query)),query);
}
assert(!catalog.some(sys=>C.matches(sys,'абракадабра-несуществующая')));
assert.deepEqual([...C.directionsFor(['Электромонтажные работы'],legacy)],['electrical']);
assert.deepEqual([...C.directionsFor(['Электрика'],legacy)],['electrical']);
assert.deepEqual([...C.directionsFor(['Наружные инженерные сети'],legacy)].sort(),['electrical','networks','security']);
assert.deepEqual([...C.changeDirection(['Электромонтажные работы'],'services',true,legacy)],['Электромонтажные работы','Инженерные и специальные услуги']);
assert.equal(C.displayValue('LOCAL-MTR-01 — Поверка средств измерений',legacy),'Поверка средств измерений');

(async()=>{
  const browser=process.env.PLAYWRIGHT_CDP_ENDPOINT
    ? await chromium.connectOverCDP(process.env.PLAYWRIGHT_CDP_ENDPOINT)
    : await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1100}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(['localhost','127.0.0.1'].includes(url.hostname))return route.continue();
      // Deterministic city fixture: UI needs no external services in this test.
      if(url.hostname==='api.hh.ru')return route.fulfill({json:{areas:[{name:'Москва',areas:[]}]}});
      return route.abort();
    });
    const base='http://localhost:8765';
    await page.goto(base);
    await page.waitForFunction(()=>Boolean(window.MALARS_TEST_DATA));
    assert.equal(await page.locator('[data-profile-direction]').count(),6);
    await page.locator('[data-key="displayName"]').fill('Синтетический специалист');
    await page.getByRole('radio',{name:'Самостоятельно',exact:true}).check();
    await page.locator('[data-profile-direction="electrical"]').check();
    await page.locator('#baseCitySearch').fill('Москва');
    await page.locator('[data-city-index]').first().click();
    await page.locator('[data-key="phone"]').fill('+79000000001');
    await page.locator('[data-key="consent"]').check();
    const createdFromStart=page.waitForResponse(response=>response.request().method()==='POST' && response.url()===base+'/api/participant-drafts', {timeout:5000}).catch(()=>null);
    await page.getByRole('button',{name:'Продолжить анкету',exact:true}).click();
    const firstResponse=await createdFromStart;
    assert(firstResponse, 'Start validation: ' + await page.locator('[data-message]').innerText());
    assert.equal(firstResponse.status(),201);
    assert.deepEqual(firstResponse.request().postDataJSON().answers.mainCategories,['Электрика']);
    await page.getByRole('heading',{name:'Идентификация и контакты',exact:true}).waitFor();
    const id=crypto.randomUUID(),token=crypto.randomBytes(32).toString('hex');
    const renamed='ELE-04 — Старая подпись освещения';
    const unknown='LOCAL-MTR-01 — Поверка средств измерений';
    const answers={displayName:'Синтетический специалист',workFormat:'Самостоятельно',mainCategories:['Электромонтажные работы'],baseCity:'Москва',baseRegionCode:'REG-077',phone:'+7 (900) 000-00-01',email:'synthetic@example.invalid',legalForm:'Физлицо',consent:true,consentVersion:'CONSENT-PARTICIPANT-PD-1.0',competencies:[renamed,unknown,'UNRECOGNIZED — Прежнее значение']};
    const created=await page.request.post(base+'/api/participant-drafts',{headers:{'Idempotency-Key':id,'X-Participant-Token':token},data:{answers}});
    assert.equal(created.status(),201);
    const openSection=async()=>{
      await page.goto('about:blank');
      await page.goto(`${base}/#intake=${id}&token=${token}`);
      await page.getByRole('button',{name:'Продолжить сейчас',exact:true}).click();
      await page.getByRole('button',{name:'Сохранить и продолжить',exact:true}).click();
      await page.waitForSelector('[data-spec-search]');
    };
    await openSection();
    assert.equal(await page.locator('.spec-direction').count(),6);
    assert(await page.locator('[data-direction="electrical"]').isVisible());
    assert(!await page.locator('[data-direction="security"]').isVisible());
    assert(!await page.locator('[data-direction="services"]').isVisible());
    await page.locator('[data-spec-additional] > summary').click();
    assert(await page.locator('[data-direction="security"]').isVisible());
    await page.locator('[data-spec-additional] > summary').click();
    assert(!await page.locator('[data-direction="security"]').isVisible());
    const text=await page.locator('.spec-editor').innerText();
    assert(!/Код МАЛАРС|MAL-SYS-|MAL-SPEC-|ELE-04|LOCAL-MTR-01|UNRECOGNIZED/.test(text));
    if(process.env.MALARS_SCREENSHOT_DIR) await page.locator('#participantIntake').screenshot({path:path.join(process.env.MALARS_SCREENSHOT_DIR,'specializations-profile-desktop.png')});
    assert(await page.locator('[data-spec-item="ELE-04"]').isChecked());
    assert.equal(await page.locator('[data-spec-legacy]').count(),2);
    assert.match(await page.locator('.spec-notice').first().innerText(),/только в этом браузере/);
    const search=page.locator('[data-spec-search]');
    for(const term of ['СКУД','LOW-03','овик','ПЛК','метрология','КЖ']) {
      await search.fill(term);
      assert(await page.locator('.spec-system').count()>0,term);
    }
    await search.fill('СКУД');
    assert.equal(await page.locator('.spec-system').count(),1);
    await page.locator('[data-spec-item="LOW-03"]').check();
    await search.fill('');
    assert(await page.locator('[data-direction="security"]').isVisible());
    assert(!await page.locator('[data-direction="services"]').isVisible());
    await search.fill('метрология');
    await page.locator('[data-spec-enabled="MAL-SYS-metrology"]').check();
    await page.locator('[data-spec-item="MAL-SPEC-metrology-1"]').check();
    await page.locator('[data-spec-operation="service"]').check();
    await search.fill('ПЛК');
    await page.locator('[data-spec-enabled="MAL-SYS-automation"]').check();
    await page.locator('.spec-bulk > summary').click();
    await page.locator('[data-spec-bulk="programming"]').check();
    await page.locator('[data-spec-bulk="design"]').check();
    await page.locator('[data-spec-apply]').click();
    assert.match(await page.locator('[data-spec-feedback]').innerText(),/Неприменимых пропущено: [1-9]/);
    assert(await page.locator('[data-spec-operation="programming"]').isChecked());
    await search.fill('метрология');
    assert.equal(await page.locator('[data-spec-operation="programming"]').count(),0);
    assert(await page.locator('[data-spec-operation="service"]').isChecked());
    await search.fill('никакого-совпадения');
    assert.equal(await page.locator('.spec-empty').count(),1);
    await search.fill('');
    await page.locator('[data-spec-filter]').check();
    assert.equal(await page.locator('.spec-system').count(),4);
    // Supply checkbox is horizontally aligned with its text, including mobile.
    const assertAlignment=async()=>assert.equal(await page.locator('[data-key="supply"]').count(),0);
    await assertAlignment();
    await page.locator('input[name="executionMethods"]').first().check();
    let savedPayload;
    page.on('request',request=>{
      if(request.method()==='PUT' && request.url().includes('/api/participant-drafts/')) savedPayload=request.postDataJSON();
    });
    await page.getByRole('button',{name:'Продолжить (детализация локально)',exact:true}).click();
    await page.getByRole('heading',{name:'Этапы и пакеты работ',exact:true}).waitFor();
    assert(savedPayload.answers.competencies.includes(renamed));
    assert(savedPayload.answers.competencies.includes(unknown));
    assert(savedPayload.answers.competencies.includes('UNRECOGNIZED — Прежнее значение'));
    assert(savedPayload.answers.competencies.some(x=>x.startsWith('LOW-03 — ')));
    assert(!JSON.stringify(savedPayload).includes('MAL-SYS-'));
    assert(!JSON.stringify(savedPayload).includes('MAL-SPEC-'));
    assert(!Object.hasOwn(savedPayload.answers,'specializations'));
    await openSection();
    await page.locator('[data-spec-search]').fill('метрология');
    assert(await page.locator('[data-spec-item="MAL-SPEC-metrology-1"]').isChecked());
    assert(await page.locator('[data-spec-operation="service"]').isChecked());
    await page.locator('[data-spec-search]').fill('ПЛК');
    assert(await page.locator('[data-spec-operation="programming"]').isChecked());
    await page.locator('[data-spec-search]').fill('');
    await page.locator('[data-spec-collapse]').click();
    if(process.env.MALARS_SCREENSHOT_DIR) {
      fs.mkdirSync(process.env.MALARS_SCREENSHOT_DIR,{recursive:true});
      await page.locator('#participantIntake').screenshot({path:path.join(process.env.MALARS_SCREENSHOT_DIR,'specializations-desktop.png')});
    }
    await page.setViewportSize({width:390,height:844});
    await assertAlignment();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    await page.locator('[data-spec-search]').fill('СКУД');
    assert(await page.locator('[data-spec-item="LOW-03"]').isChecked());
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    if(process.env.MALARS_SCREENSHOT_DIR) await page.locator('#participantIntake').screenshot({path:path.join(process.env.MALARS_SCREENSHOT_DIR,'specializations-mobile.png')});
    // Rehydrating all old codes must neither rename them nor infer work operations.
    const restored=await page.evaluate(legacy=>{
      const host=document.createElement('div');document.body.append(host);
      const competencies=legacy.map(x=>x[2]+' — '+x[3]);
      competencies.push('LOCAL-OLD-01 — Предыдущий локальный выбор');
      const answers={competencies:[...competencies]};
      window.MalarsSpecializations.mount(host,answers,'qa-all-legacy',legacy);
      const result={checked:host.querySelectorAll('[data-spec-item]:checked').length,operations:host.querySelectorAll('[data-spec-operation]:checked').length,unchanged:JSON.stringify(answers.competencies)===JSON.stringify(competencies),unknown:host.querySelectorAll('[data-spec-legacy]:checked').length};
      host.remove();return result;
    },legacy);
    assert.deepEqual(restored,{checked:70,operations:0,unchanged:true,unknown:1});
    // A disabled browser store must produce an explicit warning, never saved-success text.
    const storageWarning=await page.evaluate(legacy=>{
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(){throw new Error('Synthetic storage denied');};
      const host=document.createElement('div');document.body.append(host);
      try {
        window.MalarsSpecializations.mount(host,{competencies:[]},'qa-storage-denied',legacy);
        return host.querySelector('[data-spec-feedback]').textContent;
      } finally {Storage.prototype.setItem=original;host.remove();}
    },legacy);
    assert.match(storageWarning,/только в памяти страницы/);
    await page.getByRole('button',{name:'Назад',exact:true}).click();
    await page.getByRole('heading',{name:'Идентификация и контакты',exact:true}).waitFor();
    await page.getByRole('button',{name:'Назад',exact:true}).click();
    assert.equal(await page.locator('[data-profile-direction]').count(),6);
    assert(await page.locator('[data-profile-direction="electrical"]').isChecked());
    assert(await page.locator('[data-profile-direction="security"]').isChecked());
    assert(await page.locator('[data-profile-direction="services"]').isChecked());
    assert(!await page.locator('[data-profile-direction="construction"]').isChecked());
    if(process.env.MALARS_SCREENSHOT_DIR) await page.locator('#participantIntake').screenshot({path:path.join(process.env.MALARS_SCREENSHOT_DIR,'directions-mobile.png')});
    await page.setViewportSize({width:1440,height:1100});
    if(process.env.MALARS_SCREENSHOT_DIR) await page.locator('#participantIntake').screenshot({path:path.join(process.env.MALARS_SCREENSHOT_DIR,'directions-desktop.png')});
    assert.deepEqual(errors,[]);
    console.log('PASS: 70 legacy codes; six directions; aliases; choices; applicability; bulk operations; exact legacy restore; unknown values; reload; API payload isolation; checkbox alignment; profile filtering; global search; quiet additional directions; level-one headings; hidden internal codes; desktop/mobile; no JS errors.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
