(() => {
  const CORE_VERSION = "20260827-1";
  const BRAND_NAME = "МАЛАРС-ГРУПП";
  const PHONE_PATTERN = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const HH_AREAS_URL = "https://api.hh.ru/areas/113?locale=RU";
  const AREA_CACHE_KEY = "malars-group-russia-areas-v1";

  installFriendlyFormErrors();
  addUpgradeStyles();
  upgradeBrand();
  upgradeMobileNavigation();
  upgradeClientForm();
  upgradePartnerStepOne();
  upgradeWorksStep();

  const core = document.createElement("script");
  core.src = `script-core.js?v=${CORE_VERSION}`;
  core.async = false;
  core.onload = () => {
    initClientFormEnhancements();
    initPartnerIdentityEnhancements();
    enhancePartnerWizard();
  };
  core.onerror = () => console.error("MALARS: не удалось загрузить основной скрипт сайта");
  document.head.appendChild(core);

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

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true
    });
  }

  function upgradeBrand() {
    document.title = `${BRAND_NAME} — интегратор решений`;

    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.content = `${BRAND_NAME} — интегратор строительных и инженерных решений. Получаем задачу, собираем решение, организуем исполнение и отвечаем за результат.`;
    }

    document.querySelectorAll(".brand-mark").forEach(mark => {
      mark.innerHTML = '<img src="logo.svg?v=2" alt="" aria-hidden="true">';
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
    favicon.href = "logo.svg?v=2";
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

    toggle.addEventListener("click", () => {
      if (panel.hidden) openMenu();
      else closeMenu();
    });

    panel.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeMenu();
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) closeMenu();
    });
  }

  function upgradeClientForm() {
    const form = document.getElementById("clientForm");
    if (!form) return;

    const nameInput = form.querySelector('input[name="name"]');
    if (nameInput) {
      nameInput.type = "text";
      nameInput.autocomplete = "name";
    }

    const oldContact = form.querySelector('input[name="contact"]');
    const oldContactLabel = oldContact?.closest("label");
    if (oldContactLabel) {
      oldContactLabel.innerHTML = `
        Телефон
        <input
          name="contact"
          id="clientPhone"
          type="tel"
          inputmode="tel"
          autocomplete="tel"
          placeholder="+7 (999) 999-99-99"
          required
        >
      `;
    }

    let email = form.querySelector('input[name="email"]');
    if (!email) {
      const emailLabel = document.createElement("label");
      emailLabel.innerHTML = `
        Email для коммерческого предложения
        <input
          name="email"
          id="clientEmail"
          type="email"
          autocomplete="email"
          placeholder="name@company.ru"
          required
        >
      `;
      oldContactLabel?.insertAdjacentElement("afterend", emailLabel);
      email = emailLabel.querySelector("input");
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
        <label>
          Регион
          <select id="clientRegion" required>
            <option value="">Загрузка регионов...</option>
          </select>
        </label>
        <label>
          Город
          <select id="clientCity" required disabled>
            <option value="">Сначала выберите регион</option>
          </select>
        </label>
        <input id="clientLocation" name="city" type="hidden" value="">
      `;
      oldCityLabel.replaceWith(locationWrap);
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
        <label class="choice-card">
          <input type="radio" name="orgForm" value="ООО">
          <span>ООО</span>
        </label>
        <label class="choice-card">
          <input type="radio" name="orgForm" value="ИП">
          <span>ИП</span>
        </label>
        <label class="choice-card">
          <input type="radio" name="orgForm" value="Самозанятый">
          <span>Самозанятый</span>
        </label>
        <label class="choice-card">
          <input type="radio" name="orgForm" value="Бригада">
          <span>Бригада</span>
        </label>
        <label class="choice-card">
          <input type="radio" name="orgForm" value="Частный специалист">
          <span>Частный специалист</span>
        </label>
      </div>

      <div class="backend-compat-fields" hidden>
        <input id="backendParticipantType" type="radio" name="participantType" value="" checked>
        <input id="backendLegalForm" type="radio" name="legalForm" value="" checked>
      </div>

      <div class="form-two">
        <label>
          Название (компания / команда)
          <input id="companyName" type="text" placeholder="Название">
        </label>
        <label>
          ИНН
          <input id="inn" type="text" inputmode="numeric" autocomplete="off" placeholder="10 или 12 цифр">
        </label>
      </div>

      <div class="form-two">
        <label>
          Контактное лицо
          <input id="contactName" type="text" required autocomplete="name" placeholder="Имя">
        </label>
        <label>
          Телефон
          <input id="phone" type="tel" inputmode="tel" required autocomplete="tel" placeholder="+7 (999) 999-99-99">
        </label>
      </div>

      <label>
        Email
        <input id="email" type="email" required autocomplete="email" placeholder="mail@example.ru">
      </label>

      <div class="wizard-buttons">
        <button type="button" class="button wizard-next">Далее</button>
      </div>
    `;
  }

  function upgradeWorksStep() {
    const form = document.getElementById("partnerFormV2");
    const step = form?.querySelectorAll(".wizard-step")?.[1];
    if (!step) return;
    const heading = step.querySelector("h3");
    if (heading) heading.textContent = "Какие работы выполняете";
  }

  function initClientFormEnhancements() {
    const form = document.getElementById("clientForm");
    if (!form) return;

    const phone = document.getElementById("clientPhone");
    const email = document.getElementById("clientEmail");
    if (phone) attachRussianPhoneMask(phone);
    if (email) attachEmailValidation(email);

    initClientRegionCity();
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

    const syncOrgForm = value => {
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

    orgInputs.forEach(input => input.addEventListener("change", () => syncOrgForm(input.value)));

    if (inn) {
      inn.addEventListener("input", () => {
        const max = Number(inn.dataset.expectedLength || 12);
        inn.value = inn.value.replace(/\D/g, "").slice(0, max);
        validateInnField(inn, form.querySelector('input[name="orgForm"]:checked')?.value || "");
      });
    }
  }

  async function initClientRegionCity() {
    const regionSelect = document.getElementById("clientRegion");
    const citySelect = document.getElementById("clientCity");
    const locationInput = document.getElementById("clientLocation");
    if (!regionSelect || !citySelect || !locationInput) return;

    regionSelect.disabled = true;
    citySelect.disabled = true;

    try {
      const regions = await loadRussianAreas();
      regionSelect.innerHTML = '<option value="">Выберите регион</option>' + regions.map((region, index) =>
        `<option value="${index}">${escapeHtmlLocal(region.name)}</option>`
      ).join("");
      regionSelect.disabled = false;

      regionSelect.addEventListener("change", () => {
        locationInput.value = "";
        const index = Number(regionSelect.value);
        const region = Number.isInteger(index) ? regions[index] : null;

        if (!region) {
          citySelect.innerHTML = '<option value="">Сначала выберите регион</option>';
          citySelect.disabled = true;
          return;
        }

        citySelect.innerHTML = '<option value="">Выберите город</option>' + region.cities.map(city =>
          `<option value="${escapeHtmlLocal(city)}">${escapeHtmlLocal(city)}</option>`
        ).join("");
        citySelect.disabled = false;
      });

      citySelect.addEventListener("change", () => {
        const index = Number(regionSelect.value);
        const region = Number.isInteger(index) ? regions[index] : null;
        const city = citySelect.value;
        locationInput.value = region && city ? `${region.name} / ${city}` : "";
      });
    } catch (error) {
      console.error("MALARS: не удалось загрузить регионы и города", error);
      regionSelect.innerHTML = '<option value="">Список регионов временно недоступен</option>';
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

    let response;
    try {
      response = await fetch(HH_AREAS_URL, {
        headers: { "HH-User-Agent": "MALARS-GROUP/1.0 (info@malars.ru)" }
      });
    } catch (_) {
      response = await fetch(HH_AREAS_URL);
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const root = await response.json();
    const areas = Array.isArray(root.areas) ? root.areas : [];

    const regions = areas.map(area => ({
      name: area.name,
      cities: [...new Set(collectAreaLeaves(area))].sort((a, b) => a.localeCompare(b, "ru"))
    })).filter(region => region.name && region.cities.length)
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));

    try {
      localStorage.setItem(AREA_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), regions }));
    } catch (_) {}

    return regions;
  }

  function collectAreaLeaves(area) {
    const children = Array.isArray(area?.areas) ? area.areas : [];
    if (!children.length) return area?.name ? [area.name] : [];
    return children.flatMap(collectAreaLeaves);
  }

  function attachRussianPhoneMask(input) {
    const refreshValidity = () => {
      if (!input.value) {
        input.setCustomValidity("");
        return;
      }
      input.setCustomValidity(
        PHONE_PATTERN.test(input.value) ? "" : "Введите номер в формате +7 (999) 999-99-99."
      );
    };

    input.addEventListener("focus", () => {
      if (!input.value) input.value = "+7 ";
    });

    input.addEventListener("input", () => {
      input.value = formatRussianPhone(input.value);
      refreshValidity();
    });

    input.addEventListener("blur", () => {
      if (input.value === "+7 ") input.value = "";
      refreshValidity();
    });
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
      if (!input.value) {
        input.setCustomValidity("");
        return true;
      }
      const valid = EMAIL_PATTERN.test(input.value.trim());
      input.setCustomValidity(valid ? "" : "Введите корректный email, например name@company.ru.");
      return valid;
    };

    input.addEventListener("input", validate);
    input.addEventListener("blur", validate);
  }

  function validatePartnerIdentityStep() {
    const form = document.getElementById("partnerFormV2");
    if (!form) return true;

    const org = form.querySelector('input[name="orgForm"]:checked')?.value || "";
    const company = document.getElementById("companyName");
    const inn = document.getElementById("inn");
    const contactName = document.getElementById("contactName");
    const phone = document.getElementById("phone");
    const email = document.getElementById("email");

    if (!org) return showPartnerError("Выберите организационную форму.");

    if (company?.required && !company.value.trim()) {
      company.focus();
      return showPartnerError("Укажите название компании или команды.");
    }

    if (inn && !validateInnField(inn, org)) {
      inn.focus();
      const expected = org === "ООО" ? 10 : 12;
      return showPartnerError(`Укажите корректный ИНН: ${expected} цифр.`);
    }

    if (!contactName?.value.trim()) {
      contactName?.focus();
      return showPartnerError("Укажите контактное лицо.");
    }

    if (!phone || !PHONE_PATTERN.test(phone.value)) {
      phone?.focus();
      return showPartnerError("Введите телефон в формате +7 (999) 999-99-99.");
    }

    if (!email || !EMAIL_PATTERN.test(email.value.trim())) {
      email?.focus();
      return showPartnerError("Введите корректный email.");
    }

    return true;
  }

  function validateInnField(inn, org) {
    const digits = inn.value.replace(/\D/g, "");
    const required = ["ООО", "ИП", "Самозанятый"].includes(org);
    if (!digits && !required) {
      inn.setCustomValidity("");
      return true;
    }

    const expected = org === "ООО" ? 10 : 12;
    const valid = digits.length === expected;
    inn.setCustomValidity(valid ? "" : `ИНН должен содержать ${expected} цифр.`);
    return valid;
  }

  function showPartnerError(message) {
    const form = document.getElementById("partnerFormV2");
    const box = form?.querySelector(".wizard-error");
    if (box) {
      box.textContent = message;
      box.hidden = false;
    }
    return false;
  }

  function enhancePartnerWizard() {
    const form = document.getElementById("partnerFormV2");
    if (!form || typeof validateStep !== "function") return;

    const steps = [...form.querySelectorAll(".wizard-step")];
    const indicators = [...form.querySelectorAll(".wizard-progress-item")];
    if (!steps.length || indicators.length !== steps.length) return;

    let currentStep = Math.max(0, steps.findIndex(step => !step.hidden));
    let maxUnlockedStep = currentStep;

    const validateCurrentStep = index => {
      if (index === 0 && !validatePartnerIdentityStep()) return false;
      return validateStep(index);
    };

    const showStep = (index, scroll = true) => {
      if (index < 0 || index >= steps.length) return;
      currentStep = index;

      steps.forEach((step, i) => {
        step.hidden = i !== index;
      });

      indicators.forEach((item, i) => {
        const unlocked = i <= maxUnlockedStep;
        item.classList.toggle("active", i === index);
        item.classList.toggle("done", i < maxUnlockedStep && i !== index);
        item.classList.toggle("unlocked", unlocked);
        item.classList.toggle("locked", !unlocked);
        item.setAttribute("aria-current", i === index ? "step" : "false");
        item.setAttribute("aria-disabled", unlocked ? "false" : "true");
        item.tabIndex = unlocked ? 0 : -1;
        item.title = unlocked ? "Перейти к этому шагу" : "Сначала заполните предыдущие шаги";
      });

      const progress = form.querySelector(".wizard-progress-bar span");
      if (progress) progress.style.width = `${((index + 1) / steps.length) * 100}%`;

      if (scroll) form.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const goToIndicator = targetIndex => {
      if (targetIndex > maxUnlockedStep || targetIndex === currentStep) return;
      if (targetIndex > currentStep && !validateCurrentStep(currentStep)) return;
      showStep(targetIndex);
    };

    indicators.forEach((item, index) => {
      item.setAttribute("role", "button");
      item.addEventListener("click", () => goToIndicator(index));
      item.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToIndicator(index);
        }
      });
    });

    form.querySelectorAll(".wizard-next").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();

        if (!validateCurrentStep(currentStep)) return;
        if (currentStep >= steps.length - 1) return;

        maxUnlockedStep = Math.max(maxUnlockedStep, currentStep + 1);
        showStep(currentStep + 1);
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
        if (!validateCurrentStep(i)) {
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

  function addUpgradeStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .brand-mark {
        width: 42px !important;
        height: 42px !important;
        padding: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        overflow: visible !important;
      }
      .brand-mark img { display:block; width:100%; height:100%; object-fit:contain; }
      .brand { white-space: nowrap; }

      .mobile-menu-toggle {
        display:none;
        width:44px;
        height:44px;
        padding:10px;
        margin-left:auto;
        border:1px solid var(--line);
        border-radius:12px;
        background:#fff;
        cursor:pointer;
      }
      .mobile-menu-toggle span {
        display:block;
        width:100%;
        height:2px;
        margin:4px 0;
        border-radius:3px;
        background:var(--text);
        transition:transform .18s ease, opacity .18s ease;
      }
      .mobile-menu-toggle.open span:nth-child(1) { transform:translateY(6px) rotate(45deg); }
      .mobile-menu-toggle.open span:nth-child(2) { opacity:0; }
      .mobile-menu-toggle.open span:nth-child(3) { transform:translateY(-6px) rotate(-45deg); }
      .mobile-nav-panel {
        position:absolute;
        top:100%;
        left:0;
        right:0;
        z-index:25;
        border-top:1px solid var(--line);
        border-bottom:1px solid var(--line);
        background:rgba(245,246,243,.98);
        box-shadow:0 18px 38px rgba(15,20,15,.12);
      }
      .mobile-nav-panel[hidden] { display:none !important; }
      .mobile-nav-inner { display:flex; flex-direction:column; padding-top:14px; padding-bottom:18px; }
      .mobile-nav-link { padding:14px 4px; border-bottom:1px solid var(--line); font-weight:700; }
      .mobile-nav-cta { margin-top:16px; }
      body.mobile-menu-open { overflow:hidden; }

      .client-location-fields { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
      .client-location-fields > label { margin-bottom:16px; }

      .wizard-progress-item {
        transition:transform .15s ease, box-shadow .15s ease, opacity .15s ease;
        user-select:none;
      }
      .wizard-progress-item.unlocked { cursor:pointer; }
      .wizard-progress-item.unlocked:hover:not(.active) {
        transform:translateY(-1px);
        box-shadow:0 4px 12px rgba(0,0,0,.08);
      }
      .wizard-progress-item.unlocked:focus-visible { outline:2px solid #111; outline-offset:2px; }
      .wizard-progress-item.locked { cursor:not-allowed; opacity:.55; }

      .form-panel .choice-chip {
        position:relative;
        display:flex !important;
        align-items:center !important;
        gap:11px;
        min-height:58px;
        margin:0 !important;
        padding:12px 14px;
        border:1px solid var(--line);
        border-radius:14px;
        background:#fff;
        color:var(--text);
        font-size:13px !important;
        font-weight:650 !important;
        line-height:1.3;
        cursor:pointer;
      }
      .form-panel .choice-chip input[type="checkbox"] {
        flex:0 0 18px;
        width:18px !important;
        height:18px !important;
        min-width:18px;
        margin:0 !important;
        padding:0 !important;
        align-self:center !important;
      }
      .form-panel .choice-chip span {
        display:flex;
        align-items:center;
        min-height:22px;
      }
      .form-panel .choice-chip:has(input:checked) {
        background:#efffcf;
        border-color:#9fbd68;
      }

      @media (max-width:900px) {
        .nav .button-small { display:none !important; }
        .mobile-menu-toggle { display:block; }
      }
      @media (max-width:640px) {
        .brand { font-size:13px; gap:7px; }
        .brand-mark { width:36px !important; height:36px !important; }
        .client-location-fields { grid-template-columns:1fr; gap:0; }
      }
    `;
    document.head.appendChild(style);
  }

  function escapeHtmlLocal(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();