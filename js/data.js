/*
 * MALARS frontend data layer
 * Clean MVP migration. Not connected to production until the migration switch.
 */
(() => {
  const objectTypes = [
    ["OBJ-01","Частные дома и коттеджи"],
    ["OBJ-02","Квартиры"],
    ["OBJ-03","Офисы"],
    ["OBJ-04","Торговые помещения и магазины"],
    ["OBJ-05","Рестораны, кафе, гостиницы"],
    ["OBJ-06","Склады и логистические комплексы"],
    ["OBJ-07","Производственные и промышленные объекты"],
    ["OBJ-08","Многоквартирные дома"],
    ["OBJ-09","Бизнес-центры"],
    ["OBJ-10","Образовательные и социальные объекты"],
    ["OBJ-11","Медицинские объекты"],
    ["OBJ-12","Государственные и общественные здания"],
    ["OBJ-13","Инфраструктурные объекты"],
    ["OBJ-14","ЦОД, серверные и технические помещения"],
    ["OBJ-15","Опасные производственные объекты (ОПО)"]
  ];

  const documents = [
    ["DOC-SRO","СРО"],
    ["DOC-MCHS","Лицензия МЧС"],
    ["DOC-ETL","Электролаборатория"],
    ["DOC-CERT","Допуски и удостоверения персонала"],
    ["DOC-FSTEK","Лицензия ФСТЭК России"],
    ["RES-TOOLS","Собственный инструмент / оборудование"],
    ["RES-EQUIP","Собственная техника"],
    ["DOC-PORT","Портфолио"]
  ];

  const organizationForms = ["ПАО","АО","ООО","ИП","Бригада","Самозанятый","Частный специалист"];

  window.MalarsData = Object.freeze({
    version: "20260904-3",
    config: Object.freeze({
      brandName: "МАЛАРС-ГРУПП",
      scriptUrl: "https://script.google.com/macros/s/AKfycbz3ycpkm_msGzEVbpQkdaedUGwaAjzkA4_Xbuj8X4MCaKyuqXFtPY1Yuq4M2zLF9yIb/exec",
      hhAreasUrl: "https://api.hh.ru/areas/113?locale=RU",
      areaCacheKey: "malars-group-russia-areas-v3",
      areaCacheTtlMs: 2592000000,
      maxFileSize: 10 * 1024 * 1024,
      maxFilesTotal: 25 * 1024 * 1024
    }),
    contacts: Object.freeze([
      Object.freeze({ label: "+7 989 808-01-04", tel: "+79898080104" }),
      Object.freeze({ label: "+7 989 824-03-21", tel: "+79898240321" })
    ]),
    organizationForms: Object.freeze(organizationForms),
    objectTypes: Object.freeze(objectTypes),
    documents: Object.freeze(documents),

    // WORKS and REGIONS remain in script-core.js during the first safe migration phase.
    // They will be copied here before production is switched to the clean layer.
    works: Object.freeze([]),
    regions: Object.freeze([]),
    migration: Object.freeze({ worksPending: true, regionsPending: true })
  });
})();
