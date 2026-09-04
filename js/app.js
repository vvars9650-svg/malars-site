/*
 * MALARS frontend application entry point
 *
 * MVP migration layer.
 *
 * Production is still running through the legacy script chain.
 * This file becomes the future single initialization point after testing.
 */

(() => {
  window.MalarsApp = {
    version: "20260904-1",
    initialized: false
  };

  function init() {
    window.MalarsApp.initialized = true;
    document.documentElement.dataset.malarsApp = "ready";
  }

  window.addEventListener("DOMContentLoaded", init);
})();
