/*
 * MALARS frontend forms layer
 * MVP migration stage.
 */

window.MalarsForms = {
  version: "20260904-2",
  initialized: false,

  phonePattern: /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/,
  emailPattern: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,

  validatePhone(value) {
    return this.phonePattern.test(String(value || "").trim());
  },

  validateEmail(value) {
    return this.emailPattern.test(String(value || "").trim());
  },

  init() {
    if (this.initialized) return;
    this.initialized = true;
    console.log("MALARS forms layer initialized");
  }
};
