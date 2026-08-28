const MALARS_CONFIG = {
  SPREADSHEET_ID: '1MYneITsNuCumAFoLQtq2G1UbSodolnBNt0-DsoEkUN4',
  CLIENT_FILES_FOLDER_ID: '1ZUnxJc2MoHyNFc6jrx7OwOZx5bXsbC1k',
  SHEETS: {
    clients: 'Заявки заказчиков',
    legacyPartners: 'Подрядчики',
    participants: 'Участники v2',
    competencies: 'Компетенции v2',
    objectTypes: 'Типы объектов v2',
    geography: 'География v2',
    workDictionary: 'Справочник работ',
    objectDictionary: 'Справочник объектов',
    documents: 'Документы v2'
  }
};

const MALARS_VERSION = '2026-08-28.3';

const MALARS_DOCUMENTS = {
  'DOC-SRO': 'СРО',
  'DOC-MCHS': 'Лицензия МЧС',
  'DOC-ETL': 'Электролаборатория',
  'DOC-CERT': 'Допуски и удостоверения персонала',
  'DOC-FSTEK': 'Лицензия ФСТЭК России',
  'RES-TOOLS': 'Собственный инструмент / оборудование',
  'RES-EQUIP': 'Собственная техника',
  'DOC-PORT': 'Портфолио'
};

const MALARS_MAX_FILE_SIZE = 10 * 1024 * 1024;
const MALARS_MAX_FILES_TOTAL = 25 * 1024 * 1024;

function doGet() {
  return json_({
    ok: true,
    service: 'МАЛАРС-ГРУПП',
    version: MALARS_VERSION,
    message: 'Web App работает'
  });
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
    if (!raw) throw new Error('Пустой запрос');

    const data = JSON.parse(raw);
    const ss = SpreadsheetApp.openById(MALARS_CONFIG.SPREADSHEET_ID);
    let result;

    if (data.formType === 'client') {
      result = saveClient_(ss, data);
    } else if (data.formType === 'partner_v2') {
      result = savePartnerV2_(ss, data);
    } else if (data.formType === 'partner') {
      result = saveLegacyPartner_(ss, data);
    } else {
      throw new Error('Неизвестный тип формы');
    }

    return json_(Object.assign({ ok: true, version: MALARS_VERSION }, result || {}));
  } catch (error) {
    console.error('MALARS doPost:', error && error.stack ? error.stack : error);
    return json_({
      ok: false,
      version: MALARS_VERSION,
      error: error && error.message ? error.message : 'Ошибка обработки запроса'
    });
  }
}

function saveClient_(ss, data) {
  const sheet = getSheet_(ss, MALARS_CONFIG.SHEETS.clients);

  requireText_(data.name, 'Имя');
  requireRussianPhone_(data.contact);
  requireEmail_(data.email);
  requireText_(data.task, 'Задача');
  requireText_(data.region, 'Регион');
  requireText_(data.cityName, 'Город');

  let savedFiles = null;

  try {
    savedFiles = saveClientFiles_(data.files, data);

    sheet.appendRow([
      new Date(),
      clean_(data.name),
      sheetText_(data.contact),
      clean_(data.email),
      clean_(data.city || [data.region, data.cityName].filter(Boolean).join(' / ')),
      clean_(data.task),
      clean_(data.deadline),
      clean_(data.page),
      savedFiles ? savedFiles.url : ''
    ]);
  } catch (error) {
    if (savedFiles && savedFiles.folderId) {
      try {
        DriveApp.getFolderById(savedFiles.folderId).setTrashed(true);
      } catch (_) {}
    }
    throw error;
  }

  return {
    type: 'client',
    message: 'Заявка заказчика сохранена',
    filesUrl: savedFiles ? savedFiles.url : ''
  };
}

