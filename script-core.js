const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz3ycpkm_msGzEVbpQkdaedUGwaAjzkA4_Xbuj8X4MCaKyuqXFtPY1Yuq4M2zLF9yIb/exec";

const WORKS = [
  ["CON","Общестроительные работы","CON-01","Демонтажные работы"],
  ["CON","Общестроительные работы","CON-02","Фундаменты"],
  ["CON","Общестроительные работы","CON-03","Монолитные железобетонные работы"],
  ["CON","Общестроительные работы","CON-04","Кладка стен и перегородок"],
  ["CON","Общестроительные работы","CON-05","Стяжки и устройство полов"],
  ["CON","Общестроительные работы","CON-06","Гидроизоляционные работы"],
  ["FIN","Отделочные работы","FIN-01","Штукатурные работы"],
  ["FIN","Отделочные работы","FIN-02","Шпатлёвка и подготовка поверхностей"],
  ["FIN","Отделочные работы","FIN-03","Малярные работы"],
  ["FIN","Отделочные работы","FIN-04","Плиточные работы"],
  ["FIN","Отделочные работы","FIN-05","Напольные покрытия"],
  ["FIN","Отделочные работы","FIN-06","ГКЛ, перегородки и облицовки"],
  ["FIN","Отделочные работы","FIN-07","Подвесные и натяжные потолки"],
  ["FIN","Отделочные работы","FIN-08","Двери и столярные изделия"],
  ["ELE","Электромонтажные работы","ELE-01","ВРУ, ГРЩ и распределительные щиты"],
  ["ELE","Электромонтажные работы","ELE-02","Кабельные трассы и прокладка кабеля"],
  ["ELE","Электромонтажные работы","ELE-03","Силовое электрооборудование"],
  ["ELE","Электромонтажные работы","ELE-04","Освещение"],
  ["ELE","Электромонтажные работы","ELE-05","Розеточные и силовые группы"],
  ["ELE","Электромонтажные работы","ELE-06","Заземление и молниезащита"],
  ["ELE","Электромонтажные работы","ELE-07","Пусконаладочные работы ЭОМ"],
  ["LOW","Слаботочные системы","LOW-01","СКС и локальные сети"],
  ["LOW","Слаботочные системы","LOW-02","Видеонаблюдение"],
  ["LOW","Слаботочные системы","LOW-03","СКУД"],
  ["LOW","Слаботочные системы","LOW-04","Домофония"],
  ["LOW","Слаботочные системы","LOW-05","Охранная сигнализация"],
  ["LOW","Слаботочные системы","LOW-06","Системы связи, оповещения и часофикации"],
  ["HVAC","Вентиляция и кондиционирование","HVAC-01","Общеобменная вентиляция"],
  ["HVAC","Вентиляция и кондиционирование","HVAC-02","Кондиционирование"],
  ["HVAC","Вентиляция и кондиционирование","HVAC-03","Противодымная вентиляция"],
  ["HVAC","Вентиляция и кондиционирование","HVAC-04","Изготовление и монтаж воздуховодов"],
  ["HVAC","Вентиляция и кондиционирование","HVAC-05","Балансировка и пусконаладка ОВиК"],
  ["WAT","Водоснабжение и канализация","WAT-01","Внутреннее водоснабжение"],
  ["WAT","Водоснабжение и канализация","WAT-02","Внутренняя канализация"],
  ["WAT","Водоснабжение и канализация","WAT-03","Сантехнические приборы"],
  ["WAT","Водоснабжение и канализация","WAT-04","Насосные установки"],
  ["HEAT","Отопление и теплоснабжение","HEAT-01","Системы отопления"],
  ["HEAT","Отопление и теплоснабжение","HEAT-02","Тепловые пункты и ИТП"],
  ["HEAT","Отопление и теплоснабжение","HEAT-03","Котельные"],
  ["FIRE","Пожарная безопасность","FIRE-01","Пожарная сигнализация"],
  ["FIRE","Пожарная безопасность","FIRE-02","СОУЭ"],
  ["FIRE","Пожарная безопасность","FIRE-03","Автоматическое пожаротушение"],
  ["FIRE","Пожарная безопасность","FIRE-04","Внутренний противопожарный водопровод"],
  ["FIRE","Пожарная безопасность","FIRE-05","Огнезащита конструкций"],
  ["EXT","Наружные инженерные сети","EXT-01","Наружное электроснабжение"],
  ["EXT","Наружные инженерные сети","EXT-02","Наружное водоснабжение"],
  ["EXT","Наружные инженерные сети","EXT-03","Наружная канализация"],
  ["EXT","Наружные инженерные сети","EXT-04","Ливневая канализация"],
  ["EXT","Наружные инженерные сети","EXT-05","Наружные тепловые сети"],
  ["EXT","Наружные инженерные сети","EXT-06","Наружные слаботочные сети"],
  ["MET","Металлоконструкции","MET-01","Изготовление металлоконструкций"],
  ["MET","Металлоконструкции","MET-02","Монтаж металлоконструкций"],
  ["MET","Металлоконструкции","MET-03","Сварочные работы"],
  ["MET","Металлоконструкции","MET-04","Лестницы, ограждения и площадки"],
  ["FAC","Фасады и кровля","FAC-01","Вентилируемые фасады"],
  ["FAC","Фасады и кровля","FAC-02","Мокрые фасады"],
  ["FAC","Фасады и кровля","FAC-03","Фасадное остекление"],
  ["FAC","Фасады и кровля","FAC-04","Мягкая кровля"],
  ["FAC","Фасады и кровля","FAC-05","Скатная кровля"],
  ["FAC","Фасады и кровля","FAC-06","Водосточные системы"],
  ["SITE","Земляные работы и благоустройство","SITE-01","Земляные работы"],
  ["SITE","Земляные работы и благоустройство","SITE-02","Брусчатка и мощение"],
  ["SITE","Земляные работы и благоустройство","SITE-03","Асфальтирование"],
  ["SITE","Земляные работы и благоустройство","SITE-04","Озеленение"],
  ["SITE","Земляные работы и благоустройство","SITE-05","Ограждения и ворота"],
  ["SPEC","Специализированные работы","SPEC-01","Монтаж технологического оборудования"],
  ["SPEC","Специализированные работы","SPEC-02","Автоматизация и диспетчеризация"],
  ["SPEC","Специализированные работы","SPEC-03","Пусконаладочные работы"],
  ["SPEC","Специализированные работы","SPEC-04","Алмазное бурение и резка"],
  ["SPEC","Специализированные работы","SPEC-05","Промышленный альпинизм"]
];

