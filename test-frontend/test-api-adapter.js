(() => {
  const keyFor = formId => `malars-test-idempotency:${formId}`;

  function idempotencyKey(formId) {
    const keyName = keyFor(formId);
    let key = sessionStorage.getItem(keyName);
    if (!key) {
      key = crypto.randomUUID();
      sessionStorage.setItem(keyName, key);
    }
    return key;
  }

  function resetKeyOnEdit(event) {
    if (event.target?.type === "submit") return;
    const form = event.target?.closest?.("#clientForm, #partnerFormV2");
    if (form) sessionStorage.removeItem(keyFor(form.id));
  }

  function intakeError(status, code) {
    if (status === 409 || code === "idempotency_conflict") {
      return new Error("Конфликт ключа отправки. Измените данные и отправьте форму ещё раз.");
    }
    if (status >= 500) {
      return new Error("TEST API временно недоступен. Повторите отправку без изменения формы.");
    }
    const messages = {
      consent_required: "Не подтверждена актуальная версия согласия.",
      competencies_required: "Выберите хотя бы один вид работ.",
      object_types_required: "Выберите хотя бы один тип объекта.",
      invalid_body_size: "Запрос превышает допустимый размер.",
    };
    return new Error(messages[code] || `TEST API отклонил форму (${status}). Проверьте обязательные поля.`);
  }

  async function sendToTestApi(payload) {
    const config = window.MALARS_TEST_CONFIG;
    if (!config?.apiBaseUrl) throw new Error("TEST API не настроен; данные не отправлены.");

    const isParticipant = payload.formType === "partner_v2";
    const formId = isParticipant ? "partnerFormV2" : "clientForm";
    const endpoint = isParticipant ? "/api/participants" : "/api/customer-requests";
    let body;

    if (isParticipant) {
      const participant = { ...payload.participant };
      if (["Бригада", "Частный специалист"].includes(participant.participantType)) {
        participant.legalForm = "Физлицо";
      }
      body = {
        participant,
        competencies: payload.competencies,
        objectTypes: payload.objectTypes,
        regions: payload.regions,
        documents: payload.documents,
        consent: true,
        consent_version: "CONSENT-PARTICIPANT-PD-1.0",
      };
    } else {
      if (payload.files?.length) {
        throw new Error("Загрузка файлов в TEST пока не подключена. Удалите выбранные файлы; используйте только синтетические данные.");
      }
      body = {
        name: payload.name,
        contact: payload.contact,
        email: payload.email,
        region: payload.region,
        city: payload.city,
        description: payload.task,
        desired_deadline: payload.deadline || "",
        organization: payload.organization || "",
        consent: true,
        consent_version: "CONSENT-CUSTOMER-PD-1.0",
      };
    }

    const response = await fetch(`${config.apiBaseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey(formId),
      },
      body: JSON.stringify(body),
    });
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (_) {
      throw intakeError(response.status, "invalid_response");
    }
    if (!response.ok || !result?.data) {
      throw intakeError(response.status, result?.error);
    }

    sessionStorage.removeItem(keyFor(formId));
    return {
      ok: true,
      data: result.data,
      status: response.status,
      replayed: response.status === 200,
      participantId: result.data.participant_id || "",
    };
  }

  function install() {
    if (window.__MALARS_TEST_API_ADAPTER__) return true;
    if (typeof window.postJson !== "function") return false;
    window.postJson = sendToTestApi;
    window.__MALARS_TEST_API_ADAPTER__ = true;
    return true;
  }

  document.addEventListener("input", resetKeyOnEdit, true);
  document.addEventListener("change", resetKeyOnEdit, true);

  if (!install()) {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (install() || attempts >= 300) window.clearInterval(timer);
    }, 50);
  }
})();

// One owner for the customer form in the TEST frontend. No draft persistence.
(() => {
  const form = document.getElementById('clientForm');
  if (!window.MALARS_TEST_CONFIG || !form || form.dataset.clientFlow) return;
  form.dataset.clientFlow = 'true';
  form.removeAttribute('data-form-type'); // The legacy core must not bind this form.
  form.classList.add('participant-intake', 'client-intake');
  form.noValidate = true;
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  let step = 0, busy = false, submitted = false, scrollGeneration = 0;
  const titles = ['Контакты', 'Задача', 'Проверка'];
  form.innerHTML = `
    <div class="participant-intake-head"><p class="eyebrow">Анкета заказчика · <span data-client-count>шаг 1 из 3</span></p>
      <h2 tabindex="-1" data-client-title>Контакты</h2>
      <p>Расскажите о задаче — мы разберём, что нужно для её выполнения.</p>
      <p class="field-hint">Черновики заказчика пока не поддерживаются. Ответы остаются при переходах между шагами, пока страница открыта.</p>
      ${local ? '<p class="spec-notice">Локальная проверка: используйте только синтетические данные. Отправка имитируется на этом компьютере; МАЛАРС не получает заявку.</p>' : ''}
    </div>
    <div class="intake-progress" role="progressbar" aria-label="Заполнение анкеты" aria-valuemin="1" aria-valuemax="3" aria-valuenow="1"><span style="width:33.33%"></span></div>
    <ol class="client-steps">${titles.map((t,i)=>`<li data-client-indicator="${i}">${i+1}. ${t}</li>`).join('')}</ol>
    <section data-client-step="0" aria-label="Контакты"><div class="intake-grid">
      <label>Как к вам обращаться<input name="name" autocomplete="name" placeholder="Имя" required></label>
      <label>Телефон<input id="clientPhone" name="contact" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (999) 999-99-99" required></label>
      <label>Email<input id="clientEmail" name="email" type="email" autocomplete="email" placeholder="name@company.ru" required></label>
      <label>Организация (необязательно)<input name="organization" autocomplete="organization" placeholder="Название организации"></label>
    </div></section>
    <section data-client-step="1" aria-label="Задача" hidden><div class="intake-grid">
      <label>Регион<select id="clientRegion" required><option value="">Загрузка регионов…</option></select></label>
      <div class="city-field"><label for="clientCity">Город</label><input id="clientCity" role="combobox" aria-autocomplete="list" aria-controls="clientCityOptions" aria-expanded="false" autocomplete="off" placeholder="Начните вводить город" required><div id="clientCityOptions" class="city-suggestions" role="listbox" aria-label="Города" hidden></div><p class="field-hint">Выберите город из подсказок. Регион уточнится автоматически.${local ? " В локальном просмотре используется тестовая выборка справочника." : ""}</p></div>
      <label class="intake-wide">Что нужно сделать<textarea name="task" rows="5" placeholder="Объект, необходимые работы и ожидаемый результат" required></textarea></label>
      <label class="intake-wide">Желаемый срок (необязательно)<input name="deadline" placeholder="Например: начать в течение 2 недель"></label>
      <div class="intake-wide client-documents"><strong>Исходные документы</strong><p class="field-hint">ТЗ, чертежи, сметы, фотографии. Загрузка файлов в TEST пока отключена. Отправьте задачу без вложений — документы можно будет обсудить отдельно.</p><input id="clientFiles" type="file" multiple disabled aria-label="Исходные документы: загрузка отключена"><p class="field-hint">Файлы не выбраны и не будут отправлены.</p></div>
    </div></section>
    <section data-client-step="2" aria-label="Проверка" hidden><p>Проверьте ответы перед отправкой.</p><div class="intake-review" data-client-review></div>
      <label class="consent intake-consent"><input name="consent" type="checkbox" required><span>Даю согласие на обработку персональных данных заказчика. <a href="legal/customer-consent.html" target="_blank" rel="noopener">Текст TEST-согласия</a>. Версия CONSENT-CUSTOMER-PD-1.0.</span></label>
    </section>
    <div class="form-status" data-message aria-live="polite"></div>
    <div class="intake-actions"><button type="button" class="button button-outline" data-client-back hidden>Назад</button><button type="button" class="button" data-client-next>Далее</button><button type="submit" class="button form-submit" hidden>${local?'Проверить локальную отправку':'Отправить задачу'}</button></div>`;
  const $ = s => form.querySelector(s);
  const value = name => form.elements.namedItem(name).value.trim();
  const region = $('#clientRegion'), city = $('#clientCity'), phone = $('#clientPhone');
  const message = $('[data-message]');
  const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let selectedCity = null, cityEntries = [], cityState = 'loading', cityMatches = [];
  const cityList = $('#clientCityOptions');
  const normalizeCity = s => String(s || '').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[—–-]/g,' ').replace(/[()]/g,' ').replace(/\s+/g,' ').trim();
  const cityName = s => String(s || '').replace(/\s*\([^)]*\)/g,'').trim();
  function hideCities() { cityList.hidden = true; city.setAttribute('aria-expanded','false'); }
  function renderCities() {
    const q = normalizeCity(city.value);
    cityMatches = cityEntries.filter(item => (!region.value || item.regionCode === region.value) && (normalizeCity(item.name).includes(q) || normalizeCity(item.region).includes(q)))
      .sort((a,b) => Number(!normalizeCity(a.name).startsWith(q))-Number(!normalizeCity(b.name).startsWith(q)) || a.name.localeCompare(b.name,'ru') || a.region.localeCompare(b.region,'ru')).slice(0,20);
    const note = cityState === 'loading' ? 'Список городов загружается…' : cityState === 'error' ? 'Не удалось загрузить справочник городов. Повторите загрузку страницы.' : q.length < 2 ? 'Введите название города или региона — от двух букв' : !cityMatches.length ? 'Город не найден. Проверьте название и выбранный регион.' : '';
    cityList.innerHTML = note ? `<div class="city-suggestion-empty" role="status">${note}</div>` : cityMatches.map((item,i)=>`<button type="button" class="city-suggestion" role="option" data-client-city="${i}" aria-label="${escape(cityName(item.name))}, ${escape(item.region)}"><span>${escape(cityName(item.name))}</span><small>${escape(item.region)}</small></button>`).join('');
    cityList.hidden=false;city.setAttribute('aria-expanded','true');
  }
  city.addEventListener('input',()=>{selectedCity=null;renderCities();});
  city.addEventListener('focus',()=>{if(!selectedCity)renderCities();});
  region.addEventListener('change',()=>{selectedCity=null;city.value='';hideCities();});
  city.addEventListener('keydown',e=>{
    if(e.key==='Escape'){hideCities();return;}
    if(e.key==='ArrowDown'){e.preventDefault();if(cityList.hidden)renderCities();cityList.querySelector('button')?.focus({preventScroll:true});}
    if(e.key==='Enter' && !cityList.hidden){e.preventDefault();cityList.querySelector('button')?.click();}
  });
  cityList.addEventListener('keydown',e=>{
    const buttons=[...cityList.querySelectorAll('button')],index=buttons.indexOf(e.target);
    if(e.key==='Escape'){e.preventDefault();city.focus({preventScroll:true});hideCities();}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const next=index+(e.key==='ArrowDown'?1:-1);if(next<0)city.focus({preventScroll:true});else buttons[Math.min(next,buttons.length-1)]?.focus({preventScroll:true});}
  });
  cityList.addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault();});
  cityList.addEventListener('click',e=>{
    const button=e.target.closest('[data-client-city]');if(!button || busy || submitted)return;
    const item=cityMatches[Number(button.dataset.clientCity)];if(!item)return;
    selectedCity=item;city.value=cityName(item.name);region.value=item.regionCode;
    clearErrors();city.focus({preventScroll:true});hideCities();
  });
  form.addEventListener('focusout',e=>{if(e.target.closest('.city-field') && !$('.city-field').contains(e.relatedTarget))setTimeout(()=>{if(!$('.city-field').contains(document.activeElement))hideCities();},120);});
  document.addEventListener('click',e=>{if(!e.target.closest('#clientForm .city-field'))hideCities();});
  async function loadCustomerCities() {
    try {
      const regions=window.MALARS_TEST_DATA.REGIONS;
      let entries;
      if(local) {
        // Local preview never requests the external directory, even on cache miss.
        entries=window.MALARS_LOCAL_CITY_FIXTURE;
      } else {
        const cached=JSON.parse(localStorage.getItem('malars-test-russia-cities-v1')||'null');
        if(cached?.savedAt && Date.now()-cached.savedAt<2592000000 && Array.isArray(cached.entries))entries=cached.entries;
        if(!entries?.length){
          const response=await fetch('https://api.hh.ru/areas/113?locale=RU');if(!response.ok)throw new Error('city directory unavailable');
          const root=await response.json();
          const leaves=area=>area.areas?.length?area.areas.flatMap(leaves):area.name?[area.name]:[];
          entries=(root.areas||[]).flatMap(area=>{
            const match=regions.find(([,name])=>normalizeCity(name)===normalizeCity(area.name)) || regions.find(([,name])=>normalizeCity(name).includes(normalizeCity(area.name))||normalizeCity(area.name).includes(normalizeCity(name)));
            return [...new Set(['Москва','Санкт-Петербург','Севастополь'].includes(area.name)?[area.name]:leaves(area))].map(name=>({name,region:area.name,regionCode:match?.[0]||''}));
          });
        }
      }
      cityEntries=(entries||[]).filter(item=>item.name && item.region && regions.some(([code])=>code===item.regionCode));
      if(!cityEntries.length)throw new Error('empty city directory');
      cityState='ready';
    }catch(_){cityState='error';}
    if(document.activeElement===city)renderCities();
  }

  function clearErrors() {
    form.querySelectorAll('.field-error').forEach(x=>x.classList.remove('field-error'));
    form.querySelectorAll('[aria-invalid]').forEach(x=>{x.removeAttribute('aria-invalid');x.removeAttribute('aria-describedby');});
    form.querySelectorAll('.field-error-text').forEach(x=>x.remove());
    message.textContent = ''; message.dataset.error = 'false'; message.setAttribute('role','status');
  }
  function error(text, field) {
    message.textContent = text; message.dataset.error = 'true'; message.setAttribute('role','alert');
    if (field) {
      field.setAttribute('aria-invalid','true');
      const block = field.closest('label,.city-field'); block.classList.add('field-error');
      const hint = document.createElement('p'); hint.className='field-error-text'; hint.id='clientFieldError'; hint.textContent=text;
      block.append(hint); field.setAttribute('aria-describedby',hint.id); field.focus({preventScroll:true});
      block.scrollIntoView({block:'center',behavior:'instant'});
    } else message.scrollIntoView({block:'center',behavior:'instant'});
    return false;
  }
  function validate(index) {
    const rules = index === 0 ? [
      [form.elements.name, !!value('name'), 'Укажите, как к вам обращаться.'],
      [phone, /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(phone.value), 'Введите телефон в формате +7 (999) 999-99-99.'],
      [$('#clientEmail'), /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value('email')), 'Введите корректный email.']
    ] : [[region, !!region.value, 'Выберите регион.'], [city, !!selectedCity && city.value === cityName(selectedCity.name) && region.value === selectedCity.regionCode, 'Выберите город из справочника — нажмите на подсказку.'], [form.elements.task, !!value('task'), 'Опишите, что нужно сделать.']];
    const bad = rules.find(r=>!r[1]); return bad ? error(bad[2],bad[0]) : true;
  }
  function review() {
    const groups = [
      [['Имя',value('name')],['Телефон',phone.value],['Email',value('email')],['Организация',value('organization')||'Не указана']],
      [['Регион',region.selectedOptions[0]?.textContent||''],['Город',city.value.trim()],['Задача',value('task')],['Желаемый срок',value('deadline')||'Не указан'],['Исходные документы','Без вложений — загрузка в TEST отключена']]
    ];
    $('[data-client-review]').innerHTML=groups.map((rows,i)=>`<div><h3>${titles[i]}</h3><dl>${rows.map(([k,v])=>`<dt>${k}</dt><dd>${escape(v)}</dd>`).join('')}</dl><button type="button" class="button button-outline" data-client-edit="${i}">Редактировать: ${titles[i].toLowerCase()}</button></div>`).join('');
  }
  function show(index, scroll=true) {
    step=index; clearErrors(); hideCities();
    form.querySelectorAll('[data-client-step]').forEach((x,i)=>x.hidden=i!==step);
    form.querySelectorAll('[data-client-indicator]').forEach((x,i)=>{if(i===step)x.setAttribute('aria-current','step');else x.removeAttribute('aria-current');});
    $('[data-client-count]').textContent=`шаг ${step+1} из 3`; $('[data-client-title]').textContent=titles[step];
    $('.intake-progress').setAttribute('aria-valuenow',step+1); $('.intake-progress span').style.width=`${(step+1)/3*100}%`;
    $('[data-client-back]').hidden=step===0; $('[data-client-next]').hidden=step===2; $('.form-submit').hidden=step!==2;
    if(step===2) review();
    if(scroll){
      $('[data-client-title]').focus({preventScroll:true});
      const generation=++scrollGeneration;
      const align=()=>{if(generation===scrollGeneration)window.scrollTo({top:Math.max(0,form.getBoundingClientRect().top+scrollY-(document.querySelector('header')?.getBoundingClientRect().height||80)-16),behavior:'instant'});};
      align();requestAnimationFrame(()=>requestAnimationFrame(align));setTimeout(align,120);setTimeout(align,300);
    }
  }
  phone.addEventListener('input',()=>{
    let digits=phone.value.replace(/\D/g,''); if(digits[0]==='8')digits='7'+digits.slice(1);if(digits && digits[0]!=='7')digits='7'+digits;
    digits=digits.slice(0,11);let s=digits?'+7':'';if(digits.length>1)s+=' ('+digits.slice(1,4);if(digits.length>=4)s+=')';if(digits.length>4)s+=' '+digits.slice(4,7);if(digits.length>7)s+='-'+digits.slice(7,9);if(digits.length>9)s+='-'+digits.slice(9,11);phone.value=s;
  });
  const edited=()=>{scrollGeneration++;clearErrors();};
  form.addEventListener('input',edited); form.addEventListener('change',edited);
  form.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button || busy || submitted)return;
    if(button.hasAttribute('data-client-back'))show(step-1);
    if(button.hasAttribute('data-client-next')){clearErrors();if(validate(step))show(step+1);}
    if(button.hasAttribute('data-client-edit'))show(Number(button.dataset.clientEdit));
  });
  form.addEventListener('submit',async e=>{
    e.preventDefault();e.stopImmediatePropagation();if(busy||submitted)return;
    clearErrors();if(step<2){if(validate(step))show(step+1);return;}
    for(let i=0;i<2;i++){show(i,false);if(!validate(i))return;}show(2,false);
    if(!form.elements.consent.checked)return error('Подтвердите согласие на обработку данных.',form.elements.consent);
    if($('#clientFiles').files.length)return error('Загрузка файлов в TEST отключена. Отправьте задачу без вложений.');
    if(local && window.MALARS_TEST_CONFIG.apiBaseUrl!==location.origin)return error('Локальная отправка разрешена только в API на этом компьютере.');
    busy=true; form.setAttribute('aria-busy','true');form.querySelectorAll('button,input,select,textarea').forEach(x=>x.disabled=true);
    try {
      const regionName=region.selectedOptions[0].textContent;
      const result=await window.postJson({formType:'client',name:value('name'),contact:phone.value,email:value('email'),organization:value('organization'),region:regionName,cityName:city.value.trim(),city:`${regionName} / ${city.value.trim()}`,task:value('task'),deadline:value('deadline'),files:[],page:location.href,submittedAt:new Date().toISOString()});
      if(!result?.ok || !result.data?.request_id)throw new Error('API не подтвердил приём заявки. Ответы сохранены на открытой странице; повторите попытку.');
      if(local && result.data.local_preview!==true)throw new Error('API не подтвердил локальную имитацию. Результат отправки не подтверждён.');
      submitted=true;
      message.textContent=local ? `Локальная имитация завершена. МАЛАРС не получает заявку. Номер проверки: ${result.data.request_id}` : `Заявка принята. Номер: ${result.data.request_id}`;
      message.scrollIntoView({block:'center',behavior:'instant'});
    } catch(err){error(err.message||'Не удалось отправить задачу. Повторите попытку.');}
    finally{busy=false;form.removeAttribute('aria-busy');if(!submitted){form.querySelectorAll('button,input,select,textarea').forEach(x=>x.disabled=false);$('#clientFiles').disabled=true;}}
  },true);
  function regionsReady(){
    const data=window.MALARS_TEST_DATA?.REGIONS;if(!data)return;
    region.replaceChildren(new Option('Выберите регион',''),...data.filter(([code])=>code!=='RU-ALL').map(([code,name])=>new Option(name,code)));
    loadCustomerCities();
  }
  document.addEventListener('malars:core-ready',regionsReady,{once:true});regionsReady();show(0,false);
  if(local && window.MALARS_TEST_CONFIG.apiBaseUrl===location.origin && window.MALARS_LOCAL_CUSTOMER_FIXTURE){
    const fixture=window.MALARS_LOCAL_CUSTOMER_FIXTURE;
    for(const key of ['name','contact','email','organization'])if(typeof fixture[key]==='string')form.elements.namedItem(key).value=fixture[key];
    if(window.MALARS_LOCAL_CUSTOMER_START_TASK===true && validate(0))show(1,false);
  }
})();