function saveClientFiles_(files, data) {
  if (!Array.isArray(files) || files.length === 0) return null;

  let totalSize = 0;
  files.forEach(function(file) {
    if (!file || !file.name || !file.data) {
      throw new Error('Один из файлов повреждён или пуст');
    }

    const declaredSize = Number(file.size || 0);
    if (declaredSize > MALARS_MAX_FILE_SIZE) {
      throw new Error('Размер одного файла превышает 10 МБ');
    }
    totalSize += declaredSize;
  });

  if (totalSize > MALARS_MAX_FILES_TOTAL) {
    throw new Error('Общий размер файлов превышает 25 МБ');
  }

  const parent = DriveApp.getFolderById(MALARS_CONFIG.CLIENT_FILES_FOLDER_ID);
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Europe/Moscow', 'yyyy-MM-dd HH.mm.ss');
  const clientName = safeName_(data.name || 'Заказчик');
  const cityName = safeName_(data.cityName || data.region || 'Без города');
  const folder = parent.createFolder(stamp + ' — ' + clientName + ' — ' + cityName);

  try {
    files.forEach(function(file) {
      const bytes = Utilities.base64Decode(String(file.data));
      if (bytes.length > MALARS_MAX_FILE_SIZE) {
        throw new Error('Размер одного файла превышает 10 МБ');
      }
      const blob = Utilities.newBlob(
        bytes,
        clean_(file.type) || 'application/octet-stream',
        safeFileName_(file.name)
      );
      folder.createFile(blob);
    });
  } catch (error) {
    try { folder.setTrashed(true); } catch (_) {}
    throw error;
  }

  return {
    folderId: folder.getId(),
    url: folder.getUrl()
  };
}

function savePartnerV2_(ss, data) {
  const participant = data && data.participant ? data.participant : {};
  const competencies = Array.isArray(data.competencies) ? uniqueStrings_(data.competencies) : [];
  const objectTypes = Array.isArray(data.objectTypes) ? uniqueStrings_(data.objectTypes) : [];
  const regions = Array.isArray(data.regions) ? data.regions : [];
  const documents = Array.isArray(data.documents) ? uniqueStrings_(data.documents) : [];
  const nationwide = Boolean(participant.nationwide);

  requireText_(participant.participantType, 'Тип участника');
  requireText_(participant.legalForm, 'Организационная форма');
  requireText_(participant.contactName, 'Контактное лицо');
  requireRussianPhone_(participant.phone);
  requireEmail_(participant.email);

  if (!nationwide) {
    requireText_(participant.baseRegionName, 'Базовый регион');
    requireText_(participant.baseCity, 'Базовый город');
  }

  if (!competencies.length) throw new Error('Не выбраны виды работ');
  if (!objectTypes.length) throw new Error('Не выбраны типы объектов');

  validateInnForLegalForm_(participant.inn, participant.legalForm, participant.participantType);

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const participantSheet = getSheet_(ss, MALARS_CONFIG.SHEETS.participants);
    const participantId = nextParticipantId_(participantSheet);
    const workMap = getWorkDictionary_(ss);
    const objectMap = getObjectDictionary_(ss);

    const paymentForms = Array.isArray(participant.paymentForms)
      ? uniqueStrings_(participant.paymentForms).join('; ')
      : clean_(participant.paymentForms);

    const sro = documents.indexOf('DOC-SRO') !== -1 ? 'Да' : 'Нет';
    const licenseCodes = documents.filter(function(code) {
      return ['DOC-MCHS', 'DOC-ETL', 'DOC-CERT', 'DOC-FSTEK'].indexOf(code) !== -1;
    });
    const licenses = licenseCodes.map(function(code) {
      return MALARS_DOCUMENTS[code] || code;
    }).join('; ');

    const portfolio = clean_(participant.portfolioUrl) || (documents.indexOf('DOC-PORT') !== -1 ? 'Да' : '');
    const baseRegionName = nationwide ? 'Вся Россия' : clean_(participant.baseRegionName);
    const baseCity = nationwide ? 'Вся Россия' : clean_(participant.baseCity);

    participantSheet.appendRow([
      participantId,
      new Date(),
      'Новый',
      clean_(participant.participantType),
      clean_(participant.legalForm),
      clean_(participant.companyName),
      digitsOnly_(participant.inn),
      clean_(participant.contactName),
      sheetText_(participant.phone),
      clean_(participant.telegram),
      clean_(participant.email),
      baseRegionName,
      baseCity,
      clean_(participant.teamSize),
      clean_(participant.vat),
      paymentForms,
      clean_(participant.travel),
      nationwide ? 'Да' : 'Нет',
      clean_(participant.minOrder),
      clean_(participant.maxProject),
      sro,
      licenses,
      portfolio,
      clean_(participant.comment),
      clean_(data.page || data.source)
    ]);

    const competencyRows = competencies.map(function(workCode) {
      const item = workMap[workCode];
      if (!item) throw new Error('Неизвестный код работы: ' + workCode);
      return [participantId, item.categoryCode, item.categoryName, workCode, item.workName];
    });
    appendRows_(getSheet_(ss, MALARS_CONFIG.SHEETS.competencies), competencyRows);

    const objectRows = objectTypes.map(function(objectCode) {
      const objectName = objectMap[objectCode];
      if (!objectName) throw new Error('Неизвестный код объекта: ' + objectCode);
      return [participantId, objectCode, objectName];
    });
    appendRows_(getSheet_(ss, MALARS_CONFIG.SHEETS.objectTypes), objectRows);

    const regionRows = [];
    const seenRegionCodes = {};
    if (nationwide) {
      regionRows.push([participantId, 'RU-ALL', 'Вся Россия']);
      seenRegionCodes['RU-ALL'] = true;
    }

    regions.forEach(function(region) {
      const code = clean_(region && region.code);
      const name = clean_(region && region.name);
      if (!code || !name || seenRegionCodes[code]) return;
      seenRegionCodes[code] = true;
      regionRows.push([participantId, code, name]);
    });
    appendRows_(getSheet_(ss, MALARS_CONFIG.SHEETS.geography), regionRows);

    const documentRows = documents.map(function(code) {
      return [participantId, code, MALARS_DOCUMENTS[code] || code];
    });
    appendRows_(getSheet_(ss, MALARS_CONFIG.SHEETS.documents), documentRows);

    return {
      type: 'partner_v2',
      participantId: participantId,
      message: 'Анкета подрядчика сохранена'
    };
  } finally {
    lock.releaseLock();
  }
}

