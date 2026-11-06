# HANDOFF CODEX — МАЛАРС

Последняя сверка: 2026-11-06, после восстановления на новом ПК.

## Источник и проверенная точка

- Repository: `vvars9650-svg/malars-site`.
- Branch: `codex/participant-intake-ydb`.
- Восстановленная исходная точка: `ad6eee1bf842d405add3bc5b322d6d22e0cb1225`.
- Последний проверенный backend commit: `2ff0a1a95c89580a6d9f8d9cc3169e8b7c60418c`.
- `main`, PROD, DNS, GitHub Pages и Apps Script не изменялись.

## Проверки

Успешный реальный TEST run:
https://github.com/vvars9650-svg/malars-site/actions/runs/42275259447

- Миграции 0001 и 0002 уже применены; оба повторных запуска: added=0, total=2.
- Customer: создание 201, повтор 200, чтение 200.
- Participant: создание 201, повтор 200, чтение 200; другой payload с тем же ключом: 409.
- Customer read без авторизации: 401.
- Локально: 25 тестов всего, 24 успешных, 1 real-YDB integration skipped.

Исправления: UUID4 вместо постоянных ключей; преобразование region code в
region_code при записи participant; SDK serialization regression test;
participant HTTP timeout 60 секунд. Прежний 10-секундный timeout прерывал
тест и останавливал активную YDB-сессию. Синтетические записи не удалялись.

## Фактические ресурсы TEST

- Folder: `b1glkul9pg8q9sqq20ou`.
- YDB: `etnfksq3umfh18ghde7m`, Running, лимит 10 RU/s.
- Database: `/ru-central1/b1gh45ejbkk3jcuutd48/etnfksq3umfh18ghde7m`.
- Runtime: `ajeiujenn2jakrrak0gf`, на YDB подтверждён `ydb.viewer`.
- Deployer: `ajes8qkmdkn775e4i7d1`, на YDB подтверждён `ydb.editor`.
- Создана приватная функция `malars-test-intake`: `d4eei0qik3o9n3ac5n66`.
- Версия `d4e16fngs09r39j0f21c`: Active, python312, function.handler,
  timeout 60 секунд, 128 MB, service account malars-test-runtime.
- Установлены YDB_ENDPOINT, YDB_DATABASE, YDB_AUTH_MODE=metadata.
- ADMIN_READ_TOKEN отсутствует. Прямой публичный вызов функции выключен.
- Проверка через консоль: GET /health -> statusCode 200, body {"status":"ok"}.
- Логирование в консоли временно недоступно из-за ограниченного режима платформы.

## Применено после подтверждения владельца

Владелец подтвердил применение подготовленной конфигурации в этом чате.

- Выполнен `backend/deploy/runtime-grants.test.sql`: SELECT ROW + UPDATE ROW
  на 13 таблицах intake. SQL-редактор подтвердил успешное выполнение.
- Database-scoped `ydb.viewer` заменён на `ydb.auditor`; роль сверена в консоли.
- На функции назначен единственный прямой ACL: `functions.functionInvoker`
  для `serviceAccount:ajeiujenn2jakrrak0gf`. Readback через list-access-bindings
  подтвердил отсутствие публичных субъектов.
- Создан API Gateway `malars-test-intake-api`, ID `d5dmc1cn4hgv2sulpdpq`, Active.
- Адрес TEST: https://d5dmc1cn4hgv2sulpdpq.d8epmcec.apigw.yandexcloud.net
- Применена спецификация `backend/deploy/api-gateway.test.yaml`.
- Публикуются GET /health и два POST intake. CORS не включён;
  frontend PROD, DNS и маршруты чтения данных не подключались.

## Проверки после развёртывания

Через публичный TEST Gateway и реальный runtime SA:

- /health: 200, {"status":"ok"}.
- Customer POST: 201; повтор с тем же UUID: 200, ответ идентичен.
- Participant POST: 201; повтор: 200, ответ идентичен; изменённый payload: 409.
- GET обоих intake/{uuid}: 404, маршруты чтения не опубликованы.
- Прямой анонимный вызов Cloud Function: 403.

