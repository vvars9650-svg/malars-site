/* MALARS local UI catalog. Internal IDs are NOT SPDS marks. */
(() => {
  const version = 'malars-specializations-2026-11-09-v1';
  const directions = [
    ['construction', 'Строительство'], ['electrical', 'Электрика'],
    ['networks', 'Инженерные сети'], ['security', 'Связь, охрана и пожарная безопасность'],
    ['automation', 'Автоматизация и технологические системы'], ['services', 'Инженерные и специальные услуги'],
  ];
  const operations = [
    ['survey', 'Обследование'], ['design', 'Проектирование'], ['supply', 'Поставка'],
    ['fabrication', 'Изготовление'], ['demolition', 'Демонтаж'], ['installation', 'Монтаж'],
    ['programming', 'Программирование'], ['integration', 'Интеграция'], ['commissioning', 'ПНР'], ['service', 'Сервис'],
  ];
  const building = ['survey','design','supply','fabrication','demolition','installation','service'];
  const systems = ['survey','design','supply','fabrication','demolition','installation','integration','commissioning','service'];
  const digital = operations.map(x => x[0]);
  const service = ['survey','design','service'];
  // mark is used only for verified working-drawing marks, not aliases such as СКС/СКУД.
  const rows = [
    ['structure','construction','Несущие конструкции и общестроительные работы','КЖ','Конструкции железобетонные','CON-01 CON-02 CON-03 CON-04',building,'КЖ АС фундаменты монолит кладка'],
    ['finishing','construction','Отделка и интерьеры','АИ','Интерьеры','CON-05 FIN-01 FIN-02 FIN-03 FIN-04 FIN-05 FIN-06 FIN-07 FIN-08',building,'АР ГКЛ плитка маляр штукатур полы'],
    ['waterproof','construction','Гидроизоляция и защитные покрытия','','','CON-06',building,'изоляция защита'],
    ['metal','construction','Металлоконструкции','КМ','Конструкции металлические','MET-01 MET-02 MET-03 MET-04',building,'КМД сварка лестницы'],
    ['envelope','construction','Фасады и кровля','АР','Архитектурные решения','FAC-01 FAC-02 FAC-03 FAC-04 FAC-05 FAC-06',building,'фасад кровля остекление'],
    ['site','construction','Земляные работы и благоустройство','ГП','Генеральный план','SITE-01 SITE-02 SITE-03 SITE-04 SITE-05',building,'генплан асфальт озеленение'],
    ['power','electrical','Распределение и силовое электрооборудование','ЭОМ','Силовое электрооборудование и электрическое освещение (внутреннее)','ELE-01 ELE-02 ELE-03 ELE-05',systems,'ЭМ ВРУ ГРЩ щиты кабель электрика'],
    ['lighting','electrical','Внутреннее освещение','ЭО','Электрическое освещение (внутреннее)','ELE-04',systems,'свет освещение'],
    ['earthing','electrical','Заземление и молниезащита','СМЗ','Системы молниезащиты и заземления','ELE-06',systems,'молния ЗУ контур'],
    ['electrical-pnr','electrical','Пусконаладка электрооборудования','','','ELE-07',systems,'ПНР ЭОМ испытания'],
    ['outdoor-power','electrical','Наружное электроснабжение','ЭС','Электроснабжение','EXT-01',systems,'ЭН ЭВ ЭК наружные кабельные воздушные линии'],
    ['ventilation','networks','Вентиляция','ОВ','Отопление, вентиляция и кондиционирование','HVAC-01 HVAC-03 HVAC-04',systems,'ОВиК дымоудаление воздуховоды'],
    ['cooling','networks','Кондиционирование и холодоснабжение','ХС','Холодоснабжение','HVAC-02',systems,'ОВиК кондиционер чиллер VRF'],
    ['hvac-pnr','networks','Балансировка и наладка ОВиК','','','HVAC-05',systems,'ПНР вентиляция кондиционирование'],
    ['water','networks','Внутреннее водоснабжение и канализация','ВК','Внутренние системы водоснабжения и канализации','WAT-01 WAT-02 WAT-03 WAT-04',systems,'В1 К1 ХВС ГВС насос сантехника'],
    ['heating','networks','Отопление','','','HEAT-01',systems,'ОВ тепло радиаторы'],
    ['thermal','networks','Тепловые пункты и котельные','ТМ','Тепломеханические решения','HEAT-02 HEAT-03',systems,'ИТП ЦТП котельная'],
    ['outdoor-water','networks','Наружное водоснабжение и канализация','НВК','Наружные сети водоснабжения и канализации','EXT-02 EXT-03 EXT-04',systems,'НВ НК ливневая канализация'],
    ['heat-net','networks','Наружные тепловые сети','ТС','Тепломеханические решения тепловых сетей','EXT-05',systems,'теплотрасса теплоснабжение'],
    ['gas','networks','Газоснабжение','','','',systems,'ГСН ГСВ газопровод'],
    ['data-net','security','Кабельные и локальные сети связи','','','LOW-01',digital,'СКС ЛВС СС СКС LAN Ethernet ВОЛС'],
    ['video','security','Видеонаблюдение','','','LOW-02',digital,'СОТ CCTV СВН IP камеры'],
    ['access','security','Контроль доступа и домофония','','','LOW-03 LOW-04',digital,'СКУД СКД домофон'],
    ['intrusion','security','Охранная сигнализация','ОС','Охранная сигнализация','LOW-05',digital,'ОПС охрана'],
    ['communication','security','Связь, оповещение и часофикация','','','LOW-06',digital,'СС СЧ телефония оповещение'],
    ['fire-alarm','security','Пожарная сигнализация','ПС','Пожарная сигнализация','FIRE-01',digital,'АПС СПС ОПС'],
    ['evacuation','security','Оповещение и управление эвакуацией','','','FIRE-02',digital,'СОУЭ эвакуация'],
    ['fire-suppression','security','Пожаротушение и огнезащита','СПО','Системы пожаротушения и огнезащита','FIRE-03 FIRE-04 FIRE-05',systems,'АУПТ АПТ ВПВ огнезащита'],
    ['outdoor-comms','security','Наружные сети связи','','','EXT-06',digital,'НСС ВОЛС связь'],
    ['automation','automation','Автоматизация и диспетчеризация','АК','Автоматизация комплексная','SPEC-02',digital,'АСУ ТП АТХ АОВ АВК BMS КИПиА ПЛК PLC SCADA HMI'],
    ['technology','automation','Технологическое оборудование','ТХ','Технология производства','SPEC-01',systems,'станки оборудование производство'],
    ['commissioning','automation','Комплексная пусконаладка','','','SPEC-03',digital,'ПНР комплексное опробование'],
    ['software','automation','Разработка ПО и системная интеграция','','','',['survey','design','programming','integration','commissioning','service'],'ПО API IT программное обеспечение embedded'],
    ['inspection','services','Обследование и техническая диагностика','','','',service,'НК дефектоскопия обмеры'],
    ['investigation','services','Инженерные изыскания','','','',service,'ИГИ ИГДИ ИЭИ геодезия геология геотехника экология'],
    ['metrology','services','Метрология','','','',['survey','service'],'поверка калибровка СИ методики измерений'],
    ['laboratory','services','Лаборатории и испытания','','','',['survey','commissioning','service'],'ЭТЛ электролаборатория строительная экологическая испытания'],
    ['engineering','services','Проектирование, расчёты и BIM','','','',service,'BIM ТИМ проектировщик моделирование'],
    ['special','services','Специальные работы','','','SPEC-04 SPEC-05',building,'алмазное бурение резка промышленный альпинизм'],
  ];
  // Applicability is a MALARS questionnaire model, not a normative classification.
  // A named service already encodes its work type; do not offer a full lifecycle.
  const operationOverrides = {
    'electrical-pnr':['commissioning'], 'hvac-pnr':['commissioning'],
    commissioning:['commissioning'], inspection:['survey'], investigation:['survey'],
    metrology:['service'], laboratory:['survey','commissioning'], engineering:['design'],
    special:['demolition','installation'],
    finishing:['survey','design','supply','demolition','installation','service'],
    waterproof:['survey','design','supply','demolition','installation','service'],
    site:['survey','design','supply','demolition','installation','service'],
    lighting:['survey','design','supply','demolition','installation','commissioning','service'],
    earthing:['survey','design','supply','demolition','installation','commissioning','service'],
    'outdoor-power':['survey','design','supply','demolition','installation','commissioning','service'],
    'data-net':['survey','design','supply','demolition','installation','integration','commissioning','service'],
    video:['survey','design','supply','demolition','installation','programming','integration','commissioning','service'],
    access:['survey','design','supply','demolition','installation','programming','integration','commissioning','service'],
    intrusion:['survey','design','supply','demolition','installation','programming','integration','commissioning','service'],
    communication:['survey','design','supply','demolition','installation','programming','integration','commissioning','service'],
    'fire-alarm':['survey','design','supply','demolition','installation','programming','integration','commissioning','service'],
    evacuation:['survey','design','supply','demolition','installation','programming','integration','commissioning','service'],
    'outdoor-comms':['survey','design','supply','demolition','installation','integration','commissioning','service'],
  };
  const extra = {
    gas:['Внутреннее газоснабжение','Наружные газопроводы'],
    automation:['Программирование ПЛК','Разработка SCADA / HMI','Диспетчеризация инженерных систем'],
    software:['Прикладное ПО','Встроенное ПО','Интеграция API и обмен данными'],
    inspection:['Обследование конструкций','Диагностика инженерных систем','Неразрушающий контроль'],
    investigation:['Инженерно-геодезические изыскания','Инженерно-геологические изыскания','Инженерно-экологические изыскания','Инженерно-гидрометеорологические изыскания'],
    metrology:['Поверка средств измерений','Калибровка средств измерений','Метрологическое обеспечение'],
    laboratory:['Строительная лаборатория','Электротехническая лаборатория','Экологическая лаборатория','Испытания оборудования'],
    engineering:['Архитектурное проектирование','Конструктивные расчёты','Проектирование инженерных систем','Технологическое проектирование','BIM-моделирование'],
  };
  const normalize = value => String(value || '').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  function create(legacy) {
    return rows.map(([id,direction,name,mark,markTitle,codes,applicable,aliases]) => ({
      id: 'MAL-SYS-' + id, direction, name, mark, markTitle, aliases,
      operations: operationOverrides[id] || applicable,
      kind: ['electrical-pnr','hvac-pnr','commissioning','inspection','investigation','metrology','laboratory','engineering','special'].includes(id) ? 'service' : 'system',
      specializations: [
        ...codes.split(' ').filter(Boolean).map(code => {
          const work = legacy.find(row => row[2] === code);
          if (!work) throw new Error('Missing legacy competency: ' + code);
          return {id:code, name:work[3], legacy:true};
        }),
        ...(extra[id] || []).map((name,i) => ({id:`MAL-SPEC-${id}-${i+1}`,name,legacy:false})),
      ],
    }));
  }
  function matches(system, query, directionName = '') {
    const haystack = normalize([directionName,system.name,system.mark,system.markTitle,system.aliases,system.id,...system.specializations.flatMap(s=>[s.id,s.name])].join(' '));
    return normalize(query).split(' ').every(word => haystack.includes(word));
  }
  const directionHints = {
    construction:'Общестрой, отделка, конструкции, фасады и благоустройство',
    electrical:'Электроснабжение, освещение, заземление и молниезащита',
    networks:'Вентиляция, вода, канализация, отопление и газоснабжение',
    security:'Сети связи, видеонаблюдение, доступ и противопожарные системы',
    automation:'Автоматика, диспетчеризация, оборудование и программное обеспечение',
    services:'Обследование, изыскания, метрология, лаборатории и проектирование',
  };
  // Keep legacy category strings intact; use their original WORKS membership to
  // resolve broad old profiles, including EXT/SPEC which span several directions.
  function directionsFor(categories = [], legacy = []) {
    const selected = new Set();
    const systems = legacy.length ? create(legacy) : [];
    for (const category of categories) {
      for (const [id,name] of directions) if (category === name) selected.add(id);
      for (const system of systems) {
        if (category === system.name || (category === 'Проектирование и инженерные расчёты' && system.id === 'MAL-SYS-engineering')) selected.add(system.direction);
        if (system.specializations.some(spec=>spec.legacy && legacy.some(work=>work[2]===spec.id && work[1]===category))) selected.add(system.direction);
      }
    }
    return [...selected];
  }
  function changeDirection(categories, direction, checked, legacy) {
    const name = directions.find(([id])=>id===direction)?.[1];
    if (!name) return [...categories];
    if (checked) return directionsFor(categories,legacy).includes(direction) ? [...categories] : [...categories,name];
    const result = [];
    for (const category of categories) {
      const mapped = directionsFor([category],legacy);
      if (!mapped.includes(direction)) result.push(category);
      else for (const retained of mapped.filter(id=>id!==direction)) result.push(directions.find(([id])=>id===retained)[1]);
    }
    return [...new Set(result)];
  }
  function displayValue(value, legacy = []) {
    const text = String(value ?? '');
    if (text.includes(' — ')) return text.split(' — ').slice(1).join(' — ');
    return legacy.find(work=>work[2]===text)?.[3] || (/^(?:MAL-|LOCAL-|[A-Z]+-\d)/.test(text) ? 'Ранее выбранная специализация' : text);
  }
  window.MalarsSpecializationCatalog = {version,directions,operations,create,normalize,matches,directionHints,directionsFor,changeDirection,displayValue};
})();
