/*
 * MALARS DOM integration layer
 * MVP migration stage.
 * Keeps page markup wiring separate from validation and data layers.
 */
(() => {
  window.MalarsDom = {
    version: "20260904-1",
    initialized: false,

    init() {
      if (this.initialized) return;
      this.initialized = true;

      document.querySelectorAll('input[type="tel"]').forEach((input) => {
        window.MalarsForms?.attachPhoneMask(input);
      });

      document.querySelectorAll('input[type="email"]').forEach((input) => {
        window.MalarsForms?.attachEmailValidation(input);
      });
    }
  };
})();
