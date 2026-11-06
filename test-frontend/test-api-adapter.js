(() => {
  const keyFor = formId => `malars-test-idempotency:${formId}`;

  function idempotencyKey(formId) {
    const keyName = keyFor(formId);
    let key = sessionStorage.getItem(keyName);
    if (!key) {
      key = crypto.randomUUID();
      sessionStorage.setItem(keyName, key);
    }
    return key;
  }

  function resetKeyOnEdit(event) {
    if (event.target?.type === "submit") return;
    const form = event.target?.closest?.("#clientForm, #partnerFormV2");
    if (form) sessionStorage.removeItem(keyFor(form.id));
  }

  function intakeError(status, code) {
    if (status === 409 || code === "idempotency_conflict") {
      return new Error("Конфликт ключа отправки. Измените данные и отправьте форму ещё раз.");
    }
    if (status >= 500) {
      return new Error("TEST API временно недоступен. Повторите отправку без изменения формы.");
    }
    const messages = {
      consent_required: "Не подтверждена актуальная версия согласия.",
      competencies_required: "Выберите хотя бы один вид работ.",
      object_types_required: "Выберите хотя бы один тип объекта.",
      invalid_body_size: "Запрос превышает допустимый размер.",
    };
    return new Error(messages[code] || `TEST API отклонил форму (${status}). Проверьте обязательные поля.`);
  }

  async function sendToTestApi(payload) {
    const config = window.MALARS_TEST_CONFIG;
    if (!config?.apiBaseUrl) throw new Error("TEST API не настроен; данные не отправлены.");

    const isParticipant = payload.formType === "partner_v2";
    const formId = isParticipant ? "partnerFormV2" : "clientForm";
    const endpoint = isParticipant ? "/api/participants" : "/api/customer-requests";
    let body;

    if (isParticipant) {
      const participant = { ...payload.participant };
      if (["Бригада", "Частный специалист"].includes(participant.participantType)) {
        participant.legalForm = "Физлицо";
      }
      body = {
        participant,
        competencies: payload.competencies,
        objectTypes: payload.objectTypes,
        regions: payload.regions,
        documents: payload.documents,
        consent: true,
        consent_version: "CONSENT-PARTICIPANT-PD-1.0",
      };
    } else {
      if (payload.files?.length) {
        throw new Error("Загрузка файлов в TEST пока не подключена. Удалите выбранные файлы; используйте только синтетические данные.");
      }
      body = {
        name: payload.name,
        contact: payload.contact,
        email: payload.email,
        region: payload.region,
        city: payload.city,
        description: payload.task,
        desired_deadline: payload.deadline || "",
        organization: payload.organization || "",
        consent: true,
        consent_version: "CONSENT-CUSTOMER-PD-1.0",
      };
    }

    const response = await fetch(`${config.apiBaseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey(formId),
      },
      body: JSON.stringify(body),
    });
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (_) {
      throw intakeError(response.status, "invalid_response");
    }
    if (!response.ok || !result?.data) {
      throw intakeError(response.status, result?.error);
    }

    sessionStorage.removeItem(keyFor(formId));
    return {
      ok: true,
      data: result.data,
      status: response.status,
      replayed: response.status === 200,
      participantId: result.data.participant_id || "",
    };
  }

  function install() {
    if (window.__MALARS_TEST_API_ADAPTER__) return true;
    if (typeof window.postJson !== "function") return false;
    window.postJson = sendToTestApi;
    window.__MALARS_TEST_API_ADAPTER__ = true;
    return true;
  }

  document.addEventListener("input", resetKeyOnEdit, true);
  document.addEventListener("change", resetKeyOnEdit, true);

  if (!install()) {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (install() || attempts >= 300) window.clearInterval(timer);
    }, 50);
  }
})();
