(() => {
  const API = window.MALARS_TEST_CONFIG?.apiBaseUrl;
  const CONSENT = "CONSENT-PARTICIPANT-PD-1.0";
  const consentText = "Согласен(на) на обработку данных для предварительного рассмотрения анкеты в тестовом контуре МАЛАРС. Использую только вымышленные данные.";
  let data = {};
  let intakeId = "";
  let token = "";
  let number = "";
  let revision = 0;
  let status = "";
  let busy = false;
  let section = 0;
  const sections = [
    ["Идентификация и контакты", [
      ["legalForm", "Юридическая форма", "select", ["ПАО", "АО", "ООО", "ИП", "Самозанятый", "Физлицо"]],
      ["companyName", "Полное название компании или ФИО", "text"], ["inn", "ИНН (10 цифр для компании, 12 для ИП/самозанятого)", "text"],
      ["contactName", "Контактное лицо", "text"], ["email", "Email", "email"], ["phone", "Контактный телефон (можно изменить)", "tel"],
      ["contactChannel", "Предпочитаемый способ связи", "select", ["Звонок", "Telegram", "WhatsApp", "Email"]],
    ]],
    ["Специализации", [["competencies", "Виды работ (можно выбрать несколько)", "works"], ["otherWorks", "Другие работы", "text"], ["executionMethods", "Как выполняете работы?", "checks", ["Собственными силами", "Своими силами и с партнёрами", "Через субподряд"]], ["supply", "Также можем поставлять материалы или оборудование", "check"]]],
    ["Этапы и пакеты работ", [["stages", "Какие этапы берёте?", "checks", ["Обследование", "Проектирование", "Комплектация и поставка", "Изготовление и сборка", "Работы на объекте: строительство, монтаж, демонтаж, отделка", "Программирование и интеграция", "ПНР и испытания", "Сервис и ремонт"]], ["scopes", "Масштаб работ", "checks", ["Отдельная работа", "Несколько связанных работ", "Отдельная система или раздел под ключ"]], ["turnkeyDetails", "Что именно можете закрыть и с чьим участием? Пример", "textarea"]]],
    ["Типы объектов и география", [["objectExperience", "Есть опыт на объектах", "objects"], ["objectReady", "Готовы выполнять работы на объектах", "objects"], ["baseRegionCode", "Регион базирования", "regions-select"], ["geographyMode", "География работы", "select", ["Город и рядом", "Регион", "Выбранные регионы", "Вся Россия"]], ["regions", "Выберите регионы", "regions"], ["travel", "Командировки", "select", ["Да", "По согласованию", "Нет"]], ["remote", "Дистанционная работа", "select", ["Да", "Нет", "Зависит от задачи"]], ["limits", "Ограничения по географии или объектам", "text"]]],
    ["Команда и ресурсы", [["teamSize", "Основная команда", "select", ["1 человек", "2–5", "6–15", "16–30", "31–50", "51–100", "100+"]], ["crewCount", "Количество бригад", "number"], ["teamLeads", "Руководители бригад", "number"], ["canExpand", "Возможность усиления", "select", ["Своя команда", "Партнёры", "Нет"]], ["parallelProjects", "Одновременные объекты", "number"], ["availability", "Доступность", "select", ["Сейчас", "Через 2–4 недели", "По согласованию", "Пока заняты"]], ["resources", "Ресурсы", "checks", ["Инструмент", "Измерительные приборы", "Транспорт", "Спецтехника", "Мастерская", "Своё оборудование", "Аренда оборудования"]], ["comment", "Комментарий о команде и ресурсах", "textarea"]]],
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
  const statusLine = (m, bad = false) => { const x = host.querySelector("[data-message]"); if (x) { x.textContent = m; x.dataset.error = bad ? "true" : "false"; } };
  const send = async (path, method, body, headers = {}) => {
    const res = await fetch(API + path, {method, cache:"no-store", headers:{"Content-Type":"application/json", ...headers}, body:body == null ? undefined : JSON.stringify(body)});
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(json.error || `HTTP ${res.status}`); e.status = res.status; throw e; }
    json.httpStatus = res.status;
    return json;
  };
  const tokenHeaders = () => ({"X-Participant-Token": token, "X-Intake-Revision": String(revision)});
  const draftPath = () => `/api/participant-drafts/${encodeURIComponent(intakeId)}`;
  const renderStart = () => {
    const formats = ["Самостоятельно", "В составе бригады", "От имени компании"];
    const cats = [...new Set((window.MALARS_TEST_DATA?.WORKS || []).map(x => x[1]))];
    host.innerHTML = `<div class="participant-intake-head"><p class="eyebrow">Анкета подрядчика · уровень 1 из 2</p><h2>Коротко познакомимся</h2><p>Это займёт около 1–2 минут. Черновик сохранится в TEST.</p></div>
      <div class="intake-grid"><label>Как к вам обращаться?<input data-key="displayName" autocomplete="organization" value="${esc(data.displayName)}" required></label>
      <fieldset><legend>Формат работы</legend>${formats.map(v=>choice("workFormat",v)).join("")}</fieldset>
      <fieldset><legend>Основные направления работ</legend><div class="intake-checks">${cats.map(v=>choice("mainCategories",v,"checkbox")).join("")}</div><label>Другое<input data-key="otherWorks" value="${esc(data.otherWorks)}"></label></fieldset>
      <label>Город базирования<input data-key="baseCity" autocomplete="address-level2" value="${esc(data.baseCity)}" required></label>
      <label>Контактный телефон<input data-key="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 900 000-00-00" value="${esc(data.phone)}" required></label>
      <label class="consent intake-consent"><input data-key="consent" type="checkbox" ${data.consent ? "checked" : ""}><span>${esc(consentText)} Версия ${CONSENT}. <a href="legal/participant-consent.html" target="_blank" rel="noopener">Текст TEST-согласия</a></span></label></div>
      <div class="intake-actions"><button class="button" data-action="save">Сохранить на потом</button><button class="button button-secondary" data-action="continue">Продолжить анкету</button></div><p data-message role="status" aria-live="polite"></p>`;
    bindInputs();
  };
  function choice(key, val, type="radio") { return `<label class="intake-choice"><input type="${type}" name="${key}" value="${esc(val)}" ${type === "radio" && data[key]===val || type === "checkbox" && (data[key]||[]).includes(val) ? "checked" : ""}><span>${esc(val)}</span></label>`; }
  const bindInputs = () => host.querySelectorAll("[data-key],input[name]").forEach(el => el.addEventListener("input", capture));
  host.addEventListener("blur", event => { if(event.target?.dataset?.key === "phone") { const d=event.target.value.replace(/\D/g,""); if(d.length===11&&d[0]==="7") event.target.value=`+7 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7,9)}-${d.slice(9,11)}`; else if(d.length===10&&d[0]==="9") event.target.value=`+7 (${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6,8)}-${d.slice(8,10)}`; capture(); } }, true);
  function capture() {
    host.querySelectorAll("[data-key]").forEach(el => { const k=el.dataset.key; data[k]=el.type==="checkbox"?el.checked:el.value; });
    host.querySelectorAll('input[name][type="radio"], input[name][type="checkbox"]').forEach(el => {
      const k=el.name; if(el.type==="radio") { if(el.checked) data[k]=el.value; }
      else { data[k]=[...host.querySelectorAll(`input[name="${CSS.escape(k)}"]:checked`)].map(x=>x.value); }
    });
  }
  function renderMessage(kind) {
    const link = `${location.origin}${location.pathname}#intake=${encodeURIComponent(intakeId)}&token=${encodeURIComponent(token)}`;
    host.innerHTML = `<h2>${kind === "saved" ? `Черновик № ${esc(number)} сохранён` : kind === "submitted" ? `Анкета № ${esc(number)} получена` : `Анкета № ${esc(number)} обновлена`}</h2>
      <p>${kind === "saved" ? "Продолжите сейчас или вернитесь позже по персональной ссылке. Ссылка даёт доступ к анкете — не передавайте её другим. Она действует 30 дней." : "Спасибо! МАЛАРС предварительно изучит профиль и при подходящем опыте свяжется для знакомства. Отправка не означает автоматического принятия в сеть и не гарантирует заказов."}</p>
      <p>Номер — только идентификатор, он не открывает анкету. Ревизия ${revision}; обновлено ${new Date().toLocaleString("ru-RU")}.</p>
      <div class="intake-actions">${kind === "saved" ? '<button class="button" data-action="continue">Продолжить сейчас</button>' : '<button class="button" data-action="edit">Изменить анкету</button>'}<button class="button button-secondary" data-action="copy-link">Скопировать ссылку</button><button class="button button-secondary" data-action="copy-number">Скопировать номер</button></div><p data-message role="status" aria-live="polite"></p>`;
    host.querySelector('[data-action="continue"]')?.addEventListener("click", () => {section=0;renderSection();});
    host.querySelector('[data-action="edit"]')?.addEventListener("click", () => {section=0;renderSection();});
    host.querySelector('[data-action="copy-link"]')?.addEventListener("click", async()=>{await navigator.clipboard.writeText(`${location.origin}${location.pathname}#intake=${encodeURIComponent(intakeId)}&token=${encodeURIComponent(token)}`);statusLine("Персональная ссылка скопирована.");});
    host.querySelector('[data-action="copy-number"]')?.addEventListener("click", async()=>{await navigator.clipboard.writeText(number);statusLine("Номер скопирован.");});
  }
  function field([key,label,type,opts]) {
    if(type==="works") return `<fieldset><legend>${esc(label)}</legend><div class="intake-checks">${(window.MALARS_TEST_DATA?.WORKS||[]).map(x=>choice("competencies",x[2]+" — "+x[3],"checkbox")).join("")}</div></fieldset>`;
    if(type==="objects") return `<fieldset><legend>${esc(label)}</legend><div class="intake-checks">${(window.MALARS_TEST_DATA?.OBJECT_TYPES||[]).map(x=>choice(key,x[1],"checkbox")).join("")}</div></fieldset>`;
    if(type==="regions") return `<fieldset><legend>${esc(label)}</legend><div class="intake-checks">${(window.MALARS_TEST_DATA?.REGIONS||[]).filter(x=>x[0]!=="RU-ALL").map(x=>choice(key,x[0],"checkbox")).join("")}</div></fieldset>`;
    if(type==="regions-select") return `<label>${esc(label)}<select data-key="${key}"><option value="">Выберите регион</option>${(window.MALARS_TEST_DATA?.REGIONS||[]).filter(x=>x[0]!=="RU-ALL").map(x=>`<option value="${esc(x[0])}" ${data[key]===x[0]?"selected":""}>${esc(x[1])}</option>`).join("")}</select></label>`;
    if(type==="checks") return `<fieldset><legend>${esc(label)}</legend><div class="intake-checks">${opts.map(x=>choice(key,x,"checkbox")).join("")}</div></fieldset>`;
    if(type==="select") return `<label>${esc(label)}<select data-key="${key}"><option value="">Выберите</option>${opts.map(x=>`<option ${data[key]===x?"selected":""}>${esc(x)}</option>`).join("")}</select></label>`;
    if(type==="check") return `<label class="intake-choice"><input data-key="${key}" type="checkbox" ${data[key]?"checked":""}><span>${esc(label)}</span></label>`;
    const tag=type==="textarea"?"textarea":"input";return `<label>${esc(label)}<${tag} data-key="${key}" ${tag==="input"?`type="${type}" value="${esc(data[key])}" ${type==="number"?'min="0" max="1000" step="1"':''}`:""}>${tag==="textarea"?esc(data[key]):""}</${tag}></label>`;
  }
  function renderSection() {
    if(section===0){if(!data.contactName)data.contactName=data.displayName||"";if(["ООО","АО","ПАО","ИП"].includes(data.legalForm)&&!data.companyName)data.companyName=data.displayName||"";}
    const [title,allFields]=sections[section];
    const fields = visibleFields(section, allFields);
    host.innerHTML=`<p class="eyebrow">Уровень 2 из 2 · раздел ${section+1} из 7</p><div class="intake-progress" aria-label="Прогресс анкеты"><span style="width:${Math.round((section+1)/7*100)}%"></span></div><h2>${esc(title)}</h2><div class="intake-grid">${fields.map(field).join("")}</div><div class="intake-actions"><button class="button button-secondary" data-action="back">Назад</button><button class="button" data-action="next">${section===6?"Проверить данные":"Сохранить и продолжить"}</button></div><p data-message role="status" aria-live="polite"></p>`;
    bindInputs();
    host.querySelector('[data-action="back"]').onclick=()=>{capture();section=Math.max(0,section-1);renderSection();};
    host.querySelector('[data-action="next"]').onclick=async()=>{capture();if(section===0&&!validateRequired())return;if(!await saveAnswers())return;if(section===6)renderReview();else{section++;renderSection();}};
  }
  function visibleFields(index, fields) {
    return index===4 && data.workFormat === "Самостоятельно"
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
    else if(needsInn&&inn.length!==(["ООО","АО","ПАО"].includes(legal)?10:12))error=`Для выбранной формы нужен ИНН из ${["ООО","АО","ПАО"].includes(legal)?10:12} цифр.`;
    else if(section===6&&!(data.competencies||[]).length)error="Выберите хотя бы одну специализацию.";
    else if(section===6&&!(data.objectExperience||[]).length&&!(data.objectReady||[]).length)error="Укажите опыт или готовность по типам объектов.";
    if(error){statusLine(error,true);const bad=[...form].find(x=>!x.value&&x.type!=="checkbox");bad?.focus();return false;}return true;
  }
  async function saveAnswers() {
    if(busy)return false;busy=true;
    try {const r=await send(draftPath(),"PUT",{answers:data},tokenHeaders());revision=r.data.revision;number=r.data.public_number;status=r.data.status;return true;}
    catch(e){statusLine(e.status===409?"Черновик изменён в другом окне. Обновите страницу и продолжите с актуальной версией.":e.status===401?"Персональная ссылка истекла или недействительна. Свяжитесь с МАЛАРС, указав только номер анкеты.":"Не удалось сохранить изменения. Проверьте связь и повторите.",true);return false;}finally{busy=false;}
  }
  function renderReview(){
    host.innerHTML=`<p class="eyebrow">Проверка перед отправкой</p><h2>Проверьте данные</h2><p>Заполнено ${Object.keys(data).filter(k=>data[k]!==""&&data[k]!=null).length} полей. Можно вернуться в любой раздел и исправить ответы.</p><div class="intake-review">${sections.map(([title,allFields],i)=>{const fields=visibleFields(i,allFields);return `<div><strong>${i+1}. ${esc(title)}</strong><p>${fields.map(f=>`${esc(f[1])}: ${esc(Array.isArray(data[f[0]])?data[f[0]].join(", "):data[f[0]]||"—")}`).join(" · ")}</p><button class="button button-secondary" data-edit="${i}">Изменить раздел</button></div>`}).join("")}</div><label class="consent intake-consent"><input data-final-consent type="checkbox"><span>${esc(consentText)} Версия ${CONSENT}. <a href="legal/participant-consent.html" target="_blank" rel="noopener">Текст TEST-согласия</a></span></label><button class="button" data-action="submit">Отправить анкету на рассмотрение</button><p data-message role="status" aria-live="polite"></p>`;
    host.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{section=Number(b.dataset.edit);renderSection();});
    host.querySelector('[data-action="submit"]').onclick=submit;
  }
  async function submit(){
    if(!host.querySelector("[data-final-consent]").checked){statusLine("Подтвердите согласие для тестовой отправки.",true);return;}
    if(!validateRequired())return;
    if(busy)return;busy=true;
    try {const r=await send(draftPath()+"/submit","POST",{answers:{...data,consent:true,consentVersion:CONSENT}},{...tokenHeaders()});revision=r.data.revision;number=r.data.public_number;status=r.data.status;data=r.data.answers;renderMessage(r.httpStatus===201?"submitted":"updated");}
    catch(e){statusLine(e.status===409?"Ответы изменены в другом окне. Перезагрузите страницу для защиты от потери данных.":"Не удалось отправить анкету. Данные сохранены в черновике — повторите попытку.",true);}finally{busy=false;}
  }
  host.addEventListener("click",async event=>{
    const button=event.target.closest("[data-action]");if(!button)return;
    if(button.dataset.action==="save"||button.dataset.action==="continue"){
      if(intakeId&&button.dataset.action==="continue"){section=0;renderSection();return;}
      capture();if(!data.consent){statusLine("Подтвердите согласие для сохранения контактных данных в TEST.",true);return;}
      if(!data.displayName||!data.workFormat||!(data.mainCategories||[]).length||!data.baseCity||!data.phone){statusLine("Заполните пять коротких пунктов и согласие — так мы сможем сохранить ваш черновик.",true);return;}
      button.disabled=true;try{const creationKey=sessionStorage.getItem("malars-intake-create-id")||crypto.randomUUID();let creationToken=sessionStorage.getItem(`malars-intake-create-token:${creationKey}`);if(!creationToken){const raw=crypto.getRandomValues(new Uint8Array(32));creationToken=btoa(String.fromCharCode(...raw)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");sessionStorage.setItem("malars-intake-create-id",creationKey);sessionStorage.setItem(`malars-intake-create-token:${creationKey}`,creationToken);}const r=await send("/api/participant-drafts","POST",{answers:{...data,consentVersion:CONSENT}},{"Idempotency-Key":creationKey,"X-Participant-Token":creationToken});data=r.data.answers;intakeId=r.data.intake_id;number=r.data.public_number;revision=r.data.revision;status=r.data.status;token=creationToken;sessionStorage.setItem(`malars-intake:${intakeId}`,token);sessionStorage.removeItem("malars-intake-create-id");sessionStorage.removeItem(`malars-intake-create-token:${creationKey}`);history.replaceState(null,"",`${location.pathname}#intake=${encodeURIComponent(intakeId)}&token=${encodeURIComponent(token)}`);renderMessage("saved");if(button.dataset.action==="continue"){section=0;renderSection();}}
      catch(e){statusLine(e.status===413?"Черновик слишком большой.":"Не удалось сохранить на сервере. Проверьте связь и попробуйте снова.",true);}finally{button.disabled=false;}
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

