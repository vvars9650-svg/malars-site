# HANDOFF CODEX — МАЛАРС

Последняя сверка: 2026-11-06.

## Код и восстановление

- Репозиторий: `vvars9650-svg/malars-site`.
- Рабочая ветка: `codex/participant-intake-ydb`.
- Подтверждённая исходная точка: `ad6eee1bf842d405add3bc5b322d6d22e0cb1225`.
- На новом ПК ветка восстановлена с точным совпадением remote SHA.
- `main` и PROD в ходе восстановления не изменялись.

## Подтверждённое состояние TEST

Run #5: https://github.com/vvars9650-svg/malars-site/actions/runs/42224539813

Логи подтверждают: OIDC credentials получены; миграция 0002 применена,
`migrations_added=1 migrations_total=2`, повтор — `migrations_added=0 migrations_total=2`.
Customer POST вернул 200 вместо ожидаемого 201 из-за постоянного синтетического
Idempotency-Key. До participant intake тест не дошёл.

Фикстура исправлена: customer и participant получают свежие UUID4 при каждом
запуске. Повторная отправка внутри запуска использует тот же ключ и ожидает 200;
проверки чтения и participant conflict 409 сохранены. Используются только
синтетические данные. Старые записи не удаляются.

## Ресурсы и дальнейшие действия

- Folder TEST: `b1glkul9pg8q9sqq20ou`.
- YDB: `etnfksq3umfh18ghde7m`.
- Database: `/ru-central1/b1gh45ejbkk3jcuutd48/etnfksq3umfh18ghde7m`.
- Runtime service account: `ajeiujenn2jakrrak0gf`.
- CI deployer: `ajes8qkmdkn775e4i7d1`.
- Последнее ранее зафиксированное состояние прав: runtime `ydb.viewer`,
  deployer `ydb.editor` на TEST YDB; при продолжении сверить фактически.

После локальных тестов отправить исправление в рабочую ветку: push запускает
`MALARS TEST YDB integration`. Проверить новый run и оба intake на реальной YDB.
После успеха перейти к минимальным табличным правам runtime и настройке
Cloud Functions Python 3.12 + API Gateway в TEST. Adapter уже находится
в `backend/function.py`. Миграции runtime не выполняет.

Не менять PROD, DNS, GitHub Pages/Apps Script; не использовать реальные ПД.