function saveLegacyPartner_(ss, data) {
  const sheet = getSheet_(ss, MALARS_CONFIG.SHEETS.legacyPartners);

  sheet.appendRow([
    new Date(),
    clean_(data.company || data.companyName || data.name),
    clean_(data.contactName || data.person),
    sheetText_(data.contact || data.phone),
    clean_(data.city),
    clean_(data.services || data.directions || data.works),
    clean_(data.geography || data.region),
    clean_(data.comment || data.experience),
    clean_(data.page)
  ]);

  return {
    type: 'partner',
    message: 'Данные подрядчика сохранены'
  };
}

function getWorkDictionary_(ss) {
  const sheet = getSheet_(ss, MALARS_CONFIG.SHEETS.workDictionary);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('Справочник работ пуст');

  const values = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  const map = {};

  values.forEach(function(row) {
    const categoryCode = clean_(row[0]);
    const categoryName = clean_(row[1]);
    const workCode = clean_(row[2]);
    const workName = clean_(row[3]);
    if (!workCode) return;
    map[workCode] = {
      categoryCode: categoryCode,
      categoryName: categoryName,
      workName: workName
    };
  });

  return map;
}

function getObjectDictionary_(ss) {
  const sheet = getSheet_(ss, MALARS_CONFIG.SHEETS.objectDictionary);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('Справочник объектов пуст');

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const map = {};
  values.forEach(function(row) {
    const code = clean_(row[0]);
    const name = clean_(row[1]);
    if (code) map[code] = name;
  });
  return map;
}