const OBJECT_TYPES = [
  ["OBJ-01","Частные дома и коттеджи"],
  ["OBJ-02","Квартиры"],
  ["OBJ-03","Офисы"],
  ["OBJ-04","Торговые помещения и магазины"],
  ["OBJ-05","Рестораны, кафе, гостиницы"],
  ["OBJ-06","Склады и логистические комплексы"],
  ["OBJ-07","Производственные и промышленные объекты"],
  ["OBJ-08","Многоквартирные дома"],
  ["OBJ-09","Бизнес-центры"],
  ["OBJ-10","Образовательные и социальные объекты"],
  ["OBJ-11","Медицинские объекты"],
  ["OBJ-12","Государственные и общественные здания"],
  ["OBJ-13","Инфраструктурные объекты"],
  ["OBJ-14","ЦОД, серверные и технические помещения"]
];

const REGIONS = [
  ["REG-001","Республика Адыгея"],["REG-002","Республика Алтай"],["REG-003","Республика Башкортостан"],
  ["REG-004","Республика Бурятия"],["REG-005","Республика Дагестан"],["REG-006","Республика Ингушетия"],
  ["REG-007","Кабардино-Балкарская Республика"],["REG-008","Республика Калмыкия"],["REG-009","Карачаево-Черкесская Республика"],
  ["REG-010","Республика Карелия"],["REG-011","Республика Коми"],["REG-012","Республика Марий Эл"],
  ["REG-013","Республика Мордовия"],["REG-014","Республика Саха (Якутия)"],["REG-015","Республика Северная Осетия — Алания"],
  ["REG-016","Республика Татарстан"],["REG-017","Республика Тыва"],["REG-018","Удмуртская Республика"],
  ["REG-019","Республика Хакасия"],["REG-020","Чеченская Республика"],["REG-021","Чувашская Республика"],
  ["REG-022","Алтайский край"],["REG-023","Забайкальский край"],["REG-024","Камчатский край"],
  ["REG-025","Краснодарский край"],["REG-026","Красноярский край"],["REG-027","Пермский край"],
  ["REG-028","Приморский край"],["REG-029","Ставропольский край"],["REG-030","Хабаровский край"],
  ["REG-031","Амурская область"],["REG-032","Архангельская область"],["REG-033","Астраханская область"],
  ["REG-034","Белгородская область"],["REG-035","Брянская область"],["REG-036","Владимирская область"],
  ["REG-037","Волгоградская область"],["REG-038","Вологодская область"],["REG-039","Воронежская область"],
  ["REG-040","Ивановская область"],["REG-041","Иркутская область"],["REG-042","Калининградская область"],
  ["REG-043","Калужская область"],["REG-044","Кемеровская область — Кузбасс"],["REG-045","Кировская область"],
  ["REG-046","Костромская область"],["REG-047","Курганская область"],["REG-048","Курская область"],
  ["REG-049","Ленинградская область"],["REG-050","Липецкая область"],["REG-051","Магаданская область"],
  ["REG-052","Московская область"],["REG-053","Мурманская область"],["REG-054","Нижегородская область"],
  ["REG-055","Новгородская область"],["REG-056","Новосибирская область"],["REG-057","Омская область"],
  ["REG-058","Оренбургская область"],["REG-059","Орловская область"],["REG-060","Пензенская область"],
  ["REG-061","Псковская область"],["REG-062","Ростовская область"],["REG-063","Рязанская область"],
  ["REG-064","Самарская область"],["REG-065","Саратовская область"],["REG-066","Сахалинская область"],
  ["REG-067","Свердловская область"],["REG-068","Смоленская область"],["REG-069","Тамбовская область"],
  ["REG-070","Тверская область"],["REG-071","Томская область"],["REG-072","Тульская область"],
  ["REG-073","Тюменская область"],["REG-074","Ульяновская область"],["REG-075","Челябинская область"],
  ["REG-076","Ярославская область"],["REG-077","Москва"],["REG-078","Санкт-Петербург"],
  ["REG-079","Еврейская автономная область"],["REG-080","Ненецкий автономный округ"],
  ["REG-081","Ханты-Мансийский автономный округ — Югра"],["REG-082","Чукотский автономный округ"],
  ["REG-083","Ямало-Ненецкий автономный округ"],["REG-084","Республика Крым"],["REG-085","Севастополь"],
  ["REG-086","Донецкая Народная Республика"],["REG-087","Луганская Народная Республика"],
  ["REG-088","Запорожская область"],["REG-089","Херсонская область"]
];

