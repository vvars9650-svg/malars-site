const { test, expect } = require('@playwright/test');

const baseUrl = 'https://malars-test-frontend-vl-061126-01.website.yandexcloud.net';

test('synthetic draft resumes on mobile, submits, and updates under the same number', async ({ browser }) => {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await desktop.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Коротко познакомимся' })).toBeVisible();
  await page.locator('[data-key="displayName"]').fill('Синтетический специалист');
  await page.getByRole('radio', { name: 'Самостоятельно' }).check();
  await page.locator('input[name="mainCategories"]').first().check();
  await page.locator('[data-key="baseCity"]').fill('Тестовый город');
  await page.locator('[data-key="phone"]').fill('+7 900 000-00-01');
  await page.locator('[data-key="consent"]').check();
  await page.getByRole('button', { name: 'Сохранить на потом' }).click();
  await expect(page.getByText(/Черновик № MAL-P-26-/)).toBeVisible();
  const resumeUrl = page.url();
  expect(resumeUrl).toContain('#intake=');
  await expect(page.getByRole('button', { name: 'Продолжить сейчас' })).toBeVisible();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(resumeUrl, { waitUntil: 'networkidle' });
  await expect(mobilePage.getByRole('heading', { name: /Черновик № MAL-P-26-/ })).toBeVisible();
  await mobilePage.getByRole('button', { name: 'Продолжить сейчас' }).click();
  await expect(mobilePage.getByRole('heading', { name: 'Идентификация и контакты' })).toBeVisible();
  await expect(mobilePage.getByText('Количество бригад')).toHaveCount(0);

  await mobilePage.locator('[data-key="legalForm"]').selectOption({ label: 'Физлицо' });
  await mobilePage.locator('[data-key="companyName"]').fill('Синтетический специалист');
  await mobilePage.locator('[data-key="contactName"]').fill('Синтетический специалист');
  await mobilePage.locator('[data-key="email"]').fill('synthetic@example.invalid');
  await mobilePage.locator('[data-key="contactChannel"]').selectOption({ label: 'Email' });
  await mobilePage.getByRole('button', { name: 'Сохранить и продолжить' }).click();
  await mobilePage.locator('input[name="competencies"]').first().check();
  await mobilePage.getByRole('button', { name: 'Сохранить и продолжить' }).click();
  await mobilePage.getByRole('button', { name: 'Сохранить и продолжить' }).click();
  await mobilePage.locator('[data-key="baseRegionCode"]').selectOption({ label: 'Москва' });
  await mobilePage.getByRole('button', { name: 'Сохранить и продолжить' }).click();
  await mobilePage.locator('input[name="objectExperience"]').first().check();
  await mobilePage.getByRole('button', { name: 'Сохранить и продолжить' }).click();
  await mobilePage.getByRole('button', { name: 'Сохранить и продолжить' }).click();
  await mobilePage.getByRole('button', { name: 'Проверить данные' }).click();
  await expect(mobilePage.getByRole('heading', { name: 'Проверьте данные' })).toBeVisible();
  await mobilePage.locator('[data-final-consent]').check();
  await mobilePage.getByRole('button', { name: 'Отправить анкету на рассмотрение' }).click();
  const numberLine = mobilePage.getByText(/Анкета № MAL-P-26-[0-9a-f]{16} получена/i);
  await expect(numberLine).toBeVisible();
  const publicNumber = (await numberLine.textContent()).match(/MAL-P-26-[0-9a-f]{16}/i)[0];
  await expect(mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBe(true);

  await mobilePage.getByRole('button', { name: 'Изменить анкету' }).click();
  await mobilePage.locator('[data-key="phone"]').fill('+7 900 000-00-02');
  for (let section = 0; section < 6; section += 1) {
    await mobilePage.getByRole('button', { name: 'Сохранить и продолжить' }).click();
  }
  await mobilePage.getByRole('button', { name: 'Проверить данные' }).click();
  await mobilePage.locator('[data-final-consent]').check();
  await mobilePage.getByRole('button', { name: 'Отправить анкету на рассмотрение' }).click();
  await expect(mobilePage.getByRole('heading', { name: `Анкета № ${publicNumber} обновлена` })).toBeVisible();
  await expect(mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBe(true);
  await desktop.close();
  await mobile.close();
});