function nextParticipantId_(sheet) {
  const lastRow = sheet.getLastRow();
  let maxNumber = 0;

  if (lastRow >= 2) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    ids.forEach(function(row) {
      const match = String(row[0] || '').match(/^MLR-(\d+)$/i);
      if (!match) return;
      const value = Number(match[1]);
      if (value > maxNumber) maxNumber = value;
    });
  }

  return 'MLR-' + String(maxNumber + 1).padStart(6, '0');
}

function appendRows_(sheet, rows) {
  if (!rows || !rows.length) return;
  const width = rows.reduce(function(max, row) { return Math.max(max, row.length); }, 0);
  const normalized = rows.map(function(row) {
    const copy = row.slice();
    while (copy.length < width) copy.push('');
    return copy;
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, normalized.length, width).setValues(normalized);
}

function getSheet_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Не найден лист: ' + name);
  return sheet;
}

function requireText_(value, label) {
  if (!clean_(value)) throw new Error('Не заполнено поле: ' + label);
}

function requireRussianPhone_(value) {
  const phone = clean_(value);
  if (!/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(phone)) {
    throw new Error('Телефон должен быть в формате +7 (999) 999-99-99');
  }
}

function requireEmail_(value) {
  const email = clean_(value);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new Error('Некорректный email');
  }
}

function validateInnForLegalForm_(inn, legalForm, participantType) {
  const digits = digitsOnly_(inn);
  const legal = clean_(legalForm);
  const type = clean_(participantType);

  if (['ПАО', 'АО', 'ООО'].indexOf(legal) !== -1) {
    if (!/^\d{10}$/.test(digits)) throw new Error('ИНН организации должен содержать 10 цифр');
    return;
  }

  if (legal === 'ИП' || legal === 'Самозанятый' || type === 'ИП' || type === 'Самозанятый') {
    if (!/^\d{12}$/.test(digits)) throw new Error('ИНН должен содержать 12 цифр');
    return;
  }

  if (digits && !/^\d{12}$/.test(digits)) {
    throw new Error('ИНН физического лица должен содержать 12 цифр');
  }
}

function sheetText_(value) {
  const text = clean_(value);
  if (!text) return '';
  return "'" + text;
}

function uniqueStrings_(values) {
  const seen = {};
  const result = [];
  (values || []).forEach(function(value) {
    const item = clean_(value);
    if (!item || seen[item]) return;
    seen[item] = true;
    result.push(item);
  });
  return result;
}

function digitsOnly_(value) {
  return String(value == null ? '' : value).replace(/\D/g, '');
}

function clean_(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(clean_).filter(Boolean).join('; ');
  return String(value).trim();
}

function safeName_(value) {
  const text = clean_(value)
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (text || 'Без названия').slice(0, 80);
}

function safeFileName_(value) {
  const text = clean_(value)
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return (text || 'file').slice(0, 180);
}

function ensurePhoneColumnsText_() {
  const ss = SpreadsheetApp.openById(MALARS_CONFIG.SPREADSHEET_ID);
  [
    [MALARS_CONFIG.SHEETS.clients, 'C:C'],
    [MALARS_CONFIG.SHEETS.legacyPartners, 'D:D'],
    [MALARS_CONFIG.SHEETS.participants, 'I:I']
  ].forEach(function(item) {
    const sheet = getSheet_(ss, item[0]);
    sheet.getRange(item[1]).setNumberFormat('@');
  });
}

function testSetup() {
  const ss = SpreadsheetApp.openById(MALARS_CONFIG.SPREADSHEET_ID);
  Object.keys(MALARS_CONFIG.SHEETS).forEach(function(key) {
    getSheet_(ss, MALARS_CONFIG.SHEETS[key]);
  });
  DriveApp.getFolderById(MALARS_CONFIG.CLIENT_FILES_FOLDER_ID).getName();
  ensurePhoneColumnsText_();

  return {
    ok: true,
    version: MALARS_VERSION,
    message: 'Настройка МАЛАРС-ГРУПП проверена'
  };
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}