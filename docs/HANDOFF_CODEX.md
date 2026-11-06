# HANDOFF CODEX — МАЛАРС

Последняя проверка: 2026-11-06

## GitHub

- Репозиторий: https://github.com/vvars9650-svg/malars-site
- Основная ветка: `main`
- Проверенный HEAD: `9a1773fa078430d98d7a805f0032ca81826b9ad3`
- Полный снимок main восстановлен в локальном `repo-main`; все 31 blob SHA и корневое дерево совпали с GitHub.
- Локальная рабочая ветка чистая и отслеживает `origin/main`. Прямой `git ls-remote` из среды блокируется DNS; GitHub connector работает.
- Создана ветка handoff `codex/handoff-code-2026-11-06`; этот файл записывается в неё, main не менялся.

## Проверки кода

- `python -m unittest discover -s backend/tests -v`: 9 passed, 1 skipped.
- Пропущен только интеграционный тест реальной YDB: ожидает `RUN_YDB_INTEGRATION=1` и доступного тестового runtime.
- В текущем backend реализована только форма заказчика. Публичная анкета участника всё ещё отправляется через Apps Script; схема YDB для участников/компетенций ещё не создана.
- В репозитории есть OIDC-диагностика и ручной YDB integration workflow. Полного workflow деплоя TEST ещё нет.
- Никаких изменений кода после `9a1773f` не сделано.

## Yandex Cloud TEST — проверено в консоли

- Облако `malars`: `b1gh45ejbkk3jcuutd48`.
- Каталог `malars-test`: `b1glkul9pg8q9sqq20ou`.
- YDB `malars-test-ydb`: `etnfksq3umfh18ghde7m`, Serverless, Running.
- Путь: `/ru-central1/b1gh45ejbkk3jcuutd48/etnfksq3umfh18ghde7m`.
- Endpoint: `grpcs://ydb.serverless.yandexcloud.net:2135`.
- Заданные ограничения YDB: 10 RU/с, 50 ГБ, выделенная пропускная способность 0.
- Таблицы в схеме: `persons`, `organizations`, `customer_requests`, `legal_documents`, `consent_events`, `schema_migrations`.
- Сервисный аккаунт runtime `malars-test-runtime`: `ajeiujenn2jakrrak0gf`, Active.
- Его текущая прямая роль на YDB — `ydb.viewer`. В таблицах нет права записи; на этой роли также доступно чтение данных YDB.
- Сервисный аккаунт deployer `malars-test-deployer`: `ajes8qkmdkn775e4i7d1`; на YDB — `ydb.editor`. В каталоге видны `container-registry.images.pusher`, `serverless-containers.editor`, `api-gateway.editor`, `storage.editor`; необходимость `storage.editor` требует отдельной проверки.
- В TEST-каталоге пока нет реестра образов, Serverless Container и API Gateway.
- Backup YDB: расписание daily, 17:00 UTC, TTL 7 дней. На проверке 2026-11-06 последний backup отображался как `Creating`, создан 2026-11-05 17:25 UTC. Защита от удаления была выключена.

## Архитектурный риск и решение владельца

Официальная документация Yandex Cloud сообщает, что Yandex Container Registry станет read-only 2026-11-10 и прекратит работу 2026-12-14. Serverless Containers в текущей документации принимает Docker-образы только из Yandex Container Registry. Официальный Python 3.12 Cloud Functions runtime, интеграция API Gateway → Cloud Functions и metadata-auth для YDB доступны как альтернативная бессерверная цепочка.

Ссылки:
- https://yandex.cloud/ru/docs/container-registry/api-ref/authentication
- https://yandex.cloud/ru/docs/serverless-containers/concepts/container
- https://yandex.cloud/ru/docs/api-gateway/concepts/extensions/cloud-functions
- https://yandex.cloud/ru/docs/functions/lang/python/
- https://ydb.tech/docs/en/reference/ydb-sdk/auth?version=main

Переход на Cloud Functions меняет утверждённый MASTER контур. До явного решения владельца никакие runtime/registry/gateway ресурсы не создаются.

## Блокирующее действие владельца

1. В YDB SQL Editor `malars-test-ydb` выполнить ранее подготовленные точечные `GRANT CONNECT`, `DESCRIBE SCHEMA`, `SELECT` для `customer_requests` и `UPDATE ROW` для четырёх intake-таблиц субъекту `ajeiujenn2jakrrak0gf@as`.
2. После успешного SQL заменить на resource ACL базе для runtime роль `ydb.viewer` на `ydb.auditor`.
3. Подтвердить, разрешён ли переход с прекращаемого Container Registry / Serverless Containers на Cloud Functions + API Gateway.

На последней проверке ACL runtime не менялся; выполнение этого действия владельцем не подтверждено. Ни одной cloud-операции изменения, миграции схемы или записи реальных данных не выполняли.

## Следующий шаг

После действий владельца: повторно прочитать YDB ACL, подтвердить SQL-права, запустить интеграционный тест только на синтетических данных и продолжить с выбранной архитектурой. PROD не развёртывать до юридического допуска и отдельного разрешения владельца.
