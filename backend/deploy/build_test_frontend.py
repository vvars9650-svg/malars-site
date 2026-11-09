"""Build an isolated static TEST frontend without changing production sources."""
from __future__ import annotations

import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / ".local-artifacts" / "test-frontend"
API_BASE_URL = "https://d5dmc1cn4hgv2sulpdpq.d8epmcec.apigw.yandexcloud.net"
TEST_ORIGIN = "https://malars-test-frontend-vl-061126-01.website.yandexcloud.net"
BUILD_TAG = "20261109-local-specializations-2"


RUNTIME = r"""(() => {
  const banner = document.createElement("aside");
  banner.setAttribute("role", "alert");
  banner.style.cssText = "position:sticky;top:0;z-index:9999;padding:14px 20px;background:#7a2e00;color:#fff;font-weight:700;text-align:center";
  banner.textContent = "ТЕСТОВЫЙ САЙТ — не вводите реальные персональные данные. Юридические документы — черновики. Используйте только синтетические данные.";
  document.body.prepend(banner);

  const bind = () => {
    const forms = [
      ["#clientForm", "Даю согласие на обработку моих персональных данных на условиях Согласия на обработку персональных данных заказчика МАЛАРС версии CONSENT-CUSTOMER-PD-1.0.", "customer-consent.html"],
      ["#partnerFormV2", "Даю согласие на обработку моих персональных данных на условиях Согласия на обработку персональных данных участника МАЛАРС версии CONSENT-PARTICIPANT-PD-1.0.", "participant-consent.html"]
    ];
    for (const [selector, text, doc] of forms) {
      const form = document.querySelector(selector);
      const label = form?.querySelector(".consent");
      const span = label?.querySelector("span");
      const checkbox = label?.querySelector('input[type="checkbox"]');
      if (!form || !span || !checkbox) continue;
      checkbox.name = "consent";
      const consentLinkText = "Открыть полный текст черновика согласия";
      const policyLead = " Политика обработки данных: ";
      const desiredText = `${text} ${consentLinkText}${policyLead}черновик политики`;
      if (span.textContent !== desiredText) {
        span.dataset.testConsentBound = "true";
        span.replaceChildren(document.createTextNode(text + " "));
        const link = document.createElement("a");
        link.href = `legal/${doc}`;
        link.textContent = consentLinkText;
        span.append(link, document.createTextNode(policyLead));
        const policy = document.createElement("a");
        policy.href = "legal/privacy-policy.html";
        policy.textContent = "черновик политики";
        span.append(policy);
      }
    }

    const dropzone = document.getElementById("clientFilesDropzone");
    const input = document.getElementById("clientFiles");
    if (dropzone && !dropzone.dataset.testUploadNotice) {
      dropzone.dataset.testUploadNotice = "true";
      if (input) input.disabled = true;
      dropzone.querySelectorAll("button").forEach(button => button.disabled = true);
      dropzone.addEventListener("drop", event => {
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true);
      const note = document.createElement("p");
      note.setAttribute("role", "note");
      note.textContent = "Загрузка файлов в TEST не подключена. Ограничения будущего приема: до 10 МБ на файл и до 25 МБ суммарно.";
      dropzone.append(note);
    }

    const clientRegion = document.getElementById("clientRegion");
    const clientCity = document.getElementById("clientCity");
    if (clientRegion && clientCity && !clientRegion.dataset.testFallback &&
        /временно недоступен/.test(clientRegion.textContent)) {
      clientRegion.dataset.testFallback = "true";
      clientRegion.replaceChildren(new Option("Москва", "REG-077"));
      clientCity.replaceChildren(new Option("Тестовый город", "Тестовый город"));
      clientRegion.disabled = false;
      clientCity.disabled = false;
    }

    const partnerCity = document.getElementById("baseCity");
    if (partnerCity && partnerCity.disabled) partnerCity.disabled = false;
  };

  bind();
  new MutationObserver(bind).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("load", () => setTimeout(bind, 3000), { once: true });
  setTimeout(bind, 5000);
})();
"""


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "styles.css", "script.js", "script-core.js", "site-upgrade.js", "site-latest.js", "logo.svg"):
        source = ROOT / name
        if source.is_file():
            shutil.copy2(source, OUTPUT / name)

    index = (OUTPUT / "index.html").read_text(encoding="utf-8")
    index = index.replace("<head>", '<head>\n  <meta name="referrer" content="no-referrer">', 1)
    index = index.replace('  <link rel="preconnect" href="https://fonts.googleapis.com">\n', "")
    index = index.replace('  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n', "")
    index = index.replace('  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n', "")
    index = index.replace('styles.css?v=2', f'styles.css?v={BUILD_TAG}')
    index = index.replace('<script src="script.js?v=3"></script>', f'<script src="test-config.js?v={BUILD_TAG}"></script>\n<script src="test-runtime.js?v={BUILD_TAG}"></script>\n<script src="test-api-adapter.js?v={BUILD_TAG}"></script>\n<script src="specialization-catalog.js?v={BUILD_TAG}"></script>\n<script src="specializations.js?v={BUILD_TAG}"></script>\n<script src="participant-flow.js?v={BUILD_TAG}"></script>\n<script src="script.js?v={BUILD_TAG}"></script>')
    (OUTPUT / "index.html").write_text(index, encoding="utf-8")
    script = (OUTPUT / "script.js").read_text(encoding="utf-8")
    script = script.replace('20260828-2', BUILD_TAG).replace('20260828-3', BUILD_TAG).replace('20260827-1', BUILD_TAG)
    (OUTPUT / "script.js").write_text(script, encoding="utf-8")

    latest_path = OUTPUT / "site-latest.js"
    latest = latest_path.read_text(encoding="utf-8")
    patches = [
        (
            '      if (total > MAX_FILES_TOTAL) return clientError("Общий размер файлов не должен превышать 25 МБ.");',
            '      if (total > MAX_FILES_TOTAL) return clientError("Общий размер файлов не должен превышать 25 МБ.");\n'
            '      if (window.MALARS_TEST_CONFIG && selectedClientFiles.length) {\n'
            '        return clientError("Загрузка файлов в TEST пока не подключена. Удалите выбранные файлы; используйте только синтетические данные.");\n'
            '      }',
        ),
        (
            '        const files = await Promise.all(selectedClientFiles.map(filePayload));',
            '        const files = window.MALARS_TEST_CONFIG ? [] : await Promise.all(selectedClientFiles.map(filePayload));',
        ),
        (
            '        status.textContent = files.length ? "Готово. Заявка и документы отправлены." : "Готово. Заявка отправлена.";',
            '        status.textContent = result.replayed\n'
            '          ? `Заявка уже была принята ранее (повтор ${result.status}). ID: ${result.data?.request_id || ""}`\n'
            '          : `Готово. Заявка принята (${result.status}). ID: ${result.data?.request_id || ""}`;',
        ),
        (
            '        status.textContent = "Не удалось отправить данные. Проверьте корректность заполнения полей.";',
            '        status.textContent = error.message || "Не удалось отправить данные. Проверьте корректность заполнения полей.";',
        ),
    ]
    for old, new in patches:
        if latest.count(old) != 1:
            raise SystemExit("TEST patch anchor missing or ambiguous in site-latest.js")
        latest = latest.replace(old, new, 1)
    latest_path.write_text(latest, encoding="utf-8")

    core_path = OUTPUT / "script-core.js"
    core = core_path.read_text(encoding="utf-8")
    core = "\n".join(line for line in core.splitlines() if not line.startswith("const GOOGLE_SCRIPT_URL = ")) + "\n"
    start = core.find("async function postJson(payload) {")
    if start < 0:
        raise SystemExit("TEST API guard anchor missing in script-core.js")
    end = core.find("\n}\n", start)
    if end < 0 or "GOOGLE_SCRIPT_URL" not in core[start:end]:
        raise SystemExit("Expected legacy POST fallback was not found in script-core.js")
    end += len("\n}\n")
    test_guard = (
        'async function postJson() {\n'
        '  throw new Error("TEST API adapter is unavailable; data was not sent.");\n'
        '}\n'
    )
    core = core[:start] + test_guard + core[end:]
    if "GOOGLE_SCRIPT_URL" in core:
        raise SystemExit("TEST build still contains legacy Apps Script configuration")
    old_success = '    status.textContent = `Готово. Анкета зарегистрирована: ${result.participantId || ""}`.trim();'
    new_success = '    status.textContent = result.replayed\n'
    new_success += '      ? `Анкета уже была принята ранее (повтор ${result.status}). ID: ${result.participantId || ""}`\n'
    new_success += '      : `Готово. Анкета принята (${result.status}). ID: ${result.participantId || ""}`;'
    if core.count(old_success) != 1:
        raise SystemExit("TEST patch anchor missing or ambiguous in script-core.js")
    core = core.replace(old_success, new_success, 1)
    core += "\nwindow.MALARS_TEST_DATA = { WORKS, OBJECT_TYPES, REGIONS };\ndocument.dispatchEvent(new Event('malars:core-ready'));\n"
    core_path.write_text(core, encoding="utf-8")
    (OUTPUT / "test-config.js").write_text(
        "window.MALARS_TEST_CONFIG = Object.freeze({ apiBaseUrl: " + repr(API_BASE_URL) + ", origin: " + repr(TEST_ORIGIN) + " });\n",
        encoding="utf-8",
    )
    (OUTPUT / "test-runtime.js").write_text(RUNTIME, encoding="utf-8")
    shutil.copy2(ROOT / "test-frontend" / "test-api-adapter.js", OUTPUT / "test-api-adapter.js")
    shutil.copy2(ROOT / "test-frontend" / "participant-flow.js", OUTPUT / "participant-flow.js")
    for name in ("specialization-catalog.js", "specializations.js"):
        shutil.copy2(ROOT / "test-frontend" / name, OUTPUT / name)
    with (OUTPUT / "styles.css").open("a", encoding="utf-8") as css_out:
        css_out.write("\n" + (ROOT / "test-frontend" / "participant-flow.css").read_text(encoding="utf-8"))

    legal_source = ROOT / "test-frontend" / "legal"
    legal_output = OUTPUT / "legal"
    if not legal_source.is_dir() or len(list(legal_source.glob("*.html"))) != 3:
        raise SystemExit("Expected three reviewed legal draft pages under test-frontend/legal")
    shutil.copytree(legal_source, legal_output, dirs_exist_ok=True)
    print(f"Built {OUTPUT} for {TEST_ORIGIN}")


if __name__ == "__main__":
    main()
