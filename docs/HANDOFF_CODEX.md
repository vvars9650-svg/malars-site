# HANDOFF CODEX — МАЛАРС

Последняя сверка: 2026-11-06.

## Источник кода

- GitHub: `vvars9650-svg/malars-site`
- Рабочая ветка: `codex/participant-intake-ydb`
- Текущий remote HEAD до этого handoff: `57115e7acd898217ec60108ab1f79f11f235a77b`
- Основной `main` остался на `9a1773fa078430d98d7a805f0032ca81826b9ad3`.
- Локальная ветка синхронизирована с remote HEAD. Этот handoff-файл подготовлен к checkpoint commit и пока остаётся локальным staged-изменением.

## Код и локальные проверки

В ветке реализованы:

- `POST /api/customer-requests` и новый `POST /api/participants`;
- серверная валидация синтетических форм, consent version, справочников и idempotency;
- миграция `0002_participant_intake.sql` для участников, контактов, организаций, профилей, справочников и связей;
- Cloud Functions Python 3.12 adapter;
- integration workflow, который запускает миграции дважды, затем customer и participant synthetic intake;
- новый регрессионный тест уникальности и соответствия ключей competency directory.

Локальный результат на коде HEAD `9974152000be191523d533979cb85e8b0eab2b39` (последующие commits изменили только workflow): **24 tests passed; 1 real-YDB integration test skipped**. Пропуск требует GitHub Actions OIDC deployer.

## Yandex Cloud TEST — фактическое состояние

- Cloud `b1gh45ejbkk3jcuutd48`, folder `b1glkul9pg8q9sqq20ou`.
- YDB `malars-test-ydb`: `etnfksq3umfh18ghde7m`, Running; path `/ru-central1/b1gh45ejbkk3jcuutd48/etnfksq3umfh18ghde7m`.
- Runtime service account `ajeiujenn2jakrrak0gf` всё ещё имеет только `ydb.viewer`.
- Deployer `ajes8qkmdkn775e4i7d1` имеет `ydb.editor` на TEST YDB.
- В folder `malars-test` пока нет Cloud Function, API Gateway или static frontend bucket.
- В YDB ACL последний осмотр показывает runtime `ydb.viewer`. Migration 0002 ещё не применена.

## GitHub Actions — последний запуск

Remote HEAD `57115e7` содержит push-trigger только для `codex/participant-intake-ydb`. Ручной dispatch из браузера недоступен: GitHub UI открыт без авторизации, локального `gh` CLI нет.

Для запуска push-trigger добавлен на ветку `codex/participant-intake-ydb` только для `MALARS TEST YDB integration`. Последний запуск #4 (`42221420382`) завершился до старта шагов, потому что GitHub Environment `malars-test` не разрешал эту ветку. В job не было шагов; миграции в YDB не применялись.

Владелец подтвердил, что добавил ветку `codex/participant-intake-ydb` в разрешённые deployment branches `malars-test`. Новый run будет создан следующим push в эту ветку. Предыдущий run #4 уже завершился до старта шагов и повторно не запускается.

## Архитектура

Владелец разрешил использовать Cloud Functions Python 3.12 + API Gateway; YDB и оба intake-процесса остаются целевыми.

Yandex Container Registry станет read-only 2026-11-10 и завершит работу 2026-12-14; Serverless Containers сейчас принимает только образы из него. Новые реестры/контейнеры не создавать.

## Следующий шаг

Завершить checkpoint-коммит с этим файлом. Push должен запустить новый `MALARS TEST YDB integration` через deployer. Проверить run ID/HEAD и дождаться результата. Только если migration 0002 и оба synthetic intake пройдут на реальной TEST YDB, предоставить владельцу точный минимальный GRANT для runtime по существующим таблицам; затем заменить `ydb.viewer` на `ydb.auditor`.

Не трогать PROD, не передавать реальные ПД, не публиковать старый GitHub Pages/Apps Script, не менять DNS.