document.getElementById("year").textContent = new Date().getFullYear();

document.querySelectorAll('form[data-form-type="client"], form[data-form-type="partner"]').forEach((form) => {
  form.addEventListener("submit", submitLegacyForm);
});

async function submitLegacyForm(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const status = form.querySelector(".form-status");
  const button = form.querySelector(".form-submit");
  const data = Object.fromEntries(new FormData(form).entries());

  data.formType = form.dataset.formType;
  data.page = window.location.href;
  data.submittedAt = new Date().toISOString();

  setBusy(button, true, data.formType === "client" ? "Отправляем…" : "Отправляем…");
  status.textContent = "";

  try {
    const result = await postJson(data);
    if (!result.ok) throw new Error(result.error || "Ошибка отправки");
    form.reset();
    status.textContent = "Готово. Данные отправлены.";
  } catch (error) {
    console.error(error);
    status.textContent = "Не удалось отправить данные. Попробуйте ещё раз.";
  } finally {
    setBusy(button, false, data.formType === "client" ? "Отправить задачу" : "Отправить данные");
  }
}

const partnerV2 = document.getElementById("partnerFormV2");

if (partnerV2) {
  initPartnerV2();
}

function initPartnerV2() {
  renderWorkCategories();
  renderObjectTypes();
  renderRegions();
  initWizard();
  initPartnerConditions();

  partnerV2.addEventListener("submit", submitPartnerV2);

  const regionSearch = document.getElementById("regionSearch");
  if (regionSearch) {
    regionSearch.addEventListener("input", filterRegions);
  }
}

