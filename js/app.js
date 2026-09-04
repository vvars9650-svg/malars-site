/*
 * MALARS frontend application entry point
 * Clean MVP migration. Not connected to production until the migration switch.
 */
(() => {
  const VERSION = "20260904-4";

  function diagnostics() {
    const data = window.MalarsData;
    const forms = window.MalarsForms;
    const dom = window.MalarsDom;

    const checks = {
      dataLayer: !!data,
      formsLayer: !!forms,
      domLayer: !!dom,
      scriptUrl: !!data?.config?.scriptUrl,
      phoneValidation: !!forms?.validatePhone || !!forms?.PHONE_PATTERN,
      orgRules: Object.keys(forms?.ORG_RULES || {}).length === 7,
      objectTypes: Array.isArray(data?.objectTypes) && data.objectTypes.length >= 15,
      contacts: Array.isArray(data?.contacts) && data.contacts.length === 2
    };

    return {
      version: VERSION,
      ok: Object.values(checks).every(Boolean),
      checks
    };
  }

  function init() {
    const result = diagnostics();

    if (window.MalarsDom?.init) {
      window.MalarsDom.init();
    }

    window.MalarsApp.initialized = true;
    window.MalarsApp.lastDiagnostics = result;
    document.documentElement.dataset.malarsApp = result.ok ? "ready" : "migration-incomplete";

    if (!result.ok) console.warn("MALARS migration diagnostics", result.checks);
  }

  window.MalarsApp = {
    version: VERSION,
    initialized: false,
    lastDiagnostics: null,
    diagnostics
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
