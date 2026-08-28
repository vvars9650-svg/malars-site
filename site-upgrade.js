(() => {
  const BRAND_NAME = "МАЛАРС-ГРУПП";
  const HH_AREAS_URL = "https://api.hh.ru/areas/113?locale=RU";
  const AREA_CACHE_KEY = "malars-group-russia-areas-v2";
  const PHONE_PATTERN = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const MAX_FILES_TOTAL = 25 * 1024 * 1024;
  let selectedClientFiles = [];
  const selectedWorks = new Set();

  window.MalarsUpgrade = {
    beforeCore,
    afterCore
  };

  function beforeCore() {
    installFriendlyFormErrors();
    addUpgradeStyles();
    upgradeBrand();
    upgradeMobileNavigation();
    upgradeClientForm();
    upgradePartnerStepOne();
    upgradePartnerStaticSteps();
  }

  function afterCore() {
    initClientEnhancements();
    initPartnerIdentityEnhancements();
    initPartnerRegionCity();
    addOpoObjectType();
    preserveWorkSelections();
    enhancePartnerWizard();
    installClientSubmitHandler();
  }

  function installFriendlyFormErrors() {
    const observer = new MutationObserver(() => {
      document.querySelectorAll(".form-status").forEach(status => {
        const text = status.textContent.trim();
        if (text.startsWith("Не удалось отправить данные")) {
          status.textContent = "Не удалось отправить данные. Проверьте корректность заполнения полей.";
        }
        if (text.startsWith("Не удалось отправить анкету")) {
          status.textContent = "Не удалось отправить анкету. Проверьте корректность заполнения полей.";
        }
      });
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  }

  function upgradeBrand() {
    document.title = `${BRAND_NAME} — интегратор решений`;
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.content = `${BRAND_NAME} — интегратор строительных и инженерных решений. Получаем задачу, собираем решение, организуем исполнение и отвечаем за результат.`;
    }

    document.querySelectorAll(".brand-mark").forEach(mark => {
      mark.innerHTML = '<img src="logo.svg?v=3" alt="" aria-hidden="true">';
    });
    document.querySelectorAll(".brand").forEach(brand => {
      brand.setAttribute("aria-label", BRAND_NAME);
      const textSpan = [...brand.children].find(el => !el.classList.contains("brand-mark"));
      if (textSpan) textSpan.textContent = BRAND_NAME;
    });

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(textNode => {
      const parent = textNode.parentElement;
      if (!parent || ["SCRIPT", "STYLE"].includes(parent.tagName)) return;
      textNode.nodeValue = textNode.nodeValue.replace(/МАЛАРС(?!-ГРУПП)/g, BRAND_NAME);
    });

    let favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      favicon.type = "image/svg+xml";
      document.head.appendChild(favicon);
    }
    favicon.href = "logo.svg?v=3";
  }

  function upgradeMobileNavigation() {
    const header = document.querySelector(".header");
    const nav = header?.querySelector(".nav");
    const desktopLinks = nav?.querySelector(".nav-links");
    if (!header || !nav || !desktopLinks || nav.querySelector(".mobile-menu-toggle")) return;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "mobile-menu-toggle";
    toggle.setAttribute("aria-label", "Открыть меню");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = "<span></span><span></span><span></span>";
    nav.appendChild(toggle);

    const panel = document.createElement("div");
    panel.className = "mobile-nav-panel";
    panel.hidden = true;
    const inner = document.createElement("div");
    inner.className = "container mobile-nav-inner";

    desktopLinks.querySelectorAll("a").forEach(link => {
      const clone = link.cloneNode(true);
      clone.classList.add("mobile-nav-link");
      inner.appendChild(clone);
    });

    const cta = nav.querySelector(".button-small")?.cloneNode(true);
    if (cta) {
      cta.classList.remove("button-small", "button-outline");
      cta.classList.add("mobile-nav-cta");
      inner.appendChild(cta);
    }
    panel.appendChild(inner);
    header.appendChild(panel);

    const closeMenu = () => {
      toggle.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Открыть меню");
      panel.hidden = true;
      document.body.classList.remove("mobile-menu-open");
    };
    const openMenu = () => {
      toggle.classList.add("open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Закрыть меню");
      panel.hidden = false;
      document.body.classList.add("mobile-menu-open");
    };

    toggle.addEventListener("click", () => panel.hidden ? openMenu() : closeMenu());
    panel.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeMenu(); });
    window.addEventListener("resize", () => { if (window.innerWidth > 900) closeMenu(); });
  }

  function upgradeClientForm() {
    const form = document.getElementById("clientForm");
    if (!form) return;

    const contact = form.querySelector('input[name="contact"]');
    const contactLabel = contact?.closest("label");
    if (contactLabel) {
      contactLabel.innerHTML = `
        Телефон
        <input name="contact" id="clientPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (999) 999-99-99" required>
      `;
    }

    let email = form.querySelector('input[name="email"]');
    if (!email) {
      const emailLabel = document.createElement("label");
      emailLabel.innerHTML = `
        Email для коммерческого предложения
        <input name="email" id="clientEmail" type="email" autocomplete="email" placeholder="name@company.ru" required>
      `;
      contactLabel?.insertAdjacentElement("afterend", emailLabel);
    } else {
      email.id = "clientEmail";
      email.type = "email";
      email.required = true;
      email.autocomplete = "email";
    }

    const oldCity = form.querySelector('input[name="city"]');
    const oldCityLabel = oldCity?.closest("label");
    if (oldCityLabel) {
      const locationWrap = document.createElement("div");
      locationWrap.className = "client-location-fields";
      locationWrap.innerHTML = `
        <label>Регион
          <select id="clientRegion" required>
            <option value="">Загрузка регионов...</option>
          </select>
        </label>
        <label>Город
          <select id="clientCity" required disabled>
            <option value="">Сначала выберите регион</option>
          </select>
        </label>
        <input id="clientLocation" name="city" type="hidden" value="">
      `;
      oldCityLabel.replaceWith(locationWrap);
    }

    const task = form.querySelector('textarea[name="task"]');
    const taskLabel = task?.closest("label");
    if (taskLabel && !form.querySelector("#clientFilesDropzone")) {
      const filesWrap = document.createElement("div");
      filesWrap.className = "client-files-field";
      filesWrap.innerHTML = `
        <div class="client-files-title">Исходные данные</div>
        <div class="file-dropzone" id="clientFilesDropzone" tabindex="0" role="button" aria-label="Загрузить исходные документы">
          <input id="clientFiles" type="file" multiple hidden>
          <button type="button" class="button button-outline file-picker-button">Загрузить документы</button>
          <div class="file-dropzone-hint">ТЗ, чертежи, сметы, таблицы, фотографии и прочие документы</div>
          <div class="file-dropzone-subhint">Перетащите файлы сюда или выберите их с устройства</div>
        </div>
        <div class="file-list" id="clientFileList" aria-live="polite"></div>
      `;
      taskLabel.insertAdjacentElement("afterend", filesWrap);
    }
  }

  function upgradePartnerStepOne() {
    const form = document.getElementById("partnerFormV2");
    const step = form?.querySelectorAll(".wizard-step")?.[0];
    if (!step) return;

    step.innerHTML = `
      <h3>О вас</h3>
      <div class="field-title">Организационная форма</div>
      <div class="choice-grid org-form-grid">
        <label class="choice-card"><input type="radio" name="orgForm" value="ООО"><span>ООО</span></label>
        <label class="choice-card"><input type="radio" name="orgForm" value="ИП"><span>ИП</span></label>
        <label class="choice-card"><input type="radio" name="orgForm" value="Самозанятый"><span>Самозанятый</span></label>
        <label class="choice-card"><input type="radio" name="orgForm" value="Бригада"><span>Бригада</span></label>
        <label class="choice-card"><input type="radio" name="orgForm" value="Частный специалист"><span>Частный специалист</span></label>
      </div>
      <div class="backend-compat-fields" hidden>
        <input id="backendParticipantType" type="radio" name="participantType" value="" checked>
        <input id="backendLegalForm" type="radio" name="legalForm" value="" checked>
      </div>
      <div class="form-two">
        <label>Название (компания / команда)
          <input id="companyName" type="text" placeholder="Название">
        </label>
        <label>ИНН
          <input id="inn" type="text" inputmode="numeric" autocomplete="off" placeholder="10 или 12 цифр">
        </label>
      </div>
      <div class="form-two">
        <label>Контактное лицо
          <input id="contactName" type="text" required autocomplete="name" placeholder="Имя">
        </label>
        <label>Телефон
          <input id="phone" type="tel" inputmode="tel" required autocomplete="tel" placeholder="+7 (999) 999-99-99">
        </label>
      </div>
      <label>Email
        <input id="email" type="email" required autocomplete="email" placeholder="mail@example.ru">
      </label>
      <div class="wizard-buttons">
        <button type="button" class="button wizard-next">Далее</button>
      </div>
    `;
  }

  function upgradePartnerStaticSteps() {
    const form = document.getElementById("partnerFormV2");
    const steps = form ? [...form.querySelectorAll(".wizard-step")] : [];
    if (steps.length < 5) return;

    const h2 = steps[1].querySelector("h3");
    if (h2) h2.textContent = "Какие работы выполняете";

    const h3 = steps[2].querySelector("h3");
    if (h3) h3.textContent = "Объекты и география";
    const baseCity = steps[2].querySelector("#baseCity");
    if (baseCity && baseCity.tagName !== "SELECT") {
      const select = document.createElement("select");
      select.id = "baseCity";
      select.required = true;
      select.disabled = true;
      select.innerHTML = '<option value="">Сначала выберите регион</option>';
      baseCity.replaceWith(select);
    }

    const h4 = steps[3].querySelector("h3");
    if (h4) h4.textContent = "Возможности";
    replaceFieldTitle(steps[3], "Минимальный заказ", "Минимальная комфортная сумма проекта");
    replaceFieldTitle(steps[3], "Максимальный проект", "Максимальная комфортная сумма проекта");
    const paymentTitle = [...steps[3].querySelectorAll(".field-title")].find(el => el.textContent.trim() === "Форма оплаты");
    const paymentGrid = paymentTitle?.nextElementSibling;
    if (paymentGrid?.classList.contains("choice-grid")) {
      paymentGrid.innerHTML = `
        <label class="choice-card"><input type="checkbox" name="paymentForms" value="Безналичный расчёт"><span>Безналичный расчёт</span></label>
        <label class="choice-card"><input type="checkbox" name="paymentForms" value="Наличный расчёт"><span>Наличный расчёт</span></label>
        <label class="choice-card"><input type="checkbox" name="paymentForms" value="Условия по договорённости"><span>Условия по договорённости</span></label>
      `;
    }

    const h5 = steps[4].querySelector("h3");
    if (h5) h5.textContent = "Документы и ресурсы";
    const docsGrid = steps[4].querySelector(".choice-grid");
    if (docsGrid) {
      const tools = docsGrid.querySelector('input[value="RES-TOOLS"]')?.closest(".choice-card")?.querySelector("span");
      if (tools) tools.textContent = "Собственный инструмент / оборудование";
      const tech = docsGrid.querySelector('input[value="RES-EQUIP"]')?.closest(".choice-card")?.querySelector("span");
      if (tech) tech.textContent = "Собственная техника";
      if (!docsGrid.querySelector('input[value="DOC-FSTEK"]')) {
        const card = document.createElement("label");
        card.className = "choice-card";
        card.innerHTML = '<input type="checkbox" name="documents" value="DOC-FSTEK"><span>Лицензия ФСТЭК России</span>';
        const port = docsGrid.querySelector('input[value="DOC-PORT"]')?.closest(".choice-card");
        if (port) port.insertAdjacentElement("beforebegin", card);
        else docsGrid.appendChild(card);
      }
    }
  }

  function replaceFieldTitle(step, from, to) {
    [...step.querySelectorAll(".field-title")].forEach(el => {
      if (el.textContent.trim() === from) el.textContent = to;
    });
  }

  function initClientEnhancements() {
    const phone = document.getElementById("clientPhone");
    const email = document.getElementById("clientEmail");
    if (phone) attachRussianPhoneMask(phone);
    if (email) attachEmailValidation(email);
    initRegionCityPair("clientRegion", "clientCity", "clientLocation", true);
    initClientFiles();
  }

  function initPartnerIdentityEnhancements() {
    const form = document.getElementById("partnerFormV2");
    if (!form) return;
    const orgInputs = [...form.querySelectorAll('input[name="orgForm"]')];
    const backendParticipant = document.getElementById("backendParticipantType");
    const backendLegal = document.getElementById("backendLegalForm");
    const company = document.getElementById("companyName");
    const inn = document.getElementById("inn");
    const phone = document.getElementById("phone");
    const email = document.getElementById("email");

    if (phone) attachRussianPhoneMask(phone);
    if (email) attachEmailValidation(email);

    const map = {
      "ООО": { participantType: "Компания", legalForm: "ООО", innLength: 10, innRequired: true, companyRequired: true },
      "ИП": { participantType: "ИП", legalForm: "ИП", innLength: 12, innRequired: true, companyRequired: true },
      "Самозанятый": { participantType: "Самозанятый", legalForm: "Самозанятый", innLength: 12, innRequired: true, companyRequired: false },
      "Бригада": { participantType: "Бригада", legalForm: "Физлицо", innLength: 12, innRequired: false, companyRequired: true },
      "Частный специалист": { participantType: "Частный специалист", legalForm: "Физлицо", innLength: 12, innRequired: false, companyRequired: false }
    };

    const sync = value => {
      const item = map[value];
      if (!item) return;
      if (backendParticipant) backendParticipant.value = item.participantType;
      if (backendLegal) backendLegal.value = item.legalForm;
      if (inn) {
        inn.value = inn.value.replace(/\D/g, "").slice(0, item.innLength);
        inn.maxLength = item.innLength;
        inn.placeholder = `${item.innLength} цифр`;
        inn.required = item.innRequired;
        inn.dataset.expectedLength = String(item.innLength);
      }
      if (company) company.required = item.companyRequired;
    };
    orgInputs.forEach(input => input.addEventListener("change", () => sync(input.value)));
    if (inn) {
      inn.addEventListener("input", () => {
        const max = Number(inn.dataset.expectedLength || 12);
        inn.value = inn.value.replace(/\D/g, "").slice(0, max);
        validateInnField(inn, form.querySelector('input[name="orgForm"]:checked')?.value || "");
      });
    }
  }

  function initPartnerRegionCity() {
    initRegionCityPair("baseRegion", "baseCity", null, false);
  }

  async function initRegionCityPair(regionId, cityId, hiddenLocationId, clientMode) {
    const regionSelect = document.getElementById(regionId);
    const citySelect = document.getElementById(cityId);
    const locationInput = hiddenLocationId ? document.getElementById(hiddenLocationId) : null;
    if (!regionSelect || !citySelect) return;

    citySelect.disabled = true;
    if (clientMode) {
      regionSelect.disabled = true;
      regionSelect.innerHTML = '<option value="">Загрузка регионов...</option>';
    }

    try {
      const areas = await loadRussianAreas();
      if (clientMode) {
        regionSelect.innerHTML = '<option value="">Выберите регион</option>' + REGIONS.map(([code, name]) =>
          `<option value="${escapeHtmlLocal(code)}">${escapeHtmlLocal(name)}</option>`
        ).join("");
        regionSelect.disabled = false;
      }

      const populateCities = () => {
        if (locationInput) locationInput.value = "";
        const regionCode = regionSelect.value;
        const regionName = regionSelect.options[regionSelect.selectedIndex]?.text?.trim() || "";
        if (!regionCode || !regionName) {
          citySelect.innerHTML = '<option value="">Сначала выберите регион</option>';
          citySelect.disabled = true;
          return;
        }

        const cities = findCitiesForRegion(regionName, areas);
        if (!cities.length) {
          citySelect.innerHTML = '<option value="">Города не найдены</option>';
          citySelect.disabled = true;
          return;
        }

        citySelect.innerHTML = '<option value="">Выберите город</option>' + cities.map(city =>
          `<option value="${escapeHtmlLocal(city)}">${escapeHtmlLocal(city)}</option>`
        ).join("");
        citySelect.disabled = false;
      };

      regionSelect.addEventListener("change", populateCities);
      citySelect.addEventListener("change", () => {
        if (!locationInput) return;
        const regionName = regionSelect.options[regionSelect.selectedIndex]?.text?.trim() || "";
        locationInput.value = regionName && citySelect.value ? `${regionName} / ${citySelect.value}` : "";
      });
    } catch (error) {
      console.error("MALARS: не удалось загрузить регионы и города", error);
      if (clientMode) regionSelect.innerHTML = '<option value="">Список регионов временно недоступен</option>';
      citySelect.innerHTML = '<option value="">Список городов временно недоступен</option>';
    }
  }

  async function loadRussianAreas() {
    try {
      const cached = JSON.parse(localStorage.getItem(AREA_CACHE_KEY) || "null");
      if (cached?.savedAt && Date.now() - cached.savedAt < 30 * 24 * 60 * 60 * 1000 && Array.isArray(cached.regions)) {
        return cached.regions;
      }
    } catch (_) {}

    const response = await fetch(HH_AREAS_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const root = await response.json();
    const areas = Array.isArray(root.areas) ? root.areas : [];
    const regions = areas.map(area => ({
      name: area.name,
      cities: buildCities(area)
    })).filter(item => item.name && item.cities.length);

    try { localStorage.setItem(AREA_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), regions })); } catch (_) {}
    return regions;
  }

  function buildCities(area) {
    const federal = ["Москва", "Санкт-Петербург", "Севастополь"];
    if (federal.includes(area?.name)) return [area.name];
    const leaves = collectAreaLeaves(area);
    return [...new Set(leaves)].filter(Boolean).sort((a, b) => a.localeCompare(b, "ru"));
  }

  function collectAreaLeaves(area) {
    const children = Array.isArray(area?.areas) ? area.areas : [];
    if (!children.length) return area?.name ? [area.name] : [];
    return children.flatMap(collectAreaLeaves);
  }

  function findCitiesForRegion(regionName, areas) {
    const target = normalizeRegionName(regionName);
    const match = areas.find(area => normalizeRegionName(area.name) === target) ||
      areas.find(area => normalizeRegionName(area.name).includes(target) || target.includes(normalizeRegionName(area.name)));
    if (match) return match.cities;
    if (["Москва", "Санкт-Петербург", "Севастополь"].includes(regionName)) return [regionName];
    return [];
  }

  function normalizeRegionName(value) {
    return String(value || "").toLowerCase().replace(/ё/g, "е").replace(/[—–-]/g, " ").replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  }

  function initClientFiles() {
    const dropzone = document.getElementById("clientFilesDropzone");
    const input = document.getElementById("clientFiles");
    const picker = dropzone?.querySelector(".file-picker-button");
    if (!dropzone || !input || !picker) return;

    picker.addEventListener("click", event => {
      event.stopPropagation();
      input.click();
    });
    dropzone.addEventListener("click", event => {
      if (event.target === picker) return;
      input.click();
    });
    dropzone.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        input.click();
      }
    });
    input.addEventListener("change", () => addClientFiles([...input.files]));

    ["dragenter", "dragover"].forEach(type => dropzone.addEventListener(type, event => {
      event.preventDefault();
      dropzone.classList.add("dragging");
    }));
    ["dragleave", "drop"].forEach(type => dropzone.addEventListener(type, event => {
      event.preventDefault();
      dropzone.classList.remove("dragging");
    }));
    dropzone.addEventListener("drop", event => addClientFiles([...event.dataTransfer.files]));
  }

  function addClientFiles(files) {
    const existingKeys = new Set(selectedClientFiles.map(fileKey));
    files.forEach(file => {
      if (!existingKeys.has(fileKey(file))) selectedClientFiles.push(file);
    });
    renderClientFiles();
  }

  function fileKey(file) {
    return `${file.name}:${file.size}:${file.lastModified}`;
  }

  function renderClientFiles() {
    const list = document.getElementById("clientFileList");
    if (!list) return;
    if (!selectedClientFiles.length) {
      list.innerHTML = "";
      return;
    }
    list.innerHTML = selectedClientFiles.map((file, index) => `
      <div class="file-row">
        <div><strong>${escapeHtmlLocal(file.name)}</strong><span>${formatBytes(file.size)}</span></div>
        <button type="button" class="file-remove" data-index="${index}" aria-label="Удалить ${escapeHtmlLocal(file.name)}">×</button>
      </div>
    `).join("");
    list.querySelectorAll(".file-remove").forEach(button => {
      button.addEventListener("click", () => {
        selectedClientFiles.splice(Number(button.dataset.index), 1);
        renderClientFiles();
      });
    });
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
  }

  function addOpoObjectType() {
    const box = document.getElementById("objectTypes");
    if (!box || box.querySelector('input[value="OBJ-15"]')) return;
    const label = document.createElement("label");
    label.className = "choice-card compact";
    label.innerHTML = '<input type="checkbox" class="object-checkbox" value="OBJ-15"><span>Опасные производственные объекты (ОПО)</span>';
    box.appendChild(label);
  }

  function preserveWorkSelections() {
    const categoryBox = document.getElementById("workCategories");
    const workBox = document.getElementById("workDetails");
    if (!categoryBox || !workBox) return;

    workBox.addEventListener("change", event => {
      const input = event.target.closest?.(".work-checkbox");
      if (!input) return;
      if (input.checked) selectedWorks.add(input.value);
      else selectedWorks.delete(input.value);
    });

    categoryBox.addEventListener("change", event => {
      if (!event.target.classList.contains("category-checkbox")) return;
      workBox.querySelectorAll(".work-checkbox:checked").forEach(box => selectedWorks.add(box.value));
      setTimeout(() => {
        workBox.querySelectorAll(".work-checkbox").forEach(box => {
          box.checked = selectedWorks.has(box.value);
        });
        updateSelectAllButtons(workBox);
      }, 0);
    }, true);

    workBox.addEventListener("click", event => {
      if (!event.target.closest?.(".select-all-works")) return;
      setTimeout(() => {
        workBox.querySelectorAll(".work-checkbox").forEach(box => {
          if (box.checked) selectedWorks.add(box.value);
          else selectedWorks.delete(box.value);
        });
        updateSelectAllButtons(workBox);
      }, 0);
    });
  }

  function updateSelectAllButtons(workBox) {
    workBox.querySelectorAll(".work-group").forEach(group => {
      const boxes = [...group.querySelectorAll(".work-checkbox")];
      const button = group.querySelector(".select-all-works");
      if (button && boxes.length) button.textContent = boxes.every(box => box.checked) ? "Снять всё" : "Выбрать всё";
    });
  }

  function enhancePartnerWizard() {
    const form = document.getElementById("partnerFormV2");
    if (!form || typeof validateStep !== "function") return;
    const steps = [...form.querySelectorAll(".wizard-step")];
    const indicators = [...form.querySelectorAll(".wizard-progress-item")];
    if (!steps.length || indicators.length !== steps.length) return;

    let currentStep = Math.max(0, steps.findIndex(step => !step.hidden));
    let maxUnlockedStep = currentStep;

    const validateCurrent = index => {
      if (index === 0 && !validatePartnerIdentityStep()) return false;
      return validateStep(index);
    };

    const showStep = (index, scroll = true) => {
      if (index < 0 || index >= steps.length) return;
      currentStep = index;
      steps.forEach((step, i) => step.hidden = i !== index);
      indicators.forEach((item, i) => {
        const unlocked = i <= maxUnlockedStep;
        item.classList.toggle("active", i === index);
        item.classList.toggle("done", i < maxUnlockedStep && i !== index);
        item.classList.toggle("unlocked", unlocked);
        item.classList.toggle("locked", !unlocked);
        item.setAttribute("aria-current", i === index ? "step" : "false");
        item.setAttribute("aria-disabled", unlocked ? "false" : "true");
        item.tabIndex = unlocked ? 0 : -1;
      });
      const progress = form.querySelector(".wizard-progress-bar span");
      if (progress) progress.style.width = `${((index + 1) / steps.length) * 100}%`;
      if (scroll) form.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    indicators.forEach((item, index) => {
      item.setAttribute("role", "button");
      item.addEventListener("click", () => {
        if (index <= maxUnlockedStep && index !== currentStep) showStep(index);
      });
      item.addEventListener("keydown", event => {
        if ((event.key === "Enter" || event.key === " ") && index <= maxUnlockedStep) {
          event.preventDefault();
          showStep(index);
        }
      });
    });

    form.querySelectorAll(".wizard-next").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!validateCurrent(currentStep)) return;
        maxUnlockedStep = Math.max(maxUnlockedStep, Math.min(currentStep + 1, steps.length - 1));
        if (currentStep < steps.length - 1) showStep(currentStep + 1);
      }, true);
    });
    form.querySelectorAll(".wizard-back").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (currentStep > 0) showStep(currentStep - 1);
      }, true);
    });

    form.addEventListener("submit", event => {
      for (let i = 0; i < steps.length; i += 1) {
        if (!validateCurrent(i)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          maxUnlockedStep = Math.max(maxUnlockedStep, i);
          showStep(i);
          return;
        }
      }
    }, true);
    showStep(currentStep, false);
  }

  function validatePartnerIdentityStep() {
    const form = document.getElementById("partnerFormV2");
    if (!form) return true;
    const org = form.querySelector('input[name="orgForm"]:checked')?.value || "";
    const company = document.getElementById("companyName");
    const inn = document.getElementById("inn");
    const contact = document.getElementById("contactName");
    const phone = document.getElementById("phone");
    const email = document.getElementById("email");

    if (!org) return showPartnerError("Выберите организационную форму.");
    if (company?.required && !company.value.trim()) { company.focus(); return showPartnerError("Укажите название компании или команды."); }
    if (inn && !validateInnField(inn, org)) { inn.focus(); return showPartnerError(`Укажите корректный ИНН: ${org === "ООО" ? 10 : 12} цифр.`); }
    if (!contact?.value.trim()) { contact?.focus(); return showPartnerError("Укажите контактное лицо."); }
    if (!phone || !PHONE_PATTERN.test(phone.value)) { phone?.focus(); return showPartnerError("Введите телефон в формате +7 (999) 999-99-99."); }
    if (!email || !EMAIL_PATTERN.test(email.value.trim())) { email?.focus(); return showPartnerError("Введите корректный email."); }
    return true;
  }

  function validateInnField(inn, org) {
    const digits = inn.value.replace(/\D/g, "");
    const required = ["ООО", "ИП", "Самозанятый"].includes(org);
    if (!digits && !required) { inn.setCustomValidity(""); return true; }
    const expected = org === "ООО" ? 10 : 12;
    const valid = digits.length === expected;
    inn.setCustomValidity(valid ? "" : `ИНН должен содержать ${expected} цифр.`);
    return valid;
  }

  function showPartnerError(message) {
    const box = document.querySelector("#partnerFormV2 .wizard-error");
    if (box) { box.textContent = message; box.hidden = false; }
    return false;
  }

  function attachRussianPhoneMask(input) {
    const refreshValidity = () => {
      if (!input.value) { input.setCustomValidity(""); return; }
      input.setCustomValidity(PHONE_PATTERN.test(input.value) ? "" : "Введите номер в формате +7 (999) 999-99-99.");
    };
    input.addEventListener("focus", () => { if (!input.value) input.value = "+7 "; });
    input.addEventListener("input", () => { input.value = formatRussianPhone(input.value); refreshValidity(); });
    input.addEventListener("blur", () => { if (input.value === "+7 ") input.value = ""; refreshValidity(); });
  }

  function formatRussianPhone(value) {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
    if (digits.startsWith("7")) digits = digits.slice(1);
    digits = digits.slice(0, 10);
    if (!digits.length) return "+7 ";
    let result = "+7";
    if (digits.length) result += ` (${digits.slice(0, 3)}`;
    if (digits.length >= 3) result += ")";
    if (digits.length > 3) result += ` ${digits.slice(3, 6)}`;
    if (digits.length > 6) result += `-${digits.slice(6, 8)}`;
    if (digits.length > 8) result += `-${digits.slice(8, 10)}`;
    return result;
  }

  function attachEmailValidation(input) {
    const validate = () => {
      if (!input.value) { input.setCustomValidity(""); return true; }
      const valid = EMAIL_PATTERN.test(input.value.trim());
      input.setCustomValidity(valid ? "" : "Введите корректный email, например name@company.ru.");
      return valid;
    };
    input.addEventListener("input", validate);
    input.addEventListener("blur", validate);
  }

  function installClientSubmitHandler() {
    const form = document.getElementById("clientForm");
    if (!form || typeof postJson !== "function") return;
    form.addEventListener("submit", async event => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const status = form.querySelector(".form-status");
      const button = form.querySelector(".form-submit");
      status.textContent = "";

      const phone = document.getElementById("clientPhone");
      const email = document.getElementById("clientEmail");
      const region = document.getElementById("clientRegion");
      const city = document.getElementById("clientCity");
      const task = form.querySelector('textarea[name="task"]');
      const consent = form.querySelector('input[name="consent"]');

      if (!form.querySelector('input[name="name"]')?.value.trim()) return clientError("Укажите, как к вам обращаться.");
      if (!phone || !PHONE_PATTERN.test(phone.value)) { phone?.focus(); return clientError("Введите телефон в формате +7 (999) 999-99-99."); }
      if (!email || !EMAIL_PATTERN.test(email.value.trim())) { email?.focus(); return clientError("Введите корректный email."); }
      if (!region?.value) { region?.focus(); return clientError("Выберите регион."); }
      if (!city?.value) { city?.focus(); return clientError("Выберите город."); }
      if (!task?.value.trim()) { task?.focus(); return clientError("Опишите, что нужно сделать."); }
      if (!consent?.checked) return clientError("Подтвердите согласие на обработку данных.");

      const totalSize = selectedClientFiles.reduce((sum, file) => sum + file.size, 0);
      if (selectedClientFiles.some(file => file.size > MAX_FILE_SIZE)) return clientError("Размер одного файла не должен превышать 10 МБ.");
      if (totalSize > MAX_FILES_TOTAL) return clientError("Общий размер файлов не должен превышать 25 МБ.");

      if (button) { button.disabled = true; button.textContent = "Отправляем…"; }
      try {
        const files = await Promise.all(selectedClientFiles.map(fileToPayload));
        const regionName = region.options[region.selectedIndex]?.text?.trim() || "";
        const payload = {
          formType: "client",
          name: form.querySelector('input[name="name"]').value.trim(),
          contact: phone.value,
          email: email.value.trim(),
          region: regionName,
          cityName: city.value,
          city: `${regionName} / ${city.value}`,
          task: task.value.trim(),
          deadline: form.querySelector('input[name="deadline"]')?.value.trim() || "",
          page: window.location.href,
          submittedAt: new Date().toISOString(),
          files
        };
        const result = await postJson(payload);
        if (!result.ok) throw new Error(result.error || "Ошибка отправки");
        form.reset();
        selectedClientFiles = [];
        renderClientFiles();
        document.getElementById("clientCity").disabled = true;
        document.getElementById("clientCity").innerHTML = '<option value="">Сначала выберите регион</option>';
        status.textContent = files.length ? "Готово. Заявка и документы отправлены." : "Готово. Заявка отправлена.";
      } catch (error) {
        console.error(error);
        status.textContent = "Не удалось отправить данные. Проверьте корректность заполнения полей.";
      } finally {
        if (button) { button.disabled = false; button.textContent = "Отправить задачу"; }
      }
    }, true);

    function clientError(message) {
      status.textContent = message;
      return false;
    }
  }

  function fileToPayload(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        resolve({
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          data: result.includes(",") ? result.split(",")[1] : result
        });
      };
      reader.onerror = () => reject(reader.error || new Error("Не удалось прочитать файл"));
      reader.readAsDataURL(file);
    });
  }

  function addUpgradeStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .brand-mark{width:42px!important;height:42px!important;padding:0!important;border-radius:0!important;background:transparent!important;overflow:visible!important}
      .brand-mark img{display:block;width:100%;height:100%;object-fit:contain}.brand{white-space:nowrap}
      .mobile-menu-toggle{display:none;width:44px;height:44px;padding:10px;margin-left:auto;border:1px solid var(--line);border-radius:12px;background:#fff;cursor:pointer}
      .mobile-menu-toggle span{display:block;width:100%;height:2px;margin:4px 0;border-radius:3px;background:var(--text);transition:transform .18s ease,opacity .18s ease}
      .mobile-menu-toggle.open span:nth-child(1){transform:translateY(6px) rotate(45deg)}.mobile-menu-toggle.open span:nth-child(2){opacity:0}.mobile-menu-toggle.open span:nth-child(3){transform:translateY(-6px) rotate(-45deg)}
      .mobile-nav-panel{position:absolute;top:100%;left:0;right:0;z-index:25;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:rgba(245,246,243,.98);box-shadow:0 18px 38px rgba(15,20,15,.12)}
      .mobile-nav-panel[hidden]{display:none!important}.mobile-nav-inner{display:flex;flex-direction:column;padding-top:14px;padding-bottom:18px}.mobile-nav-link{padding:14px 4px;border-bottom:1px solid var(--line);font-weight:700}.mobile-nav-cta{margin-top:16px}body.mobile-menu-open{overflow:hidden}
      .client-location-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}.client-location-fields>label{margin-bottom:16px}
      .client-files-field{margin-bottom:16px}.client-files-title{font-size:13px;font-weight:700;margin-bottom:8px}.file-dropzone{border:1.5px dashed #aeb5aa;border-radius:16px;background:#fff;padding:24px;text-align:center;cursor:pointer;transition:border-color .15s ease,background .15s ease,transform .15s ease}.file-dropzone:hover,.file-dropzone.dragging{border-color:#7b886f;background:#f5fbe9;transform:translateY(-1px)}.file-dropzone:focus-visible{outline:2px solid #111;outline-offset:2px}.file-picker-button{width:auto!important;min-height:44px!important}.file-dropzone-hint{margin-top:14px;font-size:13px;font-weight:700}.file-dropzone-subhint{margin-top:4px;color:var(--muted);font-size:12px}.file-list{display:grid;gap:8px;margin-top:10px}.file-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:#fff}.file-row div{min-width:0}.file-row strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.file-row span{display:block;color:var(--muted);font-size:11px;margin-top:2px}.file-remove{width:32px;height:32px;flex:0 0 32px;border:0;border-radius:9px;background:#f0f2ee;cursor:pointer;font-size:20px;line-height:1}
      .wizard-progress-item{transition:transform .15s ease,box-shadow .15s ease,opacity .15s ease;user-select:none}.wizard-progress-item.unlocked{cursor:pointer}.wizard-progress-item.unlocked:hover:not(.active){transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.08)}.wizard-progress-item.unlocked:focus-visible{outline:2px solid #111;outline-offset:2px}.wizard-progress-item.locked{cursor:not-allowed;opacity:.55}
      .form-panel .choice-chip{position:relative;display:flex!important;align-items:center!important;gap:11px;min-height:58px;margin:0!important;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:#fff;color:var(--text);font-size:13px!important;font-weight:650!important;line-height:1.3;cursor:pointer;transition:border-color .15s ease,background .15s ease,transform .15s ease}.form-panel .choice-chip:hover{border-color:#aeb5aa;transform:translateY(-1px)}.form-panel .choice-chip input[type="checkbox"]{flex:0 0 18px;width:18px!important;height:18px!important;min-width:18px;margin:0!important;padding:0!important;align-self:center!important}.form-panel .choice-chip span{display:flex;align-items:center;min-height:22px}.form-panel .choice-chip:has(input:checked){background:#efffcf;border-color:#9fbd68}
      @media(max-width:900px){.nav .button-small{display:none!important}.mobile-menu-toggle{display:block}}
      @media(max-width:640px){.brand{font-size:12px;gap:7px;letter-spacing:.02em}.brand-mark{width:36px!important;height:36px!important}.client-location-fields{grid-template-columns:1fr;gap:0}.file-dropzone{padding:20px 14px}.file-picker-button{width:100%!important}}
    `;
    document.head.appendChild(style);
  }

  function escapeHtmlLocal(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
})();