function renderWorkCategories() {
  const categories = new Map();

  WORKS.forEach(([categoryCode, categoryName, workCode, workName]) => {
    if (!categories.has(categoryCode)) {
      categories.set(categoryCode, { name: categoryName, works: [] });
    }
    categories.get(categoryCode).works.push({ workCode, workName });
  });

  const categoryBox = document.getElementById("workCategories");
  const workBox = document.getElementById("workDetails");
  if (!categoryBox || !workBox) return;

  categoryBox.innerHTML = [...categories.entries()].map(([code, item]) => `
    <label class="choice-chip category-chip">
      <input type="checkbox" class="category-checkbox" value="${escapeHtml(code)}">
      <span>${escapeHtml(item.name)}</span>
    </label>
  `).join("");

  categoryBox.querySelectorAll(".category-checkbox").forEach((input) => {
    input.addEventListener("change", () => {
      const selected = [...categoryBox.querySelectorAll(".category-checkbox:checked")].map(el => el.value);
      workBox.innerHTML = selected.map(code => {
        const item = categories.get(code);
        return `
          <div class="work-group" data-category="${escapeHtml(code)}">
            <div class="work-group-title">
              <strong>${escapeHtml(item.name)}</strong>
              <button type="button" class="text-button select-all-works">Выбрать всё</button>
            </div>
            <div class="choice-grid">
              ${item.works.map(work => `
                <label class="choice-card compact">
                  <input type="checkbox" class="work-checkbox" value="${escapeHtml(work.workCode)}">
                  <span>${escapeHtml(work.workName)}</span>
                </label>
              `).join("")}
            </div>
          </div>
        `;
      }).join("");

      workBox.querySelectorAll(".select-all-works").forEach((button) => {
        button.addEventListener("click", () => {
          const group = button.closest(".work-group");
          const boxes = [...group.querySelectorAll(".work-checkbox")];
          const allChecked = boxes.every(box => box.checked);
          boxes.forEach(box => box.checked = !allChecked);
          button.textContent = allChecked ? "Выбрать всё" : "Снять всё";
        });
      });
    });
  });
}

function renderObjectTypes() {
  const box = document.getElementById("objectTypes");
  if (!box) return;

  box.innerHTML = OBJECT_TYPES.map(([code, name]) => `
    <label class="choice-card compact">
      <input type="checkbox" class="object-checkbox" value="${escapeHtml(code)}">
      <span>${escapeHtml(name)}</span>
    </label>
  `).join("");
}

function renderRegions() {
  const baseSelect = document.getElementById("baseRegion");
  const extraBox = document.getElementById("extraRegions");
  if (!baseSelect || !extraBox) return;

  baseSelect.innerHTML = `<option value="">Выберите регион</option>` +
    REGIONS.map(([code, name]) => `<option value="${escapeHtml(code)}">${escapeHtml(name)}</option>`).join("");

  extraBox.innerHTML = REGIONS.map(([code, name]) => `
    <label class="choice-card compact region-option" data-search="${escapeHtml(name.toLowerCase())}">
      <input type="checkbox" class="region-checkbox" value="${escapeHtml(code)}">
      <span>${escapeHtml(name)}</span>
    </label>
  `).join("");
}

