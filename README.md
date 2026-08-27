# МАЛАРС — MVP сайта

Готовый статический сайт для размещения на GitHub Pages.

## Что внутри

- `index.html` — вся структура сайта
- `styles.css` — дизайн и мобильная адаптация
- `script.js` — отправка двух форм
- `apps-script/Code.gs` — обработчик для записи заявок в Google Sheets

## Быстрый запуск на GitHub Pages

1. Создайте новый репозиторий на GitHub, например `malars-site`.
2. Загрузите в корень репозитория:
   - `index.html`
   - `styles.css`
   - `script.js`
3. Откройте `Settings` → `Pages`.
4. В `Build and deployment` выберите `Deploy from a branch`.
5. Branch: `main`, Folder: `/ (root)`.
6. Сохраните. GitHub выдаст технический адрес сайта.

## Подключение Google Sheets

1. Создайте пустую Google-таблицу.
2. Возьмите ID таблицы из URL:
   `https://docs.google.com/spreadsheets/d/ЭТОТ_ID/edit`
3. В таблице: `Расширения` → `Apps Script`.
4. Вставьте содержимое `apps-script/Code.gs`.
5. В первой строке замените `PASTE_GOOGLE_SHEET_ID_HERE` на ID вашей таблицы.
6. В Apps Script: `Deploy` → `New deployment` → тип `Web app`.
7. Execute as: `Me`.
8. Who has access: `Anyone`.
9. Скопируйте URL веб-приложения.
10. В `script.js` вставьте его:
    `const GOOGLE_SCRIPT_URL = "ВАШ_URL";`
11. Сохраните изменения в GitHub.

После этого:
- форма «Поставить задачу» пишет в лист `Заявки заказчиков`;
- форма «Добавиться в базу» пишет в лист `Подрядчики`.

## Подключение домена Timeweb

Сначала опубликуйте сайт на GitHub Pages. Затем в настройках Pages укажите ваш домен в поле `Custom domain`.

После этого GitHub покажет, какие DNS-записи должны быть настроены. Их нужно внести в DNS-зоне домена в Timeweb.

Не покупайте отдельный хостинг только ради этого сайта: GitHub Pages уже размещает его.
