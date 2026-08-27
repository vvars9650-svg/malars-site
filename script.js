(() => {
  const CORE_VERSION = "20260827-1";

  installFriendlyFormErrors();
  addUpgradeStyles();
  upgradeBrand();
  ensureClientEmailField();

  const core = document.createElement("script");
  core.src = `script-core.js?v=${CORE_VERSION}`;
  core.async = false;
  core.onload = () => enhancePartnerWizard();
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
    const mark = document.querySelector(".brand-mark");
    if (mark) {
      mark.innerHTML = '<img src="logo.svg?v=1" alt="" aria-hidden="true">';
    }

    let favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      favicon.type = "image/svg+xml";
      document.head.appendChild(favicon);
    }
    favicon.href = "logo.svg?v=1";
  }

  function ensureClientEmailField() {
    const form = document.getElementById("clientForm");
    if (!form || form.querySelector('input[name="email"]')) return;

    const contact = form.querySelector('input[name="contact"]');
    const contactLabel = contact?.closest("label");
    if (!contactLabel) return;

    const emailLabel = document.createElement("label");
    emailLabel.innerHTML = `
      Email для коммерческого предложения
      <input name="email" type="email" placeholder="name@company.ru" autocomplete="email" required>
    `;
    contactLabel.insertAdjacentElement("afterend", emailLabel);
  }

  function enhancePartnerWizard() {
    const form = document.getElementById("partnerFormV2");
    if (!form || typeof validateStep !== "function") return;

    const steps = [...form.querySelectorAll(".wizard-step")];
    const indicators = [...form.querySelectorAll(".wizard-progress-item")];
    if (!steps.length || indicators.length !== steps.length) return;

    let currentStep = Math.max(0, steps.findIndex(step => !step.hidden));
    let maxUnlockedStep = currentStep;

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
      if (progress) {
        progress.style.width = `${((index + 1) / steps.length) * 100}%`;
      }

      if (scroll) {
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    const goToIndicator = (targetIndex) => {
      if (targetIndex > maxUnlockedStep || targetIndex === currentStep) return;

      if (targetIndex > currentStep && !validateStep(currentStep)) {
        return;
      }

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

        if (!validateStep(currentStep)) return;
        if (currentStep >= steps.length - 1) return;

        maxUnlockedStep = Math.max(maxUnlockedStep, currentStep + 1);
        showStep(currentStep + 1);
      }, true);
    });

    form.querySelectorAll(".wizard-back").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();

        if (currentStep > 0) {
          showStep(currentStep - 1);
        }
      }, true);
    });

    form.addEventListener("submit", event => {
      for (let i = 0; i < steps.length; i += 1) {
        if (!validateStep(i)) {
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

      .brand-mark img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .wizard-progress-item {
        transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease;
        user-select: none;
      }

      .wizard-progress-item.unlocked {
        cursor: pointer;
      }

      .wizard-progress-item.unlocked:hover:not(.active) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,.08);
      }

      .wizard-progress-item.unlocked:focus-visible {
        outline: 2px solid #111;
        outline-offset: 2px;
      }

      .wizard-progress-item.locked {
        cursor: not-allowed;
        opacity: .55;
      }
    `;
    document.head.appendChild(style);
  }
})();
