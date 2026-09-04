/*
 * MALARS frontend forms layer
 * Clean MVP migration. Not connected to production until the migration switch.
 */
(() => {
  const PHONE_PATTERN = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const MAX_FILES_TOTAL = 25 * 1024 * 1024;

  const ORG_RULES = {
    "ПАО": { participantType: "Компания", legalForm: "ПАО", innLength: 10, innRequired: true, companyRequired: true },
    "АО": { participantType: "Компания", legalForm: "АО", innLength: 10, innRequired: true, companyRequired: true },
    "ООО": { participantType: "Компания", legalForm: "ООО", innLength: 10, innRequired: true, companyRequired: true },
    "ИП": { participantType: "ИП", legalForm: "ИП", innLength: 12, innRequired: true, companyRequired: true },
    "Бригада": { participantType: "Бригада", legalForm: "Бригада", innLength: 12, innRequired: false, companyRequired: true },
    "Самозанятый": { participantType: "Самозанятый", legalForm: "Самозанятый", innLength: 12, innRequired: true, companyRequired: false },
    "Частный специалист": { participantType: "Частный специалист", legalForm: "Частный специалист", innLength: 12, innRequired: false, companyRequired: false }
  };

  function digits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function formatRussianPhone(value) {
    let d = digits(value);
    if (d.startsWith("8")) d = `7${d.slice(1)}`;
    if (!d.startsWith("7")) d = `7${d}`;
    d = d.slice(0, 11);

    const a = d.slice(1, 4);
    const b = d.slice(4, 7);
    const c = d.slice(7, 9);
    const e = d.slice(9, 11);
    let out = "+7";
    if (a) out += ` (${a}`;
    if (a.length === 3) out += ")";
    if (b) out += ` ${b}`;
    if (c) out += `-${c}`;
    if (e) out += `-${e}`;
    return out;
  }

  function attachPhoneMask(input) {
    if (!input || input.dataset.malarsPhoneMask === "1") return;
    input.dataset.malarsPhoneMask = "1";
    input.addEventListener("input", () => {
      input.value = formatRussianPhone(input.value);
      input.setCustomValidity(input.value && !PHONE_PATTERN.test(input.value) ? "Введите телефон в формате +7 (999) 999-99-99" : "");
    });
    input.addEventListener("blur", () => {
      input.setCustomValidity(input.value && !PHONE_PATTERN.test(input.value) ? "Введите телефон в формате +7 (999) 999-99-99" : "");
    });
  }

  function attachEmailValidation(input) {
    if (!input || input.dataset.malarsEmailValidation === "1") return;
    input.dataset.malarsEmailValidation = "1";
    const validate = () => input.setCustomValidity(input.value && !EMAIL_PATTERN.test(input.value.trim()) ? "Введите корректный email" : "");
    input.addEventListener("input", validate);
    input.addEventListener("blur", validate);
  }

  function getOrgRule(orgForm) {
    return ORG_RULES[orgForm] || null;
  }

  function normalizeInn(value, orgForm) {
    const rule = getOrgRule(orgForm);
    return digits(value).slice(0, rule?.innLength || 12);
  }

  function validateInn(value, orgForm) {
    const rule = getOrgRule(orgForm);
    const inn = digits(value);
    if (!rule) return { ok: false, message: "Выберите организационную форму" };
    if (!inn && !rule.innRequired) return { ok: true, value: "" };
    if (!inn && rule.innRequired) return { ok: false, message: "Укажите ИНН" };
    if (inn.length !== rule.innLength) return { ok: false, message: `ИНН должен содержать ${rule.innLength} цифр` };
    return { ok: true, value: inn };
  }

  function validateGeography({ objectTypes = [], nationwide = false, region = "", city = "" } = {}) {
    if (!Array.isArray(objectTypes) || !objectTypes.length) {
      return { ok: false, message: "Выберите хотя бы один тип объекта" };
    }
    if (nationwide) return { ok: true };
    if (!region || !city) return { ok: false, message: "Выберите регион и город или отметьте «Работаем по всей России»" };
    return { ok: true };
  }

  function validateFiles(files) {
    const list = Array.from(files || []);
    let total = 0;
    for (const file of list) {
      if (file.size > MAX_FILE_SIZE) return { ok: false, message: `Файл «${file.name}» больше 10 МБ` };
      total += file.size;
    }
    if (total > MAX_FILES_TOTAL) return { ok: false, message: "Общий размер файлов больше 25 МБ" };
    return { ok: true, total };
  }

  async function postJson(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch (_) { throw new Error("Некорректный ответ сервера"); }
    if (!response.ok || data?.ok === false) throw new Error(data?.message || `HTTP ${response.status}`);
    return data;
  }

  window.MalarsForms = Object.freeze({
    version: "20260904-3",
    PHONE_PATTERN,
    EMAIL_PATTERN,
    MAX_FILE_SIZE,
    MAX_FILES_TOTAL,
    ORG_RULES,
    formatRussianPhone,
    attachPhoneMask,
    attachEmailValidation,
    getOrgRule,
    normalizeInn,
    validateInn,
    validateGeography,
    validateFiles,
    postJson
  });
})();
