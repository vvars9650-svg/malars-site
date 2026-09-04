/*
 * MALARS frontend application entry point
 * MVP migration layer.
 */

(() => {
  window.MalarsApp = {
    version: "20260904-2",
    initialized: false
  };

  function init() {
    window.MalarsForms?.init();
    window.MalarsApp.initialized = true;
    document.documentElement.dataset.malarsApp = "ready";
  }

  window.addEventListener("DOMContentLoaded", init);
})();
