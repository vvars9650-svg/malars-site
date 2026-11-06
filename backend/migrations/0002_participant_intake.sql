-- Versioned participant intake schema. No physical files are stored in YDB.
-- migrate:statement
CREATE TABLE IF NOT EXISTS competency_directory (
    competency_code Utf8,
    category_code Utf8,
    category_name Utf8,
    competency_name Utf8,
    active Bool,
    PRIMARY KEY (competency_code)
);
-- migrate:statement
CREATE TABLE IF NOT EXISTS object_type_directory (
    object_type_code Utf8,
    object_type_name Utf8,
    active Bool,
    PRIMARY KEY (object_type_code)
);
-- migrate:statement
CREATE TABLE IF NOT EXISTS region_directory (
    region_code Utf8,
    region_name Utf8,
    active Bool,
    PRIMARY KEY (region_code)
);
-- migrate:statement
CREATE TABLE IF NOT EXISTS participants (
    participant_id Utf8,
    person_id Utf8,
    organization_id Utf8,
    status Utf8,
    payload_hash Utf8,
    created_at Utf8,
    PRIMARY KEY (participant_id)
);
-- migrate:statement
CREATE TABLE IF NOT EXISTS participant_profiles (
    participant_id Utf8,
    participant_type Utf8,
    legal_form Utf8,
    inn Utf8,
    team_size Utf8,
    vat Utf8,
    payment_forms Utf8,
    travel Utf8,
    nationwide Bool,
    min_order Utf8,
    max_project Utf8,
    portfolio_url Utf8,
    notes Utf8,
    PRIMARY KEY (participant_id)
);
-- migrate:statement
CREATE TABLE IF NOT EXISTS person_contact_methods (
    person_id Utf8,
    method_type Utf8,
    value Utf8,
    PRIMARY KEY (person_id, method_type)
);
-- migrate:statement
CREATE TABLE IF NOT EXISTS organization_registration (
    organization_id Utf8,
    legal_form Utf8,
    inn Utf8,
    PRIMARY KEY (organization_id)
);
-- migrate:statement
CREATE TABLE IF NOT EXISTS participant_competencies (
    participant_id Utf8,
    competency_code Utf8,
    PRIMARY KEY (participant_id, competency_code)
);
-- migrate:statement
CREATE TABLE IF NOT EXISTS participant_object_types (
    participant_id Utf8,
    object_type_code Utf8,
    PRIMARY KEY (participant_id, object_type_code)
);
-- migrate:statement
CREATE TABLE IF NOT EXISTS participant_regions (
    participant_id Utf8,
    region_code Utf8,
    city Utf8,
    is_base Bool,
    PRIMARY KEY (participant_id, region_code, city)
);
-- migrate:statement
CREATE TABLE IF NOT EXISTS participant_documents (
    participant_id Utf8,
    document_code Utf8,
    PRIMARY KEY (participant_id, document_code)
);
-- migrate:statement
CREATE TABLE IF NOT EXISTS participant_consent_events (
    event_id Utf8,
    person_id Utf8,
    participant_id Utf8,
    consent_type Utf8,
    consent_version Utf8,
    policy_version Utf8,
    form_version Utf8,
    consented Bool,
    source Utf8,
    created_at Utf8,
    PRIMARY KEY (event_id)
);
-- migrate:statement
UPSERT INTO competency_directory (competency_code, category_code, category_name, competency_name, active) VALUES
    ("CON-01", "CON", "Общестроительные работы", "Демонтажные работы", true),
    ("CON-02", "CON", "Общестроительные работы", "Фундаменты", true),
    ("CON-03", "CON", "Общестроительные работы", "Монолитные железобетонные работы", true),
    ("CON-04", "CON", "Общестроительные работы", "Кладка стен и перегородок", true),
    ("CON-05", "CON", "Общестроительные работы", "Стяжки и устройство полов", true),
    ("CON-06", "CON", "Общестроительные работы", "Гидроизоляционные работы", true),
    ("FIN-01", "FIN", "Отделочные работы", "Штукатурные работы", true),
    ("FIN-02", "FIN", "Отделочные работы", "Шпатлёвка и подготовка поверхностей", true),
    ("FIN-03", "FIN", "Отделочные работы", "Малярные работы", true),
    ("FIN-04", "FIN", "Отделочные работы", "Плиточные работы", true),
    ("FIN-05", "FIN", "Отделочные работы", "Напольные покрытия", true),
    ("FIN-06", "FIN", "Отделочные работы", "ГКЛ, перегородки и облицовки", true),
    ("FIN-07", "FIN", "Отделочные работы", "Подвесные и натяжные потолки", true),
    ("FIN-08", "FIN", "Отделочные работы", "Двери и столярные изделия", true),
    ("ELE-01", "ELE", "Электромонтажные работы", "ВРУ, ГРЩ и распределительные щиты", true),
    ("ELE-02", "ELE", "Электромонтажные работы", "Кабельные трассы и прокладка кабеля", true),
    ("ELE-03", "ELE", "Электромонтажные работы", "Силовое электрооборудование", true),
    ("ELE-04", "ELE", "Электромонтажные работы", "Освещение", true),
    ("ELE-05", "ELE", "Электромонтажные работы", "Розеточные и силовые группы", true),
    ("ELE-06", "ELE", "Электромонтажные работы", "Заземление и молниезащита", true),
    ("ELE-07", "ELE", "Электромонтажные работы", "Пусконаладочные работы ЭОМ", true),
    ("LOW-01", "LOW", "Слаботочные системы", "СКС и локальные сети", true),
    ("LOW-02", "LOW", "Слаботочные системы", "Видеонаблюдение", true),
    ("LOW-03", "LOW", "Слаботочные системы", "СКУД", true),
    ("LOW-04", "LOW", "Слаботочные системы", "Домофония", true),
    ("LOW-05", "LOW", "Слаботочные системы", "Охранная сигнализация", true),
    ("LOW-06", "LOW", "Слаботочные системы", "Системы связи, оповещения и часофикации", true),
    ("HVAC-01", "HVAC", "Вентиляция и кондиционирование", "Общеобменная вентиляция", true),
    ("HVAC-02", "HVAC", "Вентиляция и кондиционирование", "Кондиционирование", true),
    ("HVAC-03", "HVAC", "Вентиляция и кондиционирование", "Противодымная вентиляция", true),
    ("HVAC-04", "HVAC", "Вентиляция и кондиционирование", "Изготовление и монтаж воздуховодов", true),
    ("HVAC-05", "HVAC", "Вентиляция и кондиционирование", "Балансировка и пусконаладка ОВиК", true),
    ("WAT-01", "WAT", "Водоснабжение и канализация", "Внутреннее водоснабжение", true),
    ("WAT-02", "WAT", "Водоснабжение и канализация", "Внутренняя канализация", true),
    ("WAT-03", "WAT", "Водоснабжение и канализация", "Сантехнические приборы", true),
    ("WAT-04", "WAT", "Водоснабжение и канализация", "Насосные установки", true),
    ("HEAT-01", "HEAT", "Отопление и теплоснабжение", "Системы отопления", true),
    ("HEAT-02", "HEAT", "Отопление и теплоснабжение", "Тепловые пункты и ИТП", true),
    ("HEAT-03", "HEAT", "Отопление и теплоснабжение", "Котельные", true),
    ("FIRE-01", "FIRE", "Пожарная безопасность", "Пожарная сигнализация", true),
    ("FIRE-02", "FIRE", "Пожарная безопасность", "СОУЭ", true),
    ("FIRE-03", "FIRE", "Пожарная безопасность", "Автоматическое пожаротушение", true),
    ("FIRE-04", "FIRE", "Пожарная безопасность", "Внутренний противопожарный водопровод", true),
    ("FIRE-05", "FIRE", "Пожарная безопасность", "Огнезащита конструкций", true),
    ("EXT-01", "EXT", "Наружные инженерные сети", "Наружное электроснабжение", true),
    ("EXT-02", "EXT", "Наружные инженерные сети", "Наружное водоснабжение", true),
    ("EXT-03", "EXT", "Наружные инженерные сети", "Наружная канализация", true),
    ("EXT-04", "EXT", "Наружные инженерные сети", "Ливневая канализация", true),
    ("EXT-05", "EXT", "Наружные инженерные сети", "Наружные тепловые сети", true),
    ("EXT-06", "EXT", "Наружные инженерные сети", "Наружные слаботочные сети", true),
    ("MET-01", "MET", "Металлоконструкции", "Изготовление металлоконструкций", true),
    ("MET-02", "MET", "Металлоконструкции", "Монтаж металлоконструкций", true),
    ("MET-03", "MET", "Металлоконструкции", "Сварочные работы", true),
    ("MET-04", "MET", "Металлоконструкции", "Лестницы, ограждения и площадки", true),
    ("FAC-01", "FAC", "Фасады и кровля", "Вентилируемые фасады", true),
    ("FAC-02", "FAC", "Фасады и кровля", "Мокрые фасады", true),
    ("FAC-03", "FAC", "Фасады и кровля", "Фасадное остекление", true),
    ("FAC-04", "FAC", "Фасады и кровля", "Мягкая кровля", true),
    ("FAC-05", "FAC", "Фасады и кровля", "Скатная кровля", true),
    ("FAC-06", "FAC", "Фасады и кровля", "Водосточные системы", true),
    ("SITE-01", "SITE", "Земляные работы и благоустройство", "Земляные работы", true),
    ("SITE-02", "SITE", "Земляные работы и благоустройство", "Брусчатка и мощение", true),
    ("SITE-03", "SITE", "Земляные работы и благоустройство", "Асфальтирование", true),
    ("SITE-04", "SITE", "Земляные работы и благоустройство", "Озеленение", true),
    ("SITE-05", "SITE", "Земляные работы и благоустройство", "Ограждения и ворота", true),
    ("SPEC-01", "SPEC", "Специализированные работы", "Монтаж технологического оборудования", true),
    ("SPEC-02", "SPEC", "Специализированные работы", "Автоматизация и диспетчеризация", true),
    ("SPEC-03", "SPEC", "Специализированные работы", "Пусконаладочные работы", true),
    ("SPEC-04", "SPEC", "Специализированные работы", "Алмазное бурение и резка", true),
    ("SPEC-05", "SPEC", "Специализированные работы", "Промышленный альпинизм", true);
