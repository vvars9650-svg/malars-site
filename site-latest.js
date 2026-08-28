(() => {
  const PHONE_PATTERN = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const HH_AREAS_URL = "https://api.hh.ru/areas/113?locale=RU";
  const AREA_CACHE_KEY = "malars-group-russia-areas-v3";
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const MAX_FILES_TOTAL = 25 * 1024 * 1024;
  const selectedWorks = new Set();
  let selectedClientFiles = [];

  window.MalarsLatest = { beforeCore, afterCore };

  function beforeCore() {
    patchPartnerIdentityMarkup();
    patchGeographyMarkup();
    addContacts();
  }

  function afterCore() {
    initClientEnhancements();
    initPartnerIdentity();
    initRegionCityPair("baseRegion", "baseCity", null, false);
    addOpo();
    preserveWorkSelections();
    initNationwide();
    initWizard();
    installClientSubmitHandler();
  }

  function patchPartnerIdentityMarkup() {
    const form = document.getElementById("partnerFormV2");
    const step = form?.querySelectorAll(".wizard-step")?.[0];
    if (!step) return;

    step.innerHTML = `
      <h3>О вас</h3>
      <div class="field-title">Организационная форма</div>
      <div class="choice-grid org-form-grid">
        <label class="choice-card"><input type="radio" name="orgForm" value="ПАО"><span>ПАО</span></label>
        <label class="choice-card"><input type="radio" name="orgForm" value="АО"><span>АО</span></label>
        <label class="choice-card"><input type="radio" name="orgForm" value="ООО"><span>ООО</span></label>
        <label class="choice-card"><input type="radio" name="orgForm" value="ИП"><span>ИП</span></label>
        <label class="choice-card"><input type="radio" name="orgForm" value="Бригада"><span>Бригада</span></label>
        <label class="choice-card"><input type="radio" name="orgForm" value="Самозанятый"><span>Самозанятый</span></label>
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
      <div class="wizard-buttons"><button type="button" class="button wizard-next">Далее</button></div>
    `;
  }

  function patchGeographyMarkup() {
    const form = document.getElementById("partnerFormV2");
    const step = form?.querySelectorAll(".wizard-step")?.[2];
    const block = step?.querySelector(".geography-main");
    if (block) block.id = "baseGeographyFields";
  }

  function addContacts() {
    const navLinks = document.querySelector(".nav-links");
    if (navLinks && !navLinks.querySelector('a[href="#contacts"]')) {
      const link = document.createElement("a");
      link.href = "#contacts";
      link.textContent = "Контакты";
      navLinks.appendChild(link);
    }

    const mobileInner = document.querySelector(".mobile-nav-inner");
    if (mobileInner && !mobileInner.querySelector('a[href="#contacts"]')) {
      const cta = mobileInner.querySelector(".mobile-nav-cta");
      const link = document.createElement("a");
      link.href = "#contacts";
      link.textContent = "Контакты";
      link.className = "mobile-nav-link";
      link.addEventListener("click", () => {
        document.querySelector(".mobile-menu-toggle")?.click();
      });
      if (cta) mobileInner.insertBefore(link, cta);
      else mobileInner.appendChild(link);
    }

    if (!document.getElementById("contacts")) {
      const section = document.createElement("section");
      section.id = "contacts";
      section.className = "section contacts-section";
      section.innerHTML = `
        <div class="container contacts-grid">
          <div>
            <div class="eyebrow">Контакты</div>
            <h2>Связаться с МАЛАРС-ГРУПП</h2>
            <p>По задачам, подрядчикам и рабочим вопросам.</p>
          </div>
          <div class="contacts-list">
            <a href="tel:+79898080104">+7 989 808-01-04</a>
            <a href="tel:+79898240321">+7 989 824-03-21</a>
          </div>
        </div>
      `;
      const finalCta = document.querySelector(".final-cta");
      if (finalCta) finalCta.insertAdjacentElement("beforebegin", section);
      else document.querySelector("main")?.appendChild(section);
    }

    const footer = document.querySelector(".footer-row");
    if (footer && !footer.querySelector(".footer-contacts")) {
      const block = document.createElement("div");
      block.className = "footer-contacts";
      block.innerHTML = `
        <a href="tel:+79898080104">+7 989 808-01-04</a>
        <a href="tel:+79898240321">+7 989 824-03-21</a>
      `;
      footer.appendChild(block);
    }

    const style = document.createElement("style");
    style.textContent = `
      .contacts-section{background:var(--surface)}
      .contacts-grid{display:grid;grid-template-columns:1fr 1fr;gap:50px;align-items:end}
      .contacts-grid h2{font-size:clamp(34px,4.2vw,56px);line-height:1.05;letter-spacing:-.045em;margin-bottom:14px}
      .contacts-grid p{color:var(--muted);margin-bottom:0}
      .contacts-list{display:grid;gap:12px;justify-items:end}
      .contacts-list a{font-size:clamp(22px,3vw,34px);font-weight:800;letter-spacing:-.03em}
      .footer-row{grid-template-columns:1fr 1fr auto auto!important}
      .footer-contacts{display:grid;gap:3px;text-align:right}
      .footer-contacts a{font-weight:700;color:var(--text)}
      #baseGeographyFields[hidden]{display:none!important}
      @media(max-width:900px){
        .contacts-grid{grid-template-columns:1fr;gap:24px}
        .contacts-list{justify-items:start}
        .footer-row{grid-template-columns:1fr!important}
        .footer-contacts{text-align:left}
      }
      @media(max-width:640px){.contacts-list a{font-size:24px}}
    `;
    document.head.appendChild(style);
  }

  function initClientEnhancements() {
    const phone = document.getElementById("clientPhone");
    const email = document.getElementById("clientEmail");
    if (phone) attachPhoneMask(phone);
    if (email) attachEmailValidation(email);
    initRegionCityPair("clientRegion", "clientCity", "clientLocation", true);
    initClientFiles();
  }

  function initPartnerIdentity() {
    const form = document.getElementById("partnerFormV2");
    if (!form) return;

    const participant = document.getElementById("backendParticipantType");
    const legal = document.getElementById("backendLegalForm");
    const company = document.getElementById("companyName");
    const inn = document.getElementById("inn");
    const phone = document.getElementById("phone");
    const email = document.getElementById("email");

    if (phone) attachPhoneMask(phone);
    if (email) attachEmailValidation(email);

    const map = {
      "ПАО": ["Компания", "ПАО", 10, true, true],
      "АО": ["Компания", "АО", 10, true, true],
      "ООО": ["Компания", "ООО", 10, true, true],
      "ИП": ["ИП", "ИП", 12, true, true],
      "Бригада": ["Бригада", "Бригада", 12, false, true],
      "Самозанятый": ["Самозанятый", "Самозанятый", 12, true, false],
      "Частный специалист": ["Частный специалист", "Частный специалист", 12, false, false]
    };

    const sync = value => {
      const item = map[value];
      if (!item) return;
      participant.value = item[0];
      legal.value = item[1];
      if (inn) {
        inn.value = inn.value.replace(/\D/g, "").slice(0, item[2]);
        inn.maxLength = item[2];
        inn.placeholder = `${item[2]} цифр`;
        inn.required = item[3];
        inn.dataset.expectedLength = String(item[2]);
      }
      if (company) company.required = item[4];
    };

    form.querySelectorAll('input[name="orgForm"]').forEach(input => {
      input.addEventListener("change", () => sync(input.value));
    });

    inn?.addEventListener("input", () => {
      const max = Number(inn.dataset.expectedLength || 12);
      inn.value = inn.value.replace(/\D/g, "").slice(0, max);
      validateInn(inn, form.querySelector('input[name="orgForm"]:checked')?.value || "");
    });
  }

  async function initRegionCityPair(regionId, cityId, hiddenId, isClient) {
    const region = document.getElementById(regionId);
    const city = document.getElementById(cityId);
    const hidden = hiddenId ? document.getElementById(hiddenId) : null;
    if (!region || !city) return;

    city.disabled = true;
    if (isClient) {
      region.disabled = true;
      region.innerHTML = '<option value="">Загрузка регионов...</option>';
    }

    try {
      const areas = await loadAreas();
      if (isClient) {
        region.innerHTML = '<option value="">Выберите регион</option>' + REGIONS.map(([code, name]) =>
          `<option value="${escapeHtml(code)}">${escapeHtml(name)}</option>`
        ).join("");
        region.disabled = false;
      }

      const populate = () => {
        if (hidden) hidden.value = "";
        const code = region.value;
        const name = region.options[region.selectedIndex]?.text?.trim() || "";

        if (!code || code === "RU-ALL") {
          if (code === "RU-ALL") {
            city.disabled = false;
            city.innerHTML = '<option value="Вся Россия">Вся Россия</option>';
            city.value = "Вся Россия";
          } else {
            city.disabled = true;
            city.innerHTML = '<option value="">Сначала выберите регион</option>';
          }
          return;
        }

        const cities = findCities(name, areas);
        city.innerHTML = '<option value="">Выберите город</option>' + cities.map(value =>
          `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`
        ).join("");
        city.disabled = !cities.length;
      };

      region.addEventListener("change", populate);
      city.addEventListener("change", () => {
        if (!hidden) return;
        const regionNameValue = region.options[region.selectedIndex]?.text?.trim() || "";
        hidden.value = regionNameValue && city.value ? `${regionNameValue} / ${city.value}` : "";
      });
    } catch (error) {
      console.error("MALARS: города/регионы", error);
      if (isClient) region.innerHTML = '<option value="">Список регионов временно недоступен</option>';
      city.innerHTML = '<option value="">Список городов временно недоступен</option>';
    }
  }

  async function loadAreas() {
    try {
      const cached = JSON.parse(localStorage.getItem(AREA_CACHE_KEY) || "null");
      if (cached?.savedAt && Date.now() - cached.savedAt < 2592000000 && Array.isArray(cached.regions)) {
        return cached.regions;
      }
    } catch (_) {}

    const response = await fetch(HH_AREAS_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const root = await response.json();
    const regions = (root.areas || []).map(area => ({
      name: area.name,
      cities: ["Москва", "Санкт-Петербург", "Севастополь"].includes(area.name)
        ? [area.name]
        : [...new Set(collectLeaves(area))].filter(Boolean).sort((a, b) => a.localeCompare(b, "ru"))
    })).filter(item => item.name && item.cities.length);

    try { localStorage.setItem(AREA_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), regions })); } catch (_) {}
    return regions;
  }

  function collectLeaves(area) {
    const children = Array.isArray(area?.areas) ? area.areas : [];
    if (!children.length) return area?.name ? [area.name] : [];
    return children.flatMap(collectLeaves);
  }

  function findCities(name, areas) {
    const target = normalize(name);
    const found = areas.find(item => normalize(item.name) === target) ||
      areas.find(item => normalize(item.name).includes(target) || target.includes(normalize(item.name)));
    if (found) return found.cities;
    if (["Москва", "Санкт-Петербург", "Севастополь"].includes(name)) return [name];
    return [];
  }

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/ё/g, "е").replace(/[—–-]/g, " ").replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  }

  function addOpo() {
    const box = document.getElementById("objectTypes");
    if (!box || box.querySelector('input[value="OBJ-15"]')) return;
    const label = document.createElement("label");
    label.className = "choice-card compact";
    label.innerHTML = '<input type="checkbox" class="object-checkbox" value="OBJ-15"><span>Опасные производственные объекты (ОПО)</span>';
    box.appendChild(label);
  }

  function preserveWorkSelections() {
    const categories = document.getElementById("workCategories");
    const details = document.getElementById("workDetails");
    if (!categories || !details) return;

    details.addEventListener("change", event => {
      const box = event.target.closest?.(".work-checkbox");
      if (!box) return;
      if (box.checked) selectedWorks.add(box.value);
      else selectedWorks.delete(box.value);
    });

    categories.addEventListener("change", event => {
      if (!event.target.classList.contains("category-checkbox")) return;
      details.querySelectorAll(".work-checkbox:checked").forEach(box => selectedWorks.add(box.value));
      setTimeout(() => {
        details.querySelectorAll(".work-checkbox").forEach(box => { box.checked = selectedWorks.has(box.value); });
        updateSelectAll(details);
      }, 0);
    }, true);

    details.addEventListener("click", event => {
      if (!event.target.closest?.(".select-all-works")) return;
      setTimeout(() => {
        details.querySelectorAll(".work-checkbox").forEach(box => {
          if (box.checked) selectedWorks.add(box.value);
          else selectedWorks.delete(box.value);
        });
        updateSelectAll(details);
      }, 0);
    });
  }

  function updateSelectAll(details) {
    details.querySelectorAll(".work-group").forEach(group => {
      const boxes = [...group.querySelectorAll(".work-checkbox")];
      const button = group.querySelector(".select-all-works");
      if (button) button.textContent = boxes.length && boxes.every(box => box.checked) ? "Снять всё" : "Выбрать всё";
    });
  }

  function initNationwide() {
    const nationwide = document.getElementById("nationwide");
    const block = document.getElementById("baseGeographyFields");
    const region = document.getElementById("baseRegion");
    const city = document.getElementById("baseCity");
    if (!nationwide || !block || !region || !city) return;

    const originalRegionName = typeof regionName === "function" ? regionName : null;
    if (originalRegionName) {
      window.regionName = code => code === "RU-ALL" ? "Вся Россия" : originalRegionName(code);
    }

    const apply = checked => {
      block.hidden = checked;
      region.required = !checked;
      city.required = !checked;

      if (checked) {
        if (!region.querySelector('option[value="RU-ALL"]')) {
          const option = document.createElement("option");
          option.value = "RU-ALL";
          option.textContent = "Вся Россия";
          region.appendChild(option);
        }
        region.value = "RU-ALL";
        city.disabled = false;
        city.innerHTML = '<option value="Вся Россия">Вся Россия</option>';
        city.value = "Вся Россия";
      } else {
        region.querySelector('option[value="RU-ALL"]')?.remove();
        region.value = "";
        city.disabled = true;
        city.innerHTML = '<option value="">Сначала выберите регион</option>';
      }
    };

    nationwide.addEventListener("change", () => apply(nationwide.checked));
    apply(nationwide.checked);
  }

  function initWizard() {
    const form = document.getElementById("partnerFormV2");
    if (!form || typeof validateStep !== "function") return;

    const steps = [...form.querySelectorAll(".wizard-step")];
    const indicators = [...form.querySelectorAll(".wizard-progress-item")];
    let current = Math.max(0, steps.findIndex(step => !step.hidden));
    let unlocked = current;

    const validate = index => {
      if (index === 0) return validateIdentity();
      if (index === 2) return validateObjects();
      return validateStep(index);
    };

    const show = (index, scroll = true) => {
      current = index;
      steps.forEach((step, i) => step.hidden = i !== index);
      indicators.forEach((item, i) => {
        const open = i <= unlocked;
        item.classList.toggle("active", i === index);
        item.classList.toggle("done", i < unlocked && i !== index);
        item.classList.toggle("unlocked", open);
        item.classList.toggle("locked", !open);
        item.tabIndex = open ? 0 : -1;
        item.setAttribute("aria-disabled", open ? "false" : "true");
      });
      const progress = form.querySelector(".wizard-progress-bar span");
      if (progress) progress.style.width = `${((index + 1) / steps.length) * 100}%`;
      if (scroll) form.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    indicators.forEach((item, index) => {
      item.setAttribute("role", "button");
      item.addEventListener("click", () => { if (index <= unlocked && index !== current) show(index); });
      item.addEventListener("keydown", event => {
        if ((event.key === "Enter" || event.key === " ") && index <= unlocked) {
          event.preventDefault(); show(index);
        }
      });
    });

    form.querySelectorAll(".wizard-next").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!validate(current)) return;
        unlocked = Math.max(unlocked, Math.min(current + 1, steps.length - 1));
        if (current < steps.length - 1) show(current + 1);
      }, true);
    });

    form.querySelectorAll(".wizard-back").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (current > 0) show(current - 1);
      }, true);
    });

    form.addEventListener("submit", event => {
      for (let i = 0; i < steps.length; i += 1) {
        if (!validate(i)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          unlocked = Math.max(unlocked, i);
          show(i);
          return;
        }
      }
    }, true);

    show(current, false);
  }

  function validateIdentity() {
    const form = document.getElementById("partnerFormV2");
    const org = form?.querySelector('input[name="orgForm"]:checked')?.value || "";
    const company = document.getElementById("companyName");
    const inn = document.getElementById("inn");
    const contact = document.getElementById("contactName");
    const phone = document.getElementById("phone");
    const email = document.getElementById("email");

    if (!org) return partnerError("Выберите организационную форму.");
    if (company?.required && !company.value.trim()) { company.focus(); return partnerError("Укажите название компании или команды."); }
    if (inn && !validateInn(inn, org)) {
      inn.focus();
      return partnerError(`Укажите корректный ИНН: ${["ПАО","АО","ООО"].includes(org) ? 10 : 12} цифр.`);
    }
    if (!contact?.value.trim()) { contact?.focus(); return partnerError("Укажите контактное лицо."); }
    if (!phone || !PHONE_PATTERN.test(phone.value)) { phone?.focus(); return partnerError("Введите телефон в формате +7 (999) 999-99-99."); }
    if (!email || !EMAIL_PATTERN.test(email.value.trim())) { email?.focus(); return partnerError("Введите корректный email."); }
    clearPartnerError();
    return true;
  }

  function validateObjects() {
    const form = document.getElementById("partnerFormV2");
    if (!form?.querySelector(".object-checkbox:checked")) return partnerError("Выберите хотя бы один тип объекта.");
    if (document.getElementById("nationwide")?.checked) { clearPartnerError(); return true; }

    const region = document.getElementById("baseRegion");
    const city = document.getElementById("baseCity");
    if (!region?.value) { region?.focus(); return partnerError("Выберите базовый регион или отметьте «Работаем по всей России»."); }
    if (!city?.value) { city?.focus(); return partnerError("Выберите базовый город или отметьте «Работаем по всей России»."); }
    clearPartnerError();
    return true;
  }

  function validateInn(input, org) {
    const digits = input.value.replace(/\D/g, "");
    const required = ["ПАО","АО","ООО","ИП","Самозанятый"].includes(org);
    if (!digits && !required) { input.setCustomValidity(""); return true; }
    const length = ["ПАО","АО","ООО"].includes(org) ? 10 : 12;
    const valid = digits.length === length;
    input.setCustomValidity(valid ? "" : `ИНН должен содержать ${length} цифр.`);
    return valid;
  }

  function partnerError(message) {
    const box = document.querySelector("#partnerFormV2 .wizard-error");
    if (box) { box.textContent = message; box.hidden = false; }
    return false;
  }

  function clearPartnerError() {
    const box = document.querySelector("#partnerFormV2 .wizard-error");
    if (box) { box.textContent = ""; box.hidden = true; }
  }

  function attachPhoneMask(input) {
    const validate = () => input.setCustomValidity(!input.value || PHONE_PATTERN.test(input.value) ? "" : "Введите номер в формате +7 (999) 999-99-99.");
    input.addEventListener("focus", () => { if (!input.value) input.value = "+7 "; });
    input.addEventListener("input", () => { input.value = formatPhone(input.value); validate(); });
    input.addEventListener("blur", () => { if (input.value === "+7 ") input.value = ""; validate(); });
  }

  function formatPhone(value) {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
    if (digits.startsWith("7")) digits = digits.slice(1);
    digits = digits.slice(0, 10);
    if (!digits.length) return "+7 ";
    let result = "+7";
    result += ` (${digits.slice(0, 3)}`;
    if (digits.length >= 3) result += ")";
    if (digits.length > 3) result += ` ${digits.slice(3, 6)}`;
    if (digits.length > 6) result += `-${digits.slice(6, 8)}`;
    if (digits.length > 8) result += `-${digits.slice(8, 10)}`;
    return result;
  }

  function attachEmailValidation(input) {
    const validate = () => {
      const valid = !input.value || EMAIL_PATTERN.test(input.value.trim());
      input.setCustomValidity(valid ? "" : "Введите корректный email.");
      return valid;
    };
    input.addEventListener("input", validate);
    input.addEventListener("blur", validate);
  }

  function initClientFiles() {
    const dropzone = document.getElementById("clientFilesDropzone");
    const input = document.getElementById("clientFiles");
    const picker = dropzone?.querySelector(".file-picker-button");
    if (!dropzone || !input || !picker) return;

    picker.addEventListener("click", event => { event.stopPropagation(); input.click(); });
    dropzone.addEventListener("click", event => { if (event.target !== picker) input.click(); });
    dropzone.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); input.click(); }
    });
    input.addEventListener("change", () => addFiles([...input.files]));
    ["dragenter","dragover"].forEach(type => dropzone.addEventListener(type, event => {
      event.preventDefault(); dropzone.classList.add("dragging");
    }));
    ["dragleave","drop"].forEach(type => dropzone.addEventListener(type, event => {
      event.preventDefault(); dropzone.classList.remove("dragging");
    }));
    dropzone.addEventListener("drop", event => addFiles([...event.dataTransfer.files]));
  }

  function addFiles(files) {
    const seen = new Set(selectedClientFiles.map(fileKey));
    files.forEach(file => { if (!seen.has(fileKey(file))) selectedClientFiles.push(file); });
    renderFiles();
  }

  function fileKey(file) { return `${file.name}:${file.size}:${file.lastModified}`; }

  function renderFiles() {
    const list = document.getElementById("clientFileList");
    if (!list) return;
    list.innerHTML = selectedClientFiles.map((file, index) => `
      <div class="file-row">
        <div><strong>${escapeHtml(file.name)}</strong><span>${formatBytes(file.size)}</span></div>
        <button type="button" class="file-remove" data-index="${index}" aria-label="Удалить файл">×</button>
      </div>
    `).join("");
    list.querySelectorAll(".file-remove").forEach(button => button.addEventListener("click", () => {
      selectedClientFiles.splice(Number(button.dataset.index), 1); renderFiles();
    }));
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / 1048576).toFixed(1)} МБ`;
  }

  function installClientSubmitHandler() {
    const form = document.getElementById("clientForm");
    if (!form || typeof postJson !== "function") return;

    form.addEventListener("submit", async event => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const status = form.querySelector(".form-status");
      const button = form.querySelector(".form-submit");
      const name = form.querySelector('input[name="name"]');
      const phone = document.getElementById("clientPhone");
      const email = document.getElementById("clientEmail");
      const region = document.getElementById("clientRegion");
      const city = document.getElementById("clientCity");
      const task = form.querySelector('textarea[name="task"]');
      const consent = form.querySelector('input[name="consent"]');

      status.textContent = "";
      if (!name?.value.trim()) return clientError("Укажите, как к вам обращаться.");
      if (!phone || !PHONE_PATTERN.test(phone.value)) return clientError("Введите телефон в формате +7 (999) 999-99-99.", phone);
      if (!email || !EMAIL_PATTERN.test(email.value.trim())) return clientError("Введите корректный email.", email);
      if (!region?.value) return clientError("Выберите регион.", region);
      if (!city?.value) return clientError("Выберите город.", city);
      if (!task?.value.trim()) return clientError("Опишите, что нужно сделать.", task);
      if (!consent?.checked) return clientError("Подтвердите согласие на обработку данных.");

      const total = selectedClientFiles.reduce((sum, file) => sum + file.size, 0);
      if (selectedClientFiles.some(file => file.size > MAX_FILE_SIZE)) return clientError("Размер одного файла не должен превышать 10 МБ.");
      if (total > MAX_FILES_TOTAL) return clientError("Общий размер файлов не должен превышать 25 МБ.");

      if (button) { button.disabled = true; button.textContent = "Отправляем…"; }

      try {
        const files = await Promise.all(selectedClientFiles.map(filePayload));
        const regionNameValue = region.options[region.selectedIndex]?.text?.trim() || "";
        const result = await postJson({
          formType: "client",
          name: name.value.trim(),
          contact: phone.value,
          email: email.value.trim(),
          region: regionNameValue,
          cityName: city.value,
          city: `${regionNameValue} / ${city.value}`,
          task: task.value.trim(),
          deadline: form.querySelector('input[name="deadline"]')?.value.trim() || "",
          page: window.location.href,
          submittedAt: new Date().toISOString(),
          files
        });
        if (!result.ok) throw new Error(result.error || "Ошибка отправки");

        form.reset();
        selectedClientFiles = [];
        renderFiles();
        city.disabled = true;
        city.innerHTML = '<option value="">Сначала выберите регион</option>';
        status.textContent = files.length ? "Готово. Заявка и документы отправлены." : "Готово. Заявка отправлена.";
      } catch (error) {
        console.error(error);
        status.textContent = "Не удалось отправить данные. Проверьте корректность заполнения полей.";
      } finally {
        if (button) { button.disabled = false; button.textContent = "Отправить задачу"; }
      }

      function clientError(message, field) {
        status.textContent = message;
        field?.focus();
        return false;
      }
    }, true);
  }

  function filePayload(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const value = String(reader.result || "");
        resolve({
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          data: value.includes(",") ? value.split(",")[1] : value
        });
      };
      reader.onerror = () => reject(reader.error || new Error("Не удалось прочитать файл"));
      reader.readAsDataURL(file);
    });
  }

  function escapeHtml(value) {
    return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }
})();