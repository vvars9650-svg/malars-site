// МАЛАРС — патч для формы заказчика.
// В основном Code.gs замените существующую функцию saveClient_ на эту.
// После сохранения обновите существующее Web App deployment, выбрав New version.

function saveClient_(ss, data) {
  const sheet = getSheet_(ss, SHEETS.clients);

  requireText_(data.name, 'Имя');
  requireText_(data.contact, 'Контакт');
  requireText_(data.email, 'Email для коммерческого предложения');
  requireText_(data.task, 'Задача');

  sheet.appendRow([
    new Date(),
    clean_(data.name),
    clean_(data.contact),
    clean_(data.email),
    clean_(data.city),
    clean_(data.task),
    clean_(data.deadline),
    clean_(data.page)
  ]);

  return {
    type: 'client',
    message: 'Заявка заказчика сохранена'
  };
}
