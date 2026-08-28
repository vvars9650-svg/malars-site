// МАЛАРС-ГРУПП — патч формы заказчика с загрузкой исходных данных.
// Замените существующую функцию saveClient_ на эту и добавьте helper saveClientFiles_.
// После сохранения обновите существующее Web App deployment, выбрав New version.

const CLIENT_FILES_FOLDER_ID = '1ZUnxJc2MoHyNFc6jrx7OwOZx5bXsbC1k';

function saveClient_(ss, data) {
  const sheet = getSheet_(ss, SHEETS.clients);

  requireText_(data.name, 'Имя');
  requireText_(data.contact, 'Контакт');
  requireText_(data.email, 'Email для коммерческого предложения');
  requireText_(data.task, 'Задача');

  const fileLinks = saveClientFiles_(data);

  sheet.appendRow([
    new Date(),
    clean_(data.name),
    clean_(data.contact),
    clean_(data.email),
    clean_(data.city),
    clean_(data.task),
    clean_(data.deadline),
    clean_(data.page),
    fileLinks.join('\n')
  ]);

  return {
    type: 'client',
    message: 'Заявка заказчика сохранена',
    filesSaved: fileLinks.length
  };
}

function saveClientFiles_(data) {
  const files = Array.isArray(data.files) ? data.files : [];
  if (!files.length) return [];

  const root = DriveApp.getFolderById(CLIENT_FILES_FOLDER_ID);
  const time = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyy-MM-dd HH-mm-ss');
  const clientName = String(data.name || 'Клиент')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  const folder = root.createFolder(`${time} — ${clientName || 'Клиент'}`);

  return files.map(function(file) {
    if (!file || !file.data || !file.name) return '';

    const bytes = Utilities.base64Decode(String(file.data));
    const blob = Utilities.newBlob(
      bytes,
      String(file.type || 'application/octet-stream'),
      String(file.name).slice(0, 180)
    );
    const created = folder.createFile(blob);
    return created.getUrl();
  }).filter(String);
}
