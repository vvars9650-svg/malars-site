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
    ("CON", "Общестроительные работы", "CON-01", "Демонтажные работы", true),
    ("CON", "Общестроительные работы", "CON-02", "Фундаменты", true),
    ("CON", "Общестроительные работы", "CON-03", "Монолитные железобетонные работы", true),
    ("CON", "Общестроительные работы", "CON-04", "Кладка стен и перегородок", true),
    ("CON", "Общестроительные работы", "CON-05", "Стяжки и устройство полов", true),
    ("CON", "Общестроительные работы", "CON-06", "Гидроизоляционные работы", true),
    ("FIN", "Отделочные работы", "FIN-01", "Штукатурные работы", true),
    ("FIN", "Отделочные работы", "FIN-02", "Шпатлёвка и подготовка поверхностей", true),
    ("FIN", "Отделочные работы", "FIN-03", "Малярные работы", true),
    ("FIN", "Отделочные работы", "FIN-04", "Плиточные работы", true),
    ("FIN", "Отделочные работы", "FIN-05", "Напольные покрытия", true),
    ("FIN", "Отделочные работы", "FIN-06", "ГКЛ, перегородки и облицовки", true),
    ("FIN", "Отделочные работы", "FIN-07", "Подвесные и натяжные потолки", true),
    ("FIN", "Отделочные работы", "FIN-08", "Двери и столярные изделия", true),
    ("ELE", "Электромонтажные работы", "ELE-01", "ВРУ, ГРЩ и распределительные щиты", true),
    ("ELE", "Электромонтажные работы", "ELE-02", "Кабельные трассы и прокладка кабеля", true),
    ("ELE", "Электромонтажные работы", "ELE-03", "Силовое электрооборудование", true),
    ("ELE", "Электромонтажные работы", "ELE-04", "Освещение", true),
    ("ELE", "Электромонтажные работы", "ELE-05", "Розеточные и силовые группы", true),
    ("ELE", "Электромонтажные работы", "ELE-06", "Заземление и молниезащита", true),
    ("ELE", "Электромонтажные работы", "ELE-07", "Пусконаладочные работы ЭОМ", true),
    ("LOW", "Слаботочные системы", "LOW-01", "СКС и локальные сети", true),
    ("LOW", "Слаботочные системы", "LOW-02", "Видеонаблюдение", true),
    ("LOW", "Слаботочные системы", "LOW-03", "СКУД", true),
    ("LOW", "Слаботочные системы", "LOW-04", "Домофония", true),
    ("LOW", "Слаботочные системы", "LOW-05", "Охранная сигнализация", true),
    ("LOW", "Слаботочные системы", "LOW-06", "Системы связи, оповещения и часофикации", true),
    ("HVAC", "Вентиляция и кондиционирование", "HVAC-01", "Общеобменная вентиляция", true),
    ("HVAC", "Вентиляция и кондиционирование", "HVAC-02", "Кондиционирование", true),
    ("HVAC", "Вентиляция и кондиционирование", "HVAC-03", "Противодымная вентиляция", true),
    ("HVAC", "Вентиляция и кондиционирование", "HVAC-04", "Изготовление и монтаж воздуховодов", true),
    ("HVAC", "Вентиляция и кондиционирование", "HVAC-05", "Балансировка и пусконаладка ОВиК", true),
    ("WAT", "Водоснабжение и канализация", "WAT-01", "Внутреннее водоснабжение", true),
    ("WAT", "Водоснабжение и канализация", "WAT-02", "Внутренняя канализация", true),
    ("WAT", "Водоснабжение и канализация", "WAT-03", "Сантехнические приборы", true),
    ("WAT", "Водоснабжение и канализация", "WAT-04", "Насосные установки", true),
    ("HEAT", "Отопление и теплоснабжение", "HEAT-01", "Системы отопления", true),
    ("HEAT", "Отопление и теплоснабжение", "HEAT-02", "Тепловые пункты и ИТП", true),
    ("HEAT", "Отопление и теплоснабжение", "HEAT-03", "Котельные", true),
    ("FIRE", "Пожарная безопасность", "FIRE-01", "Пожарная сигнализация", true),
    ("FIRE", "Пожарная безопасность", "FIRE-02", "СОУЭ", true),
    ("FIRE", "Пожарная безопасность", "FIRE-03", "Автоматическое пожаротушение", true),
    ("FIRE", "Пожарная безопасность", "FIRE-04", "Внутренний противопожарный водопровод", true),
    ("FIRE", "Пожарная безопасность", "FIRE-05", "Огнезащита конструкций", true),
    ("EXT", "Наружные инженерные сети", "EXT-01", "Наружное электроснабжение", true),
    ("EXT", "Наружные инженерные сети", "EXT-02", "Наружное водоснабжение", true),
    ("EXT", "Наружные инженерные сети", "EXT-03", "Наружная канализация", true),
    ("EXT", "Наружные инженерные сети", "EXT-04", "Ливневая канализация", true),
    ("EXT", "Наружные инженерные сети", "EXT-05", "Наружные тепловые сети", true),
    ("EXT", "Наружные инженерные сети", "EXT-06", "Наружные слаботочные сети", true),
    ("MET", "Металлоконструкции", "MET-01", "Изготовление металлоконструкций", true),
    ("MET", "Металлоконструкции", "MET-02", "Монтаж металлоконструкций", true),
    ("MET", "Металлоконструкции", "MET-03", "Сварочные работы", true),
    ("MET", "Металлоконструкции", "MET-04", "Лестницы, ограждения и площадки", true),
    ("FAC", "Фасады и кровля", "FAC-01", "Вентилируемые фасады", true),
    ("FAC", "Фасады и кровля", "FAC-02", "Мокрые фасады", true),
    ("FAC", "Фасады и кровля", "FAC-03", "Фасадное остекление", true),
    ("FAC", "Фасады и кровля", "FAC-04", "Мягкая кровля", true),
    ("FAC", "Фасады и кровля", "FAC-05", "Скатная кровля", true),
    ("FAC", "Фасады и кровля", "FAC-06", "Водосточные системы", true),
    ("SITE", "Земляные работы и благоустройство", "SITE-01", "Земляные работы", true),
    ("SITE", "Земляные работы и благоустройство", "SITE-02", "Брусчатка и мощение", true),
    ("SITE", "Земляные работы и благоустройство", "SITE-03", "Асфальтирование", true),
    ("SITE", "Земляные работы и благоустройство", "SITE-04", "Озеленение", true),
    ("SITE", "Земляные работы и благоустройство", "SITE-05", "Ограждения и ворота", true),
    ("SPEC", "Специализированные работы", "SPEC-01", "Монтаж технологического оборудования", true),
    ("SPEC", "Специализированные работы", "SPEC-02", "Автоматизация и диспетчеризация", true),
    ("SPEC", "Специализированные работы", "SPEC-03", "Пусконаладочные работы", true),
    ("SPEC", "Специализированные работы", "SPEC-04", "Алмазное бурение и резка", true),
    ("SPEC", "Специализированные работы", "SPEC-05", "Промышленный альпинизм", true);
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