В Cloud Shell с временным IAM token, полученным через impersonation именно
`ajeiujenn2jakrrak0gf`, выполнен `backend/deploy/check_runtime_acl.py`:
все четыре запрета подтверждены — чтение schema_migrations, чтение
competency_directory, DELETE строки customer_requests и CREATE TABLE.
Проверка DELETE использует не-UUID sentinel, который не может совпасть с
ID intake. CREATE использует уникальное имя synthetic_runtime_acl_probe_*;
создание запрещено, таблица не появилась. Реальные данные не затрагивались.
YDB возвращает AccessDenied также внутри Aborted; скрипт учитывает оба формата.
Credentials передавались только в окружении процесса, не выводились и не
сохранялись в репозитории. Использовались только синтетические заявки.

## Следующий этап

TEST backend и цепочка Gateway -> private Function -> YDB проверены.
Следующая отдельная задача: подключение TEST frontend и точного CORS origin,
после определения его адреса; не направлять туда PROD frontend.
Deployer сохраняет ydb.editor для versioned TEST migrations;
не расширять права runtime. Cloud Shell session завершится после бездействия.

## Локальное окружение

`malars-site/.venv` содержит закреплённый YDB SDK и исключено из Git.
`.local-artifacts` содержит function ZIP и screenshots, тоже исключено из Git.
Инструкции развёртывания: `backend/deploy/README.md`.

## MAL-20261106-01 — TEST frontend и CORS (2026-11-07)

Изолированный TEST frontend опубликован в Object Storage, не затрагивая PROD,
LEGACY, DNS, GitHub Pages или Apps Script:

- Bucket: `malars-test-frontend-vl-061126-01`; публично только чтение объектов,
  listing и чтение настроек закрыты.
- Origin: https://malars-test-frontend-vl-061126-01.website.yandexcloud.net
- Gateway: https://d5dmc1cn4hgv2sulpdpq.d8epmcec.apigw.yandexcloud.net
- CORS allowlist содержит только этот точный origin, POST/OPTIONS,
  Content-Type и Idempotency-Key; maxAge=600, OPTIONS success=204.
- Функция остаётся приватной; применённая версия: `d4eh87bbcq8u7c0c4kla`.

TEST frontend использует существующий интерфейс и оба API маршрута. Маршрутизация
TEST запросов и тестовые исправления статусов находятся в отдельном
`test-frontend/test-api-adapter.js` и в TEST-only build patch. Исходные
`script-core.js` и `site-latest.js` остаются неизменными в Git. Владелец подтвердил,
что публичные контакты должны оставаться на сайте; они не менялись. TEST build
удаляет старый Apps Script URL и делает отправку fail-closed, если адаптер не
загрузился. Показывается предупреждение использовать только синтетические
данные; три юридические страницы явно помечены черновиками. В TEST загрузка
файлов отключена с объяснением лимитов будущей реализации.

Реальный браузерный E2E на синтетических данных: customer POST -> 201,
ID `66ca1f29-671c-40a7-bcf8-eb06c9d66646`; participant POST -> 201,
ID `c8cb7b66-ce4a-4116-8a6d-9e417098fe30`. Успешные cross-origin POST с
`application/json` и `Idempotency-Key` подтверждают прохождение preflight для
разрешённого origin. Отдельный отрицательный OPTIONS с чужим origin пока не
зафиксирован. Новая версия backend добавляет оба customer contact method в
существующую таблицу без изменения схемы. Нужен readback и replay/conflict тест
после интеграционного CI запуска; последний локальный прогон: 26 тестов,
25 passed, 1 real-YDB integration skipped без облачных credentials.

Локальная безопасная ветка подготовлена от подтверждённого remote HEAD;
исходный локальный commit сохранён отдельной веткой. В текущем diff нет изменений
`script-core.js`/`site-latest.js`. После push сюда добавить SHA и ссылку CI.
Отдельный отчёт на Drive создан управляющим чатом; при закрытии обновить его
фактическими результатами.
