const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz3ycpkm_msGzEVbpQkdaedUGwaAjzkA4_Xbuj8X4MCaKyuqXFtPY1Yuq4M2zLF9yIb/exec";

document.getElementById("year").textContent = new Date().getFullYear();

document.querySelectorAll("form[data-form-type]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const status = form.querySelector(".form-status");
    const button = form.querySelector(".form-submit");
    const data = Object.fromEntries(new FormData(form).entries());

    data.formType = form.dataset.formType;
    data.page = window.location.href;
    data.submittedAt = new Date().toISOString();

    button.disabled = true;
    button.textContent = "Отправляем…";
    status.textContent = "";

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || "Ошибка отправки");
      }

      form.reset();
      status.textContent = "Готово. Данные отправлены.";

    } catch (error) {
      console.error(error);
      status.textContent = "Не удалось отправить данные. Попробуйте ещё раз.";

    } finally {
      button.disabled = false;

      if (form.dataset.formType === "client") {
        button.textContent = "Отправить задачу";
      } else {
        button.textContent = "Отправить данные";
      }
    }
  });
});