function initWizard() {
  const steps = [...partnerV2.querySelectorAll(".wizard-step")];
  const indicators = [...partnerV2.querySelectorAll(".wizard-progress-item")];
  let currentStep = 0;

  function showStep(index) {
    currentStep = index;
    steps.forEach((step, i) => step.hidden = i !== index);
    indicators.forEach((item, i) => {
      item.classList.toggle("active", i === index);
      item.classList.toggle("done", i < index);
    });

    const progress = partnerV2.querySelector(".wizard-progress-bar span");
    if (progress) progress.style.width = `${((index + 1) / steps.length) * 100}%`;

    partnerV2.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  partnerV2.querySelectorAll(".wizard-next").forEach((button) => {
    button.addEventListener("click", () => {
      if (!validateStep(currentStep)) return;
      if (currentStep < steps.length - 1) showStep(currentStep + 1);
    });
  });

  partnerV2.querySelectorAll(".wizard-back").forEach((button) => {
    button.addEventListener("click", () => {
      if (currentStep > 0) showStep(currentStep - 1);
    });
  });

  showStep(0);
}

function validateStep(stepIndex) {
  clearWizardError();
  const step = partnerV2.querySelectorAll(".wizard-step")[stepIndex];

  if (stepIndex === 0) {
    if (!checkedValue("participantType")) return wizardError("Выберите тип участника.");
    if (!checkedValue("legalForm")) return wizardError("Выберите организационную форму.");
    if (!valueOf("contactName")) return wizardError("Укажите контактное лицо.");
    if (!valueOf("phone")) return wizardError("Укажите телефон.");
    const legal = checkedValue("legalForm");
    if (["ООО","ИП"].includes(legal) && !/^\d{10}$|^\d{12}$/.test(digitsOnly(valueOf("inn")))) {
      return wizardError("Для ООО или ИП укажите ИНН из 10 или 12 цифр.");
    }
  }

  if (stepIndex === 1) {
    if (!partnerV2.querySelector(".work-checkbox:checked")) {
      return wizardError("Выберите хотя бы один конкретный вид работ.");
    }
  }

  if (stepIndex === 2) {
    if (!partnerV2.querySelector(".object-checkbox:checked")) {
      return wizardError("Выберите хотя бы один тип объекта.");
    }
    if (!valueOf("baseRegion")) return wizardError("Выберите базовый регион.");
    if (!valueOf("baseCity")) return wizardError("Укажите базовый город.");
  }

  if (stepIndex === 3) {
    const requiredRadioNames = ["teamSize","vat","travel","minOrder","maxProject"];
    for (const name of requiredRadioNames) {
      if (!checkedValue(name)) return wizardError(`Заполните поле: ${labelForRadio(name)}.`);
    }
  }

  const required = [...step.querySelectorAll("[required]")];
  for (const field of required) {
    if (field.type === "checkbox" && !field.checked) {
      return wizardError("Подтвердите согласие на обработку данных.");
    }
    if (!field.value && field.type !== "checkbox") {
      field.focus();
      return wizardError("Заполните обязательное поле.");
    }
  }

  return true;
}

function initPartnerConditions() {
  partnerV2.querySelectorAll('input[name="legalForm"]').forEach(input => {
    input.addEventListener("change", () => {
      const inn = document.getElementById("inn");
      const company = document.getElementById("companyName");
      const legal = checkedValue("legalForm");
      if (inn) inn.required = ["ООО","ИП"].includes(legal);
      if (company) company.required = ["ООО","ИП"].includes(legal);
    });
  });

  const nationwide = document.getElementById("nationwide");
  const extraWrap = document.getElementById("extraRegionsWrap");
  if (nationwide && extraWrap) {
    nationwide.addEventListener("change", () => {
      extraWrap.hidden = nationwide.checked;
      if (nationwide.checked) {
        extraWrap.querySelectorAll(".region-checkbox").forEach(box => box.checked = false);
      }
    });
  }
}

async function submitPartnerV2(event) {
  event.preventDefault();
  clearWizardError();

  if (!validateStep(4)) return;

  const button = partnerV2.querySelector(".partner-v2-submit");
  const status = partnerV2.querySelector(".form-status");

  const baseRegionCode = valueOf("baseRegion");
  const baseRegionName = regionName(baseRegionCode);

  const regions = [];
  if (baseRegionCode) regions.push({ code: baseRegionCode, name: baseRegionName });

  if (document.getElementById("nationwide")?.checked) {
    regions.push({ code: "RU-ALL", name: "Вся Россия" });
  } else {
    partnerV2.querySelectorAll(".region-checkbox:checked").forEach(box => {
      if (box.value !== baseRegionCode) {
        regions.push({ code: box.value, name: regionName(box.value) });
      }
    });
  }

  const payload = {
    formType: "partner_v2",
    page: window.location.href,
    source: "malars.ru",
    participant: {
      participantType: checkedValue("participantType"),
      legalForm: checkedValue("legalForm"),
      companyName: valueOf("companyName"),
      inn: digitsOnly(valueOf("inn")),
      contactName: valueOf("contactName"),
      phone: valueOf("phone"),
      telegram: valueOf("telegram"),
      email: valueOf("email"),
      baseRegionCode,
      baseRegionName,
      baseCity: valueOf("baseCity"),
      teamSize: checkedValue("teamSize"),
      vat: checkedValue("vat"),
      paymentForms: checkedValues("paymentForms"),
      travel: checkedValue("travel"),
      nationwide: Boolean(document.getElementById("nationwide")?.checked),
      minOrder: checkedValue("minOrder"),
      maxProject: checkedValue("maxProject"),
      portfolioUrl: valueOf("portfolioUrl"),
      comment: valueOf("partnerComment")
    },
    competencies: checkedValuesByClass("work-checkbox"),
    objectTypes: checkedValuesByClass("object-checkbox"),
    regions,
    documents: checkedValues("documents")
  };

  setBusy(button, true, "Отправляем анкету…");
  status.textContent = "";

  try {
    const result = await postJson(payload);
    if (!result.ok) throw new Error(result.error || "Ошибка отправки");

    partnerV2.reset();
    document.getElementById("workDetails").innerHTML = "";
    const extraWrap = document.getElementById("extraRegionsWrap");
    if (extraWrap) extraWrap.hidden = false;

    status.textContent = `Готово. Анкета зарегистрирована: ${result.participantId || ""}`.trim();
    showSuccessStep(result.participantId);
  } catch (error) {
    console.error(error);
    status.textContent = `Не удалось отправить анкету: ${error.message}`;
  } finally {
    setBusy(button, false, "Отправить анкету");
  }
}

function showSuccessStep(participantId) {
  partnerV2.querySelectorAll(".wizard-step").forEach(step => step.hidden = true);
  const success = document.getElementById("partnerSuccess");
  if (!success) return;
  success.hidden = false;
  const id = success.querySelector("[data-participant-id]");
  if (id) id.textContent = participantId || "";
}

async function postJson(payload) {
  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  return response.json();
}

function filterRegions(event) {
  const query = event.target.value.trim().toLowerCase();
  document.querySelectorAll(".region-option").forEach(option => {
    option.hidden = query && !option.dataset.search.includes(query);
  });
}

function checkedValue(name) {
  return partnerV2?.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function checkedValues(name) {
  return [...(partnerV2?.querySelectorAll(`input[name="${name}"]:checked`) || [])].map(el => el.value);
}

function checkedValuesByClass(className) {
  return [...(partnerV2?.querySelectorAll(`.${className}:checked`) || [])].map(el => el.value);
}

function valueOf(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function regionName(code) {
  return REGIONS.find(([itemCode]) => itemCode === code)?.[1] || "";
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function setBusy(button, busy, text) {
  if (!button) return;
  button.disabled = busy;
  button.textContent = text;
}

function wizardError(message) {
  const box = partnerV2.querySelector(".wizard-error");
  if (box) {
    box.textContent = message;
    box.hidden = false;
  }
  return false;
}

function clearWizardError() {
  const box = partnerV2?.querySelector(".wizard-error");
  if (box) {
    box.textContent = "";
    box.hidden = true;
  }
}

function labelForRadio(name) {
  return {
    teamSize: "численность",
    vat: "работа с НДС",
    travel: "готовность к командировкам",
    minOrder: "минимальный заказ",
    maxProject: "максимальный проект"
  }[name] || name;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

