(() => {
  const UPGRADE_VERSION = "20260828-2";
  const LATEST_VERSION = "20260828-3";
  const CORE_VERSION = "20260827-1";

  const loadCore = (useLatest) => {
    const core = document.createElement("script");
    core.src = `script-core.js?v=${CORE_VERSION}`;
    core.async = false;
    core.onload = () => {
      try {
        if (useLatest && window.MalarsLatest?.afterCore) {
          window.MalarsLatest.afterCore();
        } else {
          window.MalarsUpgrade?.afterCore?.();
        }
      } catch (error) {
        console.error("MALARS: ошибка инициализации сайта", error);
      }
    };
    core.onerror = () => console.error("MALARS: не удалось загрузить основной скрипт сайта");
    document.head.appendChild(core);
  };

  const upgrade = document.createElement("script");
  upgrade.src = `site-upgrade.js?v=${UPGRADE_VERSION}`;
  upgrade.async = false;
  upgrade.onload = () => {
    try {
      window.MalarsUpgrade?.beforeCore?.();
    } catch (error) {
      console.error("MALARS: ошибка предварительного обновления интерфейса", error);
    }

    const latest = document.createElement("script");
    latest.src = `site-latest.js?v=${LATEST_VERSION}`;
    latest.async = false;
    latest.onload = () => {
      try {
        window.MalarsLatest?.beforeCore?.();
        loadCore(true);
      } catch (error) {
        console.error("MALARS: ошибка последней ревизии интерфейса", error);
        loadCore(false);
      }
    };
    latest.onerror = () => {
      console.error("MALARS: не удалось загрузить последнюю ревизию сайта");
      loadCore(false);
    };
    document.head.appendChild(latest);
  };
  upgrade.onerror = () => console.error("MALARS: не удалось загрузить обновление сайта");
  document.head.appendChild(upgrade);
})();