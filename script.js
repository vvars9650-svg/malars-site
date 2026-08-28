(() => {
  const UPGRADE_VERSION = "20260828-2";
  const CORE_VERSION = "20260827-1";

  const upgrade = document.createElement("script");
  upgrade.src = `site-upgrade.js?v=${UPGRADE_VERSION}`;
  upgrade.async = false;
  upgrade.onload = () => {
    try {
      window.MalarsUpgrade?.beforeCore?.();
    } catch (error) {
      console.error("MALARS: ошибка предварительного обновления интерфейса", error);
    }

    const core = document.createElement("script");
    core.src = `script-core.js?v=${CORE_VERSION}`;
    core.async = false;
    core.onload = () => {
      try {
        window.MalarsUpgrade?.afterCore?.();
      } catch (error) {
        console.error("MALARS: ошибка инициализации обновлённого интерфейса", error);
      }
    };
    core.onerror = () => console.error("MALARS: не удалось загрузить основной скрипт сайта");
    document.head.appendChild(core);
  };
  upgrade.onerror = () => console.error("MALARS: не удалось загрузить обновление сайта");
  document.head.appendChild(upgrade);
})();