(() => {
  const API = window.MALARS_TEST_CONFIG?.apiBaseUrl;
  const CITY_API = "https://api.hh.ru/areas/113?locale=RU";
  const CITY_CACHE_KEY = "malars-test-russia-cities-v1";
  const CONSENT = "CONSENT-PARTICIPANT-PD-1.0";
  const consentText = "Согласен(на) на обработку данных для предварительного рассмотрения анкеты в тестовом контуре МАЛАРС. Использую только вымышленные данные.";
  // Temporary opt-in fixture, enabled only by the generated localhost config.
  const localPrefill = window.MALARS_LOCAL_PREFILL === true && ['localhost','127.0.0.1'].includes(location.hostname) && API === location.origin;
  let data = localPrefill ? {...window.MALARS_LOCAL_FIXTURE} : {};
  let intakeId = "";
  let token = "";
  let number = "";
  let revision = 0;
  let status = "";
  let busy = false;
  let section = 0;
  let cityOptions = [];
  let cityOptionsReady = false;
  const sections = [
    ["Идентификация и контакты", [
      ["legalForm", "Юридическая форма", "select", ["ПАО", "АО", "ООО", "ИП", "Самозанятый", "Физлицо"]],
      ["companyName", "Полное название компании или ФИО", "text"], ["inn", "ИНН (10 цифр для компании, 12 для ИП/самозанятого)", "text"],
      ["contactName", "Контактное лицо", "text"], ["email", "Email", "email"], ["phone", "Контактный телефон (можно изменить)", "tel"],
      ["contactChannel", "Предпочитаемый способ связи", "select", ["Звонок", "Telegram", "WhatsApp", "Email"]],
    ]],
    ["Специализации", [["competencies", "Виды работ (можно выбрать несколько)", "works"], ["otherWorks", "Другие работы", "text"], ["executionMethods", "Как выполняете работы?", "checks", ["Собственными силами", "Своими силами и с партнёрами", "Через субподряд"]], ["supply", "Также можем поставлять материалы или оборудование", "check"], ["scopes", "Масштаб работ", "checks", ["Отдельная работа", "Несколько связанных работ", "Отдельная система или раздел под ключ"]], ["turnkeyDetails", "Что именно можете закрыть и с чьим участием? Пример (необязательно)", "textarea"]]],
    ["Типы объектов и география", [["objectExperience", "Есть опыт на объектах", "objects"], ["objectReady", "Готовы выполнять работы на объектах", "objects"], ["baseRegionCode", "Регион базирования", "regions-select"], ["geographyMode", "География работы", "select", ["Город и рядом", "Регион", "Выбранные регионы", "Вся Россия"]], ["regions", "Дополнительные регионы работы", "regions"], ["travel", "Командировки", "select", ["Да", "По согласованию", "Нет"]], ["remote", "Дистанционная работа", "select", ["Да", "Нет", "Зависит от задачи"]], ["limits", "Ограничения по географии или объектам", "text"]]],
    ["Команда и ресурсы", [["teamSize", "Основная команда", "select", ["1 человек", "2–5", "6–15", "16–30", "31–50", "51–100", "100+"]], ["crewCount", "Количество бригад", "number"], ["teamLeads", "Руководители бригад", "number"], ["canExpand", "Возможность усиления", "select", ["Своя команда", "Партнёры", "Нет"]], ["parallelProjects", "Одновременные объекты", "number"], ["availability", "Когда готовы приступить к работе?", "select", ["Сейчас", "Через 2–4 недели", "По согласованию", "Пока заняты"]], ["resources", "Ресурсы", "checks", ["Инструмент", "Измерительные приборы", "Транспорт", "Спецтехника", "Мастерская", "Своё оборудование", "Аренда оборудования"]], ["comment", "Комментарий о команде и ресурсах", "textarea"]]],
    ["Опыт и проекты", [["experienceYears", "Стаж", "select", ["До года", "1–3 года", "3–5 лет", "5–10 лет", "10+ лет"]], ["hasProjects", "Есть завершённые проекты?", "select", ["Да", "Нет"]], ["role", "Ваша роль", "checks", ["Исполнитель", "Бригада", "Субподрядчик", "Генподрядчик", "Проектировщик"]], ["workExamples", "1–3 примера: тип объекта, работы, роль, год. Если портфолио нет — опишите опыт", "textarea"], ["portfolioUrl", "Сайт или открытое портфолио (необязательно)", "url"], ["recommendations", "Рекомендации или публичные ссылки (необязательно)", "textarea"], ["credentials", "Декларируемые СРО, лицензии, сертификаты (для последующей проверки)", "text"]]],
    ["Условия и масштаб заказов", [["orderTypes", "Что интересно выполнять?", "checks", ["Небольшие разовые работы", "Отдельные этапы или разделы", "Регулярный субподряд", "Крупные объёмы", "Сервис и долгосрочная работа"]], ["minBudget", "Минимальный интересный бюджет", "select", ["Зависит от задачи", "до 100 тыс.", "100–300 тыс.", "300–500 тыс.", "500 тыс.–1 млн", "1–3 млн", "3–10 млн", "10 млн+"]], ["maxScale", "Максимальный масштаб", "select", ["Малый", "Средний", "Крупный", "Зависит от работ"]], ["contractReady", "Готовность работать по договору", "select", ["Да", "Обсудим", "Нет"]], ["vat", "НДС", "select", ["С НДС", "Без НДС", "Не применимо"]], ["paymentPreference", "Предпочтение оплаты", "checks", ["Аванс", "Поэтапная оплата", "По факту"]], ["termsComment", "Дополнительные условия", "textarea"]]],
  ];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const root = document.querySelector("#partnerFormV2");
  if (!root || !API) return;
  root.hidden = true;
  const host = document.createElement("section");
  host.id = "participantIntake";
  host.className = "form-panel participant-intake";
  root.before(host);
  const statusLine = (m, bad = false) => {
    const x=host.querySelector('[data-message]');
    host.querySelectorAll('.field-error').forEach(el=>el.classList.remove('field-error'));
    host.querySelectorAll('[aria-invalid="true"]').forEach(el=>el.removeAttribute('aria-invalid'));
    if(!x)return;
    x.textContent=m; x.dataset.error=bad?'true':'false';x.setAttribute('role',bad?'alert':'status');x.setAttribute('aria-live',bad?'assertive':'polite');
    if(!bad)return;
    const mapping=[[/обращаться|контактное лицо/i,'[data-key="displayName"],[data-key="contactName"]'],[/формат работы/i,'input[name="workFormat"]'],[/направлен/i,'[data-profile-direction]'],[/город/i,'[data-key="baseCity"]'],[/телефон/i,'[data-key="phone"]'],[/email/i,'[data-key="email"]'],[/ИНН/i,'[data-key="inn"]'],[/соглас/i,'[data-key="consent"],[data-final-consent]'],[/как выполняете/i,'input[name="executionMethods"]'],[/масштаб/i,'input[name="scopes"]'],[/что именно/i,'[data-key="turnkeyDetails"]'],[/типам объектов/i,'input[name="objectExperience"],input[name="objectReady"]']];
    const selector=mapping.find(([pattern])=>pattern.test(m))?.[1];
    const inputs=selector?[...host.querySelectorAll(selector)]:[...host.querySelectorAll('input:invalid,select:invalid,textarea:invalid')];
    for(const input of inputs){input.setAttribute('aria-invalid','true');(input.closest('fieldset,.intake-field,.city-field,.consent') || input.closest('label') || input).classList.add('field-error');}
    const target=host.querySelector('.field-error') || x;
    target.scrollIntoView({behavior:'smooth',block:'center'});
  };
  const send = async (path, method, body, headers = {}) => {
    const res = await fetch(API + path, {method, cache:"no-store", headers:{"Content-Type":"application/json", ...headers}, body:body == null ? undefined : JSON.stringify(body)});
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(json.error || `HTTP ${res.status}`); e.status = res.status; throw e; }
    json.httpStatus = res.status;
    return json;
  };
  const tokenHeaders = () => ({"X-Participant-Token": token, "X-Intake-Revision": String(revision)});
  const draftPath = () => `/api/participant-drafts/${encodeURIComponent(intakeId)}`;
  let scrollGeneration = 0;
  host.addEventListener('change',()=>{scrollGeneration++;});
  function scrollToFormStart() {
    const generation=++scrollGeneration;
    const align=()=>{
      if(generation!==scrollGeneration || !host.isConnected)return;
      const header=document.querySelector('header');
      const offset=(header?.getBoundingClientRect().height || 80)+16;
      window.scrollTo({top:Math.max(0,host.getBoundingClientRect().top+window.scrollY-offset),behavior:'instant'});
    };
    requestAnimationFrame(()=>requestAnimationFrame(align));
    setTimeout(align,120);
    setTimeout(align,300);
  }
  const renderStart = () => {
    const formats = ["Самостоятельно", "В составе бригады", "От имени компании"];
    const catalog = window.MalarsSpecializationCatalog;
    const selected = catalog?.directionsFor(data.mainCategories || [], window.MALARS_TEST_DATA?.WORKS || []) || [];
    const profiles = catalog ? catalog.directions.map(([id, name]) => `<label class="intake-choice intake-profile"><input type="checkbox" data-profile-direction="${id}" ${selected.includes(id) ? 'checked' : ''}><span><strong role="heading" aria-level="3">${esc(name)}</strong><small>${esc(catalog.directionHints[id])}</small></span></label>`).join('') : '<p>Направления загружаются…</p>';
    host.innerHTML = `<div class="participant-intake-head"><p class="eyebrow">Анкета подрядчика · уровень 1 из 2</p><h2>Коротко познакомимся</h2><p>Это займёт около 1–2 минут.</p></div>
      <div class="intake-grid intake-start-grid"><label>Как к вам обращаться?<input data-key="displayName" autocomplete="organization" value="${esc(data.displayName)}" required></label>
      <fieldset><legend>Формат работы</legend>${formats.map(v=>choice("workFormat",v)).join("")}</fieldset>
      <fieldset class="intake-profiles"><legend>Ваши направления</legend><p class="field-hint">Выберите одно или несколько. Детали уточним дальше.</p><div class="intake-profile-list">${profiles}</div><label>Другое<input data-key="otherWorks" value="${esc(data.otherWorks)}"></label></fieldset>
      <div class="city-field"><label for="baseCitySearch">Город базирования</label><input id="baseCitySearch" data-key="baseCity" role="combobox" aria-autocomplete="list" aria-controls="baseCityOptions" aria-expanded="false" autocomplete="off" placeholder="Начните вводить город" value="${esc(cityDisplayName(data.baseCity))}" required><div id="baseCityOptions" class="city-suggestions" role="listbox" hidden></div></div>
      <label>Контактный телефон<input data-key="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (900) 000-00-00" value="${esc(data.phone)}" required></label>
      <label class="consent intake-consent"><input data-key="consent" type="checkbox" ${data.consent ? "checked" : ""}><span>${esc(consentText)} Версия ${CONSENT}. <a href="legal/participant-consent.html" target="_blank" rel="noopener">Текст TEST-согласия</a></span></label></div>
      <div class="intake-actions"><button class="button button-secondary" data-action="continue">Продолжить анкету</button></div><p data-message role="status" aria-live="polite"></p>`;
    bindInputs();
    host.querySelectorAll('[data-profile-direction]').forEach(input => input.addEventListener('change', () => {
      data.mainCategories = catalog.changeDirection(data.mainCategories || [], input.dataset.profileDirection, input.checked, window.MALARS_TEST_DATA?.WORKS || []);
    }));
    setupCityAutocomplete();
    scrollToFormStart();
  };
  function choice(key, val, type="radio", label=val) { return `<label class="intake-choice"><input type="${type}" name="${key}" value="${esc(val)}" ${type === "radio" && data[key]===val || type === "checkbox" && (data[key]||[]).includes(val) ? "checked" : ""}><span>${esc(label)}</span></label>`; }
  const cityDisplayName = value => String(value || "").replace(/\s*\([^)]*\)/g, "").trim();
  const bindInputs = () => host.querySelectorAll("[data-key],input[name]").forEach(el => {
    el.addEventListener("input", () => {
      if (el.dataset.key === "phone") {
        el.value = formatPhone(el.value);
        el.setSelectionRange(el.value.length, el.value.length);
      }
      if (el.id === "baseCitySearch") {
        delete data.baseRegionCode;
        el.dataset.citySelected = "false";
        renderCitySuggestions(el.value);
      }
      capture();
    });
    el.addEventListener("change", capture);
  });

  function formatPhone(value) {
    const raw = String(value || "").trim();
    let digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    if (raw.startsWith("+") && !raw.startsWith("+7")) return raw;
    if (digits[0] === "8") digits = `7${digits.slice(1)}`;
    else if (digits[0] !== "7") {
      if (digits[0] === "9" || digits.length >= 10) digits = `7${digits}`;
      else return raw;
    }
    digits = digits.slice(0, 11);
    const n = digits.slice(1);
    let formatted = "+7";
    if (n.length) formatted += ` (${n.slice(0, 3)}`;
    if (n.length >= 3) formatted += ")";
    if (n.length > 3) formatted += ` ${n.slice(3, 6)}`;
    if (n.length > 6) formatted += `-${n.slice(6, 8)}`;
    if (n.length > 8) formatted += `-${n.slice(8, 10)}`;
    return formatted;
  }

  function isValidPhone(value) {
    return /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(value || "");
  }

  const normalizeLocation = value => String(value || "").toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/[—–-]/g, " ").replace(/[()]/g, " ").replace(/\s+/g, " ").trim();

  async function loadCityOptions() {
    // Do not cache cities before the core region codes have loaded.
    if (!window.MALARS_TEST_DATA?.REGIONS?.length) {
      await new Promise(resolve => document.addEventListener('malars:core-ready', resolve, {once:true}));
    }
    let areas;
    try {
      const cached = JSON.parse(localStorage.getItem(CITY_CACHE_KEY) || "null");
      if (cached?.savedAt && Date.now() - cached.savedAt < 2592000000 && Array.isArray(cached.entries) && cached.entries.some(item => item.regionCode)) {
        cityOptions = cached.entries;
        cityOptionsReady = true;
        return;
      }
    } catch (_) {}
    const response = await fetch(CITY_API);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const root = await response.json();
    areas = root.areas || [];
    const regions = window.MALARS_TEST_DATA?.REGIONS || [];
    const collectLeaves = area => Array.isArray(area?.areas) && area.areas.length
      ? area.areas.flatMap(collectLeaves)
      : area?.name ? [area.name] : [];
    const entries = [];
    for (const area of areas) {
      const cities = ["Москва", "Санкт-Петербург", "Севастополь"].includes(area.name)
        ? [area.name]
        : [...new Set(collectLeaves(area))];
      const region = regions.find(([, name]) => normalizeLocation(name) === normalizeLocation(area.name))
        || regions.find(([, name]) => normalizeLocation(name).includes(normalizeLocation(area.name)) || normalizeLocation(area.name).includes(normalizeLocation(name)));
      for (const city of cities) entries.push({ name: city, region: area.name, regionCode: region?.[0] || "" });
    }
    cityOptions = entries.sort((a, b) => a.name.localeCompare(b.name, "ru") || a.region.localeCompare(b.region, "ru"));
    cityOptionsReady = cityOptions.length > 0;
    if (!cityOptionsReady) throw new Error("empty city list");
    try { localStorage.setItem(CITY_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), entries: cityOptions })); } catch (_) {}
  }

  function renderCitySuggestions(query) {
    const input = host.querySelector("#baseCitySearch");
    const list = host.querySelector("#baseCityOptions");
    if (!input || !list) return;
    const q = normalizeLocation(query);
    if (!cityOptionsReady) {
      list.innerHTML = `<div class="city-suggestion-empty" role="option">Список городов загружается…</div>`;
    } else if (q.length < 2) {
      list.innerHTML = `<div class="city-suggestion-empty" role="option">Введите название города или региона</div>`;
    } else {
      const matches = cityOptions
        .filter(item => normalizeLocation(item.name).includes(q) || normalizeLocation(item.region).includes(q))
        .sort((a, b) => {
          const score = item => {
            const city = normalizeLocation(item.name);
            const region = normalizeLocation(item.region);
            let shared = 0;
            while (shared < city.length && shared < region.length && city[shared] === region[shared]) shared++;
            if (city.startsWith(q) && shared >= Math.min(city.length, q.length + 2)) return 0;
            return city.startsWith(q) ? 1 : city.includes(q) ? 2 : region.startsWith(q) ? 3 : 4;
          };
          return score(a) - score(b) || a.name.localeCompare(b.name, "ru") || a.region.localeCompare(b.region, "ru");
        })
        .slice(0, 20);
      list.innerHTML = matches.length
        ? matches.map((item, index) => `<button class="city-suggestion" type="button" role="option" data-city-index="${index}" aria-label="${esc(cityDisplayName(item.name))}, ${esc(item.region)}"><span>${esc(cityDisplayName(item.name))}</span><small>${esc(item.region)}</small></button>`).join("")
        : `<div class="city-suggestion-empty" role="option">Город не найден</div>`;
      list.dataset.resultIndexes = JSON.stringify(matches.map(item => cityOptions.indexOf(item)));
    }
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function setupCityAutocomplete() {
    const input = host.querySelector("#baseCitySearch");
    const list = host.querySelector("#baseCityOptions");
    if (!input || !list) return;
    input.dataset.citySelected = String(Boolean(data.baseCity && data.baseRegionCode));
    input.addEventListener("focus", () => { if (input.value) renderCitySuggestions(input.value); });
    input.addEventListener("keydown", event => {
      const options = [...list.querySelectorAll("button[data-city-index]")];
      if (event.key === "ArrowDown" && options.length) { event.preventDefault(); options[0].focus(); }
      if (event.key === "Enter" && !list.hidden && options.length) { event.preventDefault(); options[0].click(); }
      if (event.key === "Escape") { list.hidden = true; input.setAttribute("aria-expanded", "false"); }
    });
    list.addEventListener("mousedown", event => { if (event.target.closest("button[data-city-index]")) event.preventDefault(); });
    list.addEventListener("click", event => {
      const button = event.target.closest("button[data-city-index]");
      if (!button) return;
      const indexes = JSON.parse(list.dataset.resultIndexes || "[]");
      const item = cityOptions[indexes[Number(button.dataset.cityIndex)]];
      if (!item) return;
      input.value = cityDisplayName(item.name);
      input.dataset.citySelected = "true";
      data.baseCity = cityDisplayName(item.name);
      data.baseRegionCode = item.regionCode;
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      capture();
    });
    input.addEventListener("blur", () => setTimeout(() => { list.hidden = true; input.setAttribute("aria-expanded", "false"); }, 120));
    loadCityOptions().then(() => {
      if (input.value && input.dataset.citySelected !== "true") renderCitySuggestions(input.value);
    }).catch(() => {
      list.innerHTML = `<div class="city-suggestion-empty" role="option">Не удалось загрузить города. Проверьте подключение.</div>`;
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
    });
  }
  function capture() {
    host.querySelectorAll("[data-key]").forEach(el => { const k=el.dataset.key; data[k]=el.type==="checkbox"?el.checked:el.value; });
    host.querySelectorAll('input[name][type="radio"], input[name][type="checkbox"]').forEach(el => {
      const k=el.name; if(el.type==="radio") { if(el.checked) data[k]=el.value; }
      else { data[k]=[...host.querySelectorAll(`input[name="${CSS.escape(k)}"]:checked`)].map(x=>x.value); }
    });
  }
  function renderMessage(kind) {
    scrollToFormStart();
    const link = `${location.origin}${location.pathname}#intake=${encodeURIComponent(intakeId)}&token=${encodeURIComponent(token)}`;
    host.innerHTML = `<h2>${kind === "saved" ? `Черновик № ${esc(number)} сохранён` : kind === "submitted" ? `Анкета № ${esc(number)} получена` : `Анкета № ${esc(number)} обновлена`}</h2>
      <p>${kind === "saved" ? "Продолжите сейчас или вернитесь позже по персональной ссылке. Ссылка даёт доступ к анкете — не передавайте её другим. Она действует 30 дней." : "Спасибо! МАЛАРС предварительно изучит профиль и при подходящем опыте свяжется для знакомства. Отправка не означает автоматического принятия в сеть и не гарантирует заказов."}</p>
      <p>Номер — только идентификатор, он не открывает анкету. Ревизия ${revision}; обновлено ${new Date().toLocaleString("ru-RU")}.</p>
      <div class="intake-actions">${kind === "saved" ? '<button class="button" data-action="continue">Продолжить сейчас</button>' : '<button class="button" data-action="edit">Изменить анкету</button>'}<button class="button button-secondary" data-action="copy-link">Скопировать ссылку</button><button class="button button-secondary" data-action="copy-number">Скопировать номер</button></div><p data-message role="status" aria-live="polite"></p>`;
    appendSpecializationNotice();
    host.querySelector('[data-action="continue"]')?.addEventListener("click", () => {section=0;renderSection();});
    host.querySelector('[data-action="edit"]')?.addEventListener("click", () => {section=0;renderSection();});
    host.querySelector('[data-action="copy-link"]')?.addEventListener("click", async()=>{await navigator.clipboard.writeText(`${location.origin}${location.pathname}#intake=${encodeURIComponent(intakeId)}&token=${encodeURIComponent(token)}`);statusLine("Персональная ссылка скопирована.");});
    host.querySelector('[data-action="copy-number"]')?.addEventListener("click", async()=>{await navigator.clipboard.writeText(number);statusLine("Номер скопирован.");});
  }
  function appendSpecializationNotice() {
    if (!window.MalarsSpecializations) return;
    const note = document.createElement('aside');
    note.className = 'spec-notice';
    note.setAttribute('role', 'note');
    note.textContent = window.MalarsSpecializations.summary(intakeId);
    host.append(note);
  }
  function field(item) {
    const [key,,type] = item;
    const wide = ["works", "checks", "textarea", "check"].includes(type);
    return `<div class="intake-field ${wide ? "intake-wide" : ""}" data-field="${key}">${renderField(item)}</div>`;
  }
  function renderField([key,label,type,opts]) {
    if(type==="works") {
      if (window.MalarsSpecializations) return '<div data-specializations></div>';
      return '<p role="alert">Не удалось загрузить справочник специализаций. Обновите страницу. Прежние выбранные значения сохранены.</p>';
    }
    if(type==="objects") return `<fieldset><legend>${esc(label)}</legend><div class="intake-checks">${(window.MALARS_TEST_DATA?.OBJECT_TYPES||[]).map(x=>choice(key,x[1],"checkbox")).join("")}</div></fieldset>`;
    if(type==="regions") return `<fieldset class="intake-regions"><legend>${esc(label)}</legend><p class="field-hint">Выберите дополнительные регионы, в которых выполняете работы.</p><label class="region-search-label">Поиск региона<input type="search" data-region-search placeholder="Начните вводить название региона" autocomplete="off"></label><div class="region-options">${(window.MALARS_TEST_DATA?.REGIONS||[]).filter(x=>x[0]!=="RU-ALL").map(x=>choice(key,x[0],"checkbox",x[1])).join("")}</div><p data-region-empty hidden>Регионы не найдены</p></fieldset>`;
    if(type==="regions-select") return `<label>${esc(label)}<select data-key="${key}"><option value="">Выберите регион</option>${(window.MALARS_TEST_DATA?.REGIONS||[]).filter(x=>x[0]!=="RU-ALL").map(x=>`<option value="${esc(x[0])}" ${data[key]===x[0]?"selected":""}>${esc(x[1])}</option>`).join("")}</select></label>`;
    if(type==="checks") return `<fieldset><legend>${esc(label)}</legend><div class="intake-checks">${opts.map(x=>choice(key,x,"checkbox")).join("")}</div></fieldset>`;
    if(type==="select") return `<label>${esc(label)}<select data-key="${key}"><option value="">Выберите</option>${opts.map(x=>`<option ${data[key]===x?"selected":""}>${esc(x)}</option>`).join("")}</select></label>`;
    if(type==="check") return `<label class="intake-choice"><input data-key="${key}" type="checkbox" ${data[key]?"checked":""}><span>${esc(label)}</span></label>`;
    const tag=type==="textarea"?"textarea":"input";return `<label>${esc(label)}<${tag} data-key="${key}" ${tag==="input"?`type="${type}" value="${esc(data[key])}" ${key==="email"?'required autocomplete="email" placeholder="name@example.ru"':''} ${type==="number"?'min="0" max="1000" step="1"':''}`:""}>${tag==="textarea"?esc(data[key]):""}</${tag}></label>`;
  }
  function sectionFields(fields) {
    const byKey = key => { const item = fields.find(x=>x[0]===key); return item ? field(item) : ""; };
    if (section===1) return `<div class="intake-stack">${["competencies","executionMethods","scopes","turnkeyDetails"].map(byKey).join("")}</div>`;
    if (section===4) return `<div class="intake-grid intake-detail-grid">${["experienceYears","hasProjects","role","workExamples","portfolioUrl","credentials","recommendations"].map(byKey).join("")}</div>`;
    if (section===2) return `<div class="intake-grid intake-detail-grid">${["objectExperience","objectReady"].map(byKey).join("")}</div><div class="intake-geography"><div class="intake-stack">${["baseRegionCode","geographyMode","regions"].map(byKey).join("")}</div><div class="intake-stack">${["travel","remote","limits"].map(byKey).join("")}</div></div>`;
    return `<div class="intake-grid intake-detail-grid">${fields.map(field).join("")}</div>`;
  }
  function bindRegionSearch() {
    const search=host.querySelector("[data-region-search]");
    if(!search)return;
    search.addEventListener("input",()=>{
      const q=normalizeLocation(search.value);
      const options=[...host.querySelectorAll(".region-options .intake-choice")];
      options.forEach(label=>{label.hidden=!normalizeLocation(label.textContent).includes(q);});
      host.querySelector("[data-region-empty]").hidden=options.some(label=>!label.hidden);
    });
  }
  function renderSection() {
    scrollToFormStart();
    if(section===0){if(!data.contactName)data.contactName=data.displayName||"";if(["ООО","АО","ПАО","ИП"].includes(data.legalForm)&&!data.companyName)data.companyName=data.displayName||"";}
    const [title,allFields]=sections[section];
    const fields = visibleFields(section, allFields);
    host.innerHTML=`<p class="eyebrow">Уровень 2 из 2 · раздел ${section+1} из ${sections.length}</p><div class="intake-progress" aria-label="Прогресс анкеты"><span style="width:${Math.round((section+1)/sections.length*100)}%"></span></div><h2>${esc(title)}</h2>${sectionFields(fields)}<div class="intake-actions"><button class="button button-secondary" data-action="back">Назад</button><button class="button" data-action="next">${section===sections.length-1?"Проверить данные":"Сохранить и продолжить"}</button></div><p data-message role="status" aria-live="polite"></p>`;
    bindInputs();
    bindRegionSearch();
    if (section === 1) {
      const editor = host.querySelector('[data-specializations]');
      if (editor && window.MalarsSpecializations) window.MalarsSpecializations.mount(editor, data, intakeId, window.MALARS_TEST_DATA?.WORKS || []);
      host.querySelector('[data-action="next"]').textContent = 'Продолжить (детализация локально)';
    }
    host.querySelector('[data-action="back"]').onclick=()=>{capture();if(section===0){renderStart();return;}section--;renderSection();};
    host.querySelector('[data-action="next"]').onclick=async()=>{capture();if(section===0&&!validateRequired())return;if(section===1){const error=(!(data.competencies||[]).length?'Выберите хотя бы одну специализацию в выбранных подсистемах.':'') || window.MalarsSpecializations?.validate(intakeId) || (!(data.executionMethods||[]).length?'Укажите, как выполняете работы.':!(data.scopes||[]).length?'Выберите масштаб работ.':'');if(error){statusLine(error,true);host.querySelector('[data-specializations]')?.dispatchEvent(new CustomEvent('spec:invalid',{detail:{message:error}}));return;}}if(!await saveAnswers())return;if(section===sections.length-1)renderReview();else{section++;renderSection();}};
  }
  function visibleFields(index, fields) {
    if(index===1) fields=fields.filter(([key])=>!["otherWorks","supply"].includes(key));
    if(index===0) fields=fields.filter(([key])=>!['contactName','phone'].includes(key));
    return index===3 && data.workFormat === "Самостоятельно"
      ? fields.filter(([key]) => !["crewCount","teamLeads","canExpand","parallelProjects"].includes(key))
      : fields;
  }
  function validateRequired() {
    const form=host.querySelectorAll("input,select,textarea");
    const legal=data.legalForm||({"От имени компании":"ООО"}[data.participantType]||"Физлицо");
    const inn=String(data.inn||"").replace(/\D/g,"");
    const needsInn=["ООО","АО","ПАО"].includes(legal)||["ИП","Самозанятый"].includes(legal);
    let error="";
    if(!data.contactName&&!data.displayName)error="Укажите контактное лицо.";
    else if(!data.email||!/^\S+@\S+\.\S{2,}$/.test(data.email))error="Укажите корректный email для связи.";
    else if(!isValidPhone(data.phone))error="Укажите корректный российский номер телефона в формате +7 (900) 000-00-00.";
    else if(!data.baseCity||!data.baseRegionCode)error="Выберите город базирования из списка.";
    else if(needsInn&&inn.length!==(["ООО","АО","ПАО"].includes(legal)?10:12))error=`Для выбранной формы нужен ИНН из ${["ООО","АО","ПАО"].includes(legal)?10:12} цифр.`;
    else if(section===sections.length-1&&!(data.competencies||[]).length)error="Выберите хотя бы одну специализацию.";
    else if(section===sections.length-1&&!(data.objectExperience||[]).length&&!(data.objectReady||[]).length)error="Укажите опыт или готовность по типам объектов.";
    if(error){statusLine(error,true);const target=error.includes("email")?host.querySelector('[data-key="email"]'):error.includes("телефона")?host.querySelector('[data-key="phone"]'):error.includes("город")?host.querySelector('[data-key="baseCity"]'):null;const bad=target||[...form].find(x=>!x.value&&x.type!=="checkbox");bad?.focus();return false;}return true;
  }

  function validateStart() {
    capture();
    const input=host.querySelector("#baseCitySearch");
    let error="";
    if(!data.displayName?.trim())error="Укажите, как к вам обращаться.";
    else if(!data.workFormat)error="Выберите формат работы.";
    else if(!(data.mainCategories||[]).length)error="Выберите хотя бы одно основное направление работ.";
    else if(!input?.value.trim()||input.dataset.citySelected!=="true"||!data.baseRegionCode)error="Выберите город базирования из выпадающего списка.";
    else if(!isValidPhone(data.phone))error="Укажите корректный номер телефона. Например: 900 123-45-67.";
    else if(!data.consent)error="Подтвердите согласие для продолжения.";
    if(error){
      statusLine(error,true);
      const target=!data.displayName?.trim()?host.querySelector('[data-key="displayName"]'):!data.workFormat?host.querySelector('input[name="workFormat"]'):!(data.mainCategories||[]).length?host.querySelector('[data-profile-direction]'):!input?.value.trim()||input.dataset.citySelected!=="true"?input:!isValidPhone(data.phone)?host.querySelector('[data-key="phone"]'):host.querySelector('[data-key="consent"]');
      target?.focus();
      return false;
    }
    statusLine("");
    return true;
  }
  async function saveAnswers() {
    if(busy)return false;busy=true;
    try {const r=await send(draftPath(),"PUT",{answers:data},tokenHeaders());revision=r.data.revision;number=r.data.public_number;status=r.data.status;return true;}
    catch(e){statusLine(e.status===409?"Черновик изменён в другом окне. Обновите страницу и продолжите с актуальной версией.":e.status===401?"Персональная ссылка истекла или недействительна. Свяжитесь с МАЛАРС, указав только номер анкеты.":"Не удалось сохранить изменения. Проверьте связь и повторите.",true);return false;}finally{busy=false;}
  }
  function specializationIssue() {
    return !(data.competencies||[]).length?'Выберите хотя бы одну специализацию в выбранных подсистемах.':window.MalarsSpecializations?.validate(intakeId) || (!(data.executionMethods||[]).length?'Укажите, как выполняете работы.':!(data.scopes||[]).length?'Выберите масштаб работ.':'');
  }
  function markReviewErrors() {
    const issue=specializationIssue();
    const edit=host.querySelector('[data-edit="1"]');
    if(issue && edit) {
      const card=edit.closest('.intake-review > div');card.classList.add('field-error');
      const note=document.createElement('p');note.className='field-error-text';note.textContent=issue;card.append(note);
      edit.textContent='Исправить раздел «Специализации»';edit.classList.add('review-error-button');
    }
  }
  function renderReview(){
    scrollToFormStart();
    host.innerHTML=`<p class="eyebrow">Проверка перед отправкой</p><h2>Проверьте данные</h2><p>Заполнено ${Object.keys(data).filter(k=>data[k]!==""&&data[k]!=null).length} полей. Можно вернуться в любой раздел и исправить ответы.</p><div class="intake-review">${sections.map(([title,allFields],i)=>{const fields=visibleFields(i,allFields);return `<div><strong>${i+1}. ${esc(title)}</strong><p>${fields.map(f=>`${esc(f[1])}: ${esc(Array.isArray(data[f[0]])?data[f[0]].map(value=>f[0]==="competencies" && window.MalarsSpecializationCatalog ? window.MalarsSpecializationCatalog.displayValue(value,window.MALARS_TEST_DATA?.WORKS || []) : value).join(", "):data[f[0]]||"—")}`).join(" · ")}</p><button class="button button-secondary" data-edit="${i}">Изменить раздел</button></div>`}).join("")}</div><label class="consent intake-consent"><input data-final-consent type="checkbox"><span>${esc(consentText)} Версия ${CONSENT}. <a href="legal/participant-consent.html" target="_blank" rel="noopener">Текст TEST-согласия</a></span></label><button class="button" data-action="submit">Отправить анкету на рассмотрение</button><p data-message role="status" aria-live="polite"></p>`;
    appendSpecializationNotice();
    markReviewErrors();
    host.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{section=Number(b.dataset.edit);renderSection();if(section===1 && specializationIssue()){const message=specializationIssue();statusLine(message,true);host.querySelector('[data-specializations]')?.dispatchEvent(new CustomEvent('spec:invalid',{detail:{message}}));}});
    host.querySelector('[data-action="submit"]').onclick=submit;
  }
  async function submit(){
    if(!host.querySelector("[data-final-consent]").checked){statusLine("Подтвердите согласие для тестовой отправки.",true);return;}
    if(specializationIssue()){statusLine('Исправьте раздел 2 «Специализации». '+specializationIssue(),true);host.querySelector('[data-edit="1"]')?.closest('.intake-review > div')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    if(!validateRequired())return;
    if(busy)return;busy=true;
    try {const r=await send(draftPath()+"/submit","POST",{answers:{...data,consent:true,consentVersion:CONSENT}},{...tokenHeaders()});revision=r.data.revision;number=r.data.public_number;status=r.data.status;data=r.data.answers;renderMessage(r.httpStatus===201?"submitted":"updated");}
    catch(e){statusLine(e.status===409?"Ответы изменены в другом окне. Перезагрузите страницу для защиты от потери данных.":"Не удалось отправить анкету. Данные сохранены в черновике — повторите попытку.",true);}finally{busy=false;}
  }
  host.addEventListener("click",async event=>{
    const button=event.target.closest("[data-action]");if(!button)return;
    if(button.dataset.action==="continue" && host.querySelector("#baseCitySearch")){
      if(!validateStart())return;
      button.disabled=true;
      try {
        if(intakeId){if(await saveAnswers()){section=0;renderSection();}return;}
        const creationKey=sessionStorage.getItem("malars-intake-create-id")||crypto.randomUUID();
        let creationToken=sessionStorage.getItem(`malars-intake-create-token:${creationKey}`);
        if(!creationToken){const raw=crypto.getRandomValues(new Uint8Array(32));creationToken=btoa(String.fromCharCode(...raw)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");sessionStorage.setItem("malars-intake-create-id",creationKey);sessionStorage.setItem(`malars-intake-create-token:${creationKey}`,creationToken);}
        const r=await send("/api/participant-drafts","POST",{answers:{...data,consentVersion:CONSENT}},{"Idempotency-Key":creationKey,"X-Participant-Token":creationToken});
        data=r.data.answers;intakeId=r.data.intake_id;number=r.data.public_number;revision=r.data.revision;status=r.data.status;token=creationToken;
        sessionStorage.setItem(`malars-intake:${intakeId}`,token);sessionStorage.removeItem("malars-intake-create-id");sessionStorage.removeItem(`malars-intake-create-token:${creationKey}`);
        history.replaceState(null,"",`${location.pathname}#intake=${encodeURIComponent(intakeId)}&token=${encodeURIComponent(token)}`);
        section=0;renderSection();
      } catch(e){statusLine(e.status===413?"Анкета слишком большая.":"Не удалось перейти дальше. Попробуйте ещё раз.",true);} finally{button.disabled=false;}
    }
  });
  async function resumeFromLink(){
    const params=new URLSearchParams(location.hash.slice(1));intakeId=params.get("intake")||"";token=params.get("token")||sessionStorage.getItem(`malars-intake:${intakeId}`)||"";
    if(!intakeId||!token){renderStart();return;}
    try{const r=await send(draftPath(),"GET",null,{"X-Participant-Token":token});data=r.data.answers;number=r.data.public_number;revision=r.data.revision;status=r.data.status;sessionStorage.setItem(`malars-intake:${intakeId}`,token);history.replaceState(null,"",location.pathname);renderMessage(status==="draft"?"saved":"updated");}
    catch(e){history.replaceState(null,"",location.pathname);renderStart();statusLine(e.status===401?"Ссылка истекла или недействительна. Восстановление по номеру не выполняется; свяжитесь с МАЛАРС.":"Анкета по ссылке не найдена. Проверьте ссылку.",true);}
  }
  document.addEventListener("malars:core-ready",()=>{if(window.MALARS_TEST_DATA)resumeFromLink();},{once:true});
  renderStart();
  if(window.MALARS_TEST_DATA)resumeFromLink();
})();