-- migrate:statement
UPSERT INTO object_type_directory (object_type_code, object_type_name, active) VALUES
    ("OBJ-01", "Частные дома и коттеджи", true),
    ("OBJ-02", "Квартиры", true),
    ("OBJ-03", "Офисы", true),
    ("OBJ-04", "Торговые помещения и магазины", true),
    ("OBJ-05", "Рестораны, кафе, гостиницы", true),
    ("OBJ-06", "Склады и логистические комплексы", true),
    ("OBJ-07", "Производственные и промышленные объекты", true),
    ("OBJ-08", "Многоквартирные дома", true),
    ("OBJ-09", "Бизнес-центры", true),
    ("OBJ-10", "Образовательные и социальные объекты", true),
    ("OBJ-11", "Медицинские объекты", true),
    ("OBJ-12", "Государственные и общественные здания", true),
    ("OBJ-13", "Инфраструктурные объекты", true),
    ("OBJ-14", "ЦОД, серверные и технические помещения", true),
    ("OBJ-15", "Опасные производственные объекты (ОПО)", true);
-- migrate:statement
UPSERT INTO region_directory (region_code, region_name, active) VALUES
    ("REG-001", "Республика Адыгея", true),
    ("REG-002", "Республика Алтай", true),
    ("REG-003", "Республика Башкортостан", true),
    ("REG-004", "Республика Бурятия", true),
    ("REG-005", "Республика Дагестан", true),
    ("REG-006", "Республика Ингушетия", true),
    ("REG-007", "Кабардино-Балкарская Республика", true),
    ("REG-008", "Республика Калмыкия", true),
    ("REG-009", "Карачаево-Черкесская Республика", true),
    ("REG-010", "Республика Карелия", true),
    ("REG-011", "Республика Коми", true),
    ("REG-012", "Республика Марий Эл", true),
    ("REG-013", "Республика Мордовия", true),
    ("REG-014", "Республика Саха (Якутия)", true),
    ("REG-015", "Республика Северная Осетия — Алания", true),
    ("REG-016", "Республика Татарстан", true),
    ("REG-017", "Республика Тыва", true),
    ("REG-018", "Удмуртская Республика", true),
    ("REG-019", "Республика Хакасия", true),
    ("REG-020", "Чеченская Республика", true),
    ("REG-021", "Чувашская Республика", true),
    ("REG-022", "Алтайский край", true),
    ("REG-023", "Забайкальский край", true),
    ("REG-024", "Камчатский край", true),
    ("REG-025", "Краснодарский край", true),
    ("REG-026", "Красноярский край", true),
    ("REG-027", "Пермский край", true),
    ("REG-028", "Приморский край", true),
    ("REG-029", "Ставропольский край", true),
    ("REG-030", "Хабаровский край", true),
    ("REG-031", "Амурская область", true),
    ("REG-032", "Архангельская область", true),
    ("REG-033", "Астраханская область", true),
    ("REG-034", "Белгородская область", true),
    ("REG-035", "Брянская область", true),
    ("REG-036", "Владимирская область", true),
    ("REG-037", "Волгоградская область", true),
    ("REG-038", "Вологодская область", true),
    ("REG-039", "Воронежская область", true),
    ("REG-040", "Ивановская область", true),
    ("REG-041", "Иркутская область", true),
    ("REG-042", "Калининградская область", true),
    ("REG-043", "Калужская область", true),
    ("REG-044", "Кемеровская область — Кузбасс", true),
    ("REG-045", "Кировская область", true),
    ("REG-046", "Костромская область", true),
    ("REG-047", "Курганская область", true),
    ("REG-048", "Курская область", true),
    ("REG-049", "Ленинградская область", true),
    ("REG-050", "Липецкая область", true),
    ("REG-051", "Магаданская область", true),
    ("REG-052", "Московская область", true),
    ("REG-053", "Мурманская область", true),
    ("REG-054", "Нижегородская область", true),
    ("REG-055", "Новгородская область", true),
    ("REG-056", "Новосибирская область", true),
    ("REG-057", "Омская область", true),
    ("REG-058", "Оренбургская область", true),
    ("REG-059", "Орловская область", true),
    ("REG-060", "Пензенская область", true),
    ("REG-061", "Псковская область", true),
    ("REG-062", "Ростовская область", true),
    ("REG-063", "Рязанская область", true),
    ("REG-064", "Самарская область", true),
    ("REG-065", "Саратовская область", true),
    ("REG-066", "Сахалинская область", true),
    ("REG-067", "Свердловская область", true),
    ("REG-068", "Смоленская область", true),
    ("REG-069", "Тамбовская область", true),
    ("REG-070", "Тверская область", true),
    ("REG-071", "Томская область", true),
    ("REG-072", "Тульская область", true),
    ("REG-073", "Тюменская область", true),
    ("REG-074", "Ульяновская область", true),
    ("REG-075", "Челябинская область", true),
    ("REG-076", "Ярославская область", true),
    ("REG-077", "Москва", true),
    ("REG-078", "Санкт-Петербург", true),
    ("REG-079", "Еврейская автономная область", true),
    ("REG-080", "Ненецкий автономный округ", true),
    ("REG-081", "Ханты-Мансийский автономный округ — Югра", true),
    ("REG-082", "Чукотский автономный округ", true),
    ("REG-083", "Ямало-Ненецкий автономный округ", true),
    ("REG-084", "Республика Крым", true),
    ("REG-085", "Севастополь", true),
    ("REG-086", "Донецкая Народная Республика", true),
    ("REG-087", "Луганская Народная Республика", true),
    ("REG-088", "Запорожская область", true),
    ("REG-089", "Херсонская область", true),
    ("RU-ALL", "Вся Россия", true);
