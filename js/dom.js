/*
 * MALARS DOM integration layer
 * MVP migration stage.
 * Keeps page markup wiring separate from validation and data layers.
 */
(() => {
  const state = {
    step: 0,
    selectedWorks: {},
    selectedRegions: [],
    initialized: false
  };

  function bindValidation() {
    document.querySelectorAll('input[type="tel"]').forEach((input) => {
      window.MalarsForms?.attachPhoneMask(input);
    });

    document.querySelectorAll('input[type="email"]').forEach((input) => {
      window.MalarsForms?.attachEmailValidation(input);
    });
  }

  function saveWorkState() {
    document.querySelectorAll('[data-work-group]').forEach((group) => {
      const key = group.dataset.workGroup;
      state.selectedWorks[key] = [...group.querySelectorAll('input[type="checkbox"]:checked')]
        .map((item) => item.value);
    });
  }

  function restoreWorkState() {
    document.querySelectorAll('[data-work-group]').forEach((group) => {
      const values = state.selectedWorks[group.dataset.workGroup] || [];
      group.querySelectorAll('input[type="checkbox"]').forEach((item) => {
        item.checked = values.includes(item.value);
      });
    });
  }

  function initWizard() {
    const steps = [...document.querySelectorAll('.wizard-step')];
    const nextButtons = document.querySelectorAll('.wizard-next');
    const backButtons = document.querySelectorAll('.wizard-back');

    if (!steps.length) return;

    const showStep = (index) => {
      saveWorkState();
      state.step = Math.max(0, Math.min(index, steps.length - 1));
      steps.forEach((step, i) => {
        step.hidden = i !== state.step;
      });
      restoreWorkState();
    };

    nextButtons.forEach((button) => {
      button.addEventListener('click', () => showStep(state.step + 1));
    });

    backButtons.forEach((button) => {
      button.addEventListener('click', () => showStep(state.step - 1));
    });
  }

  function init() {
    if (state.initialized) return;
    state.initialized = true;
    bindValidation();
    initWizard();
  }

  window.MalarsDom = {
    version: "20260904-3",
    state,
    init
  };
})();
