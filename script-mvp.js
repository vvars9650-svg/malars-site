/*
 * MALARS MVP migration loader
 * Test only. Does not replace production chain.
 */
(() => {
  const files = [
    "js/data.js",
    "js/forms.js",
    "js/dom.js",
    "js/app.js"
  ];

  function loadNext(index) {
    if (index >= files.length) return;
    const script = document.createElement("script");
    script.src = `${files[index]}?v=20260904-mvp`;
    script.async = false;
    script.onload = () => loadNext(index + 1);
    script.onerror = () => console.error("MALARS MVP loader error", files[index]);
    document.head.appendChild(script);
  }

  loadNext(0);
})();
