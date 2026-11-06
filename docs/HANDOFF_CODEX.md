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

## Подготовлено, но ещё не применено

`backend/deploy/runtime-grants.test.sql`: SELECT ROW + UPDATE ROW на 13 таблицах
intake; schema, DELETE, ACL, directories, legal_documents и schema_migrations
не входят. Требуется заменить database-scoped ydb.viewer на ydb.auditor.

`backend/deploy/api-gateway.test.yaml`: приватная Cloud Function, вызов от
runtime SA. Для этого требуется functions.functionInvoker на этой функции
для runtime SA. Шлюз `malars-test-intake-api` ещё НЕ создан; форма создания
заполнена в in-app browser, спецификация сверена через readback.
Публикуются только GET /health и POST /api/customer-requests, POST /api/participants.
Маршрутов чтения данных нет; CORS не включён, PROD frontend не подключён.

GRANT заполнен в SQL-редакторе YDB, НЕ выполнен. Для изменений ACL и открытия
TEST endpoints ожидается отдельное подтверждение владельца согласно правилам
browser automation. После подтверждения применить GRANT, сменить роль,
назначить functionInvoker на функцию, создать шлюз, проверить оба intake
через Gateway и фактические запреты runtime на DDL/DELETE/посторонние таблицы.

## Локальное окружение

`malars-site/.venv` содержит закреплённый YDB SDK и исключено из Git.
`.local-artifacts` содержит function ZIP и screenshots, тоже исключено из Git.
Инструкции развёртывания: `backend/deploy/README.md`.
