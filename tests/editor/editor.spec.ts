import { expect, test } from '@playwright/test';

test('editor API refuses requests without the editor header, accepts the page', async ({ request }) => {
  expect((await request.get('/__edit/ping')).status()).toBe(403);
  const ok = await request.get('/__edit/ping', { headers: { 'x-editor': '1' } });
  expect(ok.status()).toBe(200);
  expect((await request.post('/__edit/decision', { headers: { 'x-editor': '1' }, data: { needleId: 'n0119', action: 'accept' } })).status()).toBe(400); // no reviewer
});

test('editor mode shows editing panels on needle, section and region pages', async ({ page }) => {
  await page.goto('/needles/n0119/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: /^Editor ·/ })).toHaveCount(0);
  await page.waitForLoadState('networkidle');                                  // dev pages are server-rendered: wait for hydration
  await page.getByRole('checkbox', { name: 'Mode editor' }).click();
  await expect(page.getByRole('heading', { name: /^Editor · n0119/ })).toBeVisible();
  await page.getByRole('button', { name: 'Marca com a revisada' }).click();
  await expect(page.getByRole('alert').first()).toContainText('Indiqueu el vostre nom');                // refuses without reviewer
  await page.goto('/sections/s06/');
  await expect(page.getByRole('heading', { name: /^Editor · secció Frares/ })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Mode editor' })).toBeChecked();
  await page.goto('/regions/agulles/');
  await expect(page.getByRole('heading', { name: /^Editor · regió Agulles/ })).toBeVisible();
});

test('editor mode keeps the scanned page next to the edit box (not repeated further down)', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/needles/n0119/', { waitUntil: 'networkidle' });
  if (!(await page.getByRole('checkbox', { name: 'Mode editor' }).isChecked())) await page.getByRole('checkbox', { name: 'Mode editor' }).click();
  const editor = page.locator('aside.needle-editor'), pages = page.getByTestId('edit-pages');
  await expect(pages.getByRole('img', { name: /Pàgina 100 de «Montserrat pam a pam»/ })).toBeVisible();
  const a = await editor.boundingBox(), b = await pages.boundingBox();
  expect(b!.x).toBeGreaterThan(a!.x + a!.width - 5);                          // to the right of the edit box
  expect(Math.abs(b!.y - a!.y)).toBeLessThan(40);                              // same row
  await expect(page.getByRole('img', { name: /Pàgina 100 de «Montserrat pam a pam»/ })).toHaveCount(1);
  await page.getByRole('checkbox', { name: 'Mode editor' }).click();           // off again: the usual layout
  await expect(page.getByTestId('edit-pages')).toHaveCount(0);
});


test('review queue writes to the files in editor mode (no export button)', async ({ page }) => {
  await page.goto('/revisio/', { waitUntil: 'networkidle' });
  await expect(page.getByText('(mode editor)')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exporta decisions' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Accepta tal com està' })).toBeVisible();
});

test('editor: place an unlocated needle by clicking the map (request intercepted, no data written)', async ({ page }) => {
  let body: any = null;
  await page.route('**/__edit/location', async (r) => { body = r.request().postDataJSON(); await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  await page.goto('/needles/n0002/', { waitUntil: 'networkidle' });
  if (!(await page.getByRole('checkbox', { name: 'Mode editor' }).isChecked())) await page.getByRole('checkbox', { name: 'Mode editor' }).click();
  await page.getByLabel('Revisor/a').fill('Test');
  await page.getByRole('link', { name: 'Situa-la al mapa' }).click();
  await expect(page).toHaveURL(/\/map\/\?needle=n0002/);
  const bar = page.getByRole('region', { name: "Situa l'agulla al mapa" });
  await expect(bar).toContainText('feu clic al mapa');
  await page.waitForFunction(() => (window as any).__map?.loaded?.() !== undefined);
  const box = (await page.getByRole('region', { name: 'Mapa de Montserrat' }).boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.5);
  await expect(bar).toContainText('arrossegueu el marcador');
  await bar.getByRole('button', { name: 'Desa la ubicació' }).click();
  await expect.poll(() => body).not.toBeNull();
  expect(body).toMatchObject({ needleId: 'n0002', accuracy: 'approximate', reviewer: 'Test' });
  expect(body.latitude).toBeGreaterThan(41.5); expect(body.longitude).toBeGreaterThan(1.7);
});
