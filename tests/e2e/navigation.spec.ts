import { test, expect } from '@playwright/test';

test('home lists the six regions and navigates to a section and a needle', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('a.card.region')).toHaveCount(6);
	await expect(page.locator('a.card.region').first()).toContainText('Sant Pau Vell');   // section names stay on the region cards
	await page.locator('a.region').first().click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Regió Agulles');
	await page.locator('a.sec', { hasText: 'Sant Pau Vell' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Secció 1');
	await page.getByRole('link', { name: /Veure al mapa/ }).waitFor();
	await page.locator('.needle-list a').first().click();
	await expect(page.getByRole('region', { name: 'Text original del llibre' })).toBeVisible();
	await expect(page.getByText('Fitxa sense revisar')).toBeVisible();
});

test('direct URLs for needles and sections load', async ({ page }) => {
	for (const url of ['/needles/n0001/', '/sections/s35/', '/regions/tebaida/']) {
		const r = await page.goto(url);
		expect(r?.status()).toBe(200);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	}
});

test('search finds needles ignoring accents and case', async ({ page }) => {
	await page.goto('/search/?q=foradada');
	await expect(page.getByRole('link', { name: /Foradada/i }).first()).toBeVisible();
	await page.getByRole('searchbox').fill('LLISA');
	await expect(page.getByText(/resultats/)).not.toContainText('0 resultats');
});

test('map filters narrow the list, show chips and reset', async ({ page }) => {
	await page.goto('/map/', { waitUntil: 'networkidle' });
	const heading = page.locator('#h-list');
	await expect(heading).toHaveText('675 agulles');
	await expect(async () => {
		await page.getByRole('group', { name: 'Regió' }).getByRole('button', { name: 'Tebaida' }).click();
		await expect(heading).not.toHaveText('675 agulles', { timeout: 1000 });
	}).toPass({ timeout: 15000 });
	await expect(page.getByLabel('Filtres actius')).toContainText('Tebaida');
	await page.getByRole('button', { name: /Esborra/ }).click();
	await page.getByText('Més filtres').click();
	await page.getByLabel('Geolocalització').selectOption('yes');
	await expect(heading).toHaveText('528 agulles');
	await page.getByLabel('Geolocalització').selectOption('no');
	await expect(heading).toHaveText('147 agulles');
	await page.getByRole('button', { name: /Esborra/ }).click();
	await expect(heading).toHaveText('675 agulles');
	await page.locator('details.more-filters').evaluate((d: HTMLDetailsElement) => (d.open = true));
	await page.getByLabel('Tipus').selectOption('avenc');
	await expect(heading).toHaveText('6 agulles');
	await page.getByLabel('Tipus').selectOption('cova');
	await expect(heading).toHaveText('4 agulles');
	await page.getByLabel('Tipus').selectOption('itinerari');
	await expect(heading).toHaveText('1 agulles');
	await page.getByLabel('Tipus').selectOption('needle');
	await expect(heading).toHaveText('664 agulles');
});

test('a cave has its type badge on the needle page', async ({ page }) => {
	await page.goto('/needles/n0658/');                        // Cova Freda
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cova Freda');
	await expect(page.locator('.badge', { hasText: /^Cova$/ })).toBeVisible();
});

test('map page honours ?section= URL parameter', async ({ page }) => {
	await page.goto('/map/?section=s26');
	await expect(page.getByLabel('Secció')).toHaveValue('s26');
	await expect(page.locator('#h-list')).toHaveText('15 agulles');
});

test('map page is the explorer: picking a needle shows its preview card; 3D and basemap state go to the URL', async ({ page }) => {
	await page.goto('/map/', { waitUntil: 'networkidle' });
	await expect(page.getByRole('region', { name: 'Mapa de Montserrat' })).toBeVisible();
	await expect(async () => {
		await page.locator('.results .row').first().click();
		await expect(page.getByRole('link', { name: /Obre la fitxa/ })).toBeVisible({ timeout: 1000 });
	}).toPass({ timeout: 15000 });
	await expect(page).toHaveURL(/needle=n0001/);
	await page.getByRole('button', { name: '3D' }).click();
	await expect(page.getByRole('button', { name: '3D' })).toHaveAttribute('aria-pressed', 'true');
	await expect(page).toHaveURL(/3d=1/);
	await page.getByRole('button', { name: 'Mapa de fons' }).click();
	await page.getByLabel('Ortofoto (ICGC)').click();  // the menu closes on change
	await expect(page).toHaveURL(/base=orto/);
	await page.getByRole('link', { name: /Obre la fitxa/ }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sant Pau Vell, Runes 1 Turó');
});

test('mobile: bottom tab bar and bottom sheet', async ({ browser }) => {
	const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
	const page = await ctx.newPage();
	await page.goto('/map/', { waitUntil: 'networkidle' });
	const tabs = page.getByRole('navigation', { name: 'Navegació', exact: true });
	await expect(tabs).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Navegació principal' })).toBeHidden();
	const panel = page.getByRole('complementary', { name: 'Agulles i filtres' });
	await expect(panel).toHaveClass(/peek/);
	await expect(async () => {
		await page.getByRole('button', { name: 'Amplia el panell' }).click();
		await expect(panel).toHaveClass(/half/, { timeout: 1000 });
	}).toPass({ timeout: 15000 });
	await tabs.getByRole('button', { name: 'Més' }).click();
	await page.getByRole('link', { name: /El llibre/ }).click();
	await expect(page.getByTestId('book-strip')).toBeVisible();
	await ctx.close();
});

test('a geolocated needle shows coordinates with provenance and links to the map', async ({ page }) => {
	await page.goto('/needles/n0001/');
	await expect(page.getByText(/OpenStreetMap contributors/)).toBeVisible();
	await page.getByRole('link', { name: 'Veure al mapa' }).click();
	await expect(page).toHaveURL(/\/map\/\?needle=n0001/);
});

import { existsSync } from 'node:fs';
const hasBookImages = existsSync(new URL('../../static/images/book/p010.webp', import.meta.url));
test('public fiche shows the book drawings but never the scanned page', async ({ page }) => {
	await page.goto('/needles/n0119/');
	await expect(page.getByRole('img', { name: /Pàgina 100 de «Montserrat pam a pam»/ })).toHaveCount(0);
	await expect(page.locator('dt', { hasText: 'Pàgina del llibre' }).locator('+ dd')).toHaveText('100');
	if (!hasBookImages) { await expect(page.getByTestId('drawing')).toHaveCount(0); return; }
	await expect(page.getByRole('region', { name: 'Dibuix del llibre' })).toBeVisible();
	await expect(page.getByTestId('drawing')).toHaveCount(1);
});

test('needle page shows unreviewed OCR text when available', async ({ page }) => {
  await page.goto('/needles/n0119/');
  await expect(page.getByText('Text OCR sense revisar')).toBeVisible();
  await expect(page.locator('blockquote.original.ocr')).toContainText('Morro Pla');
});

test('review queue: accept a needle and export decisions', async ({ page }) => {
  await page.goto('/revisio/');
  const before = await page.getByText(/pendents de/).textContent();
  // the page is prerendered: retry the click until hydration has attached the handler
  await expect(async () => {
    await page.getByLabel('Revisor/a').fill('Test');
    await page.getByRole('button', { name: 'Accepta tal com està' }).click();
    await expect(page.getByText(/pendents de/)).not.toHaveText(before!, { timeout: 1000 });
  }).toPass({ timeout: 15000 });
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporta decisions' }).click();
  expect((await dl).suggestedFilename()).toMatch(/^decisions-.*\.json$/);
});

test('needle page shows the drawing plate when one is known', async ({ page }) => {
  await page.goto('/needles/n0124/');
  await expect(page.getByTestId('drawing')).toHaveCount(1);
  await expect(page.getByAltText(/Dibuix de El Lloro/)).toBeVisible();
});

test('a drawing page that is also an estimated text page is shown as a cut-out, not as a plain scan', async ({ page }) => {
  await page.goto('/needles/n0369/');
  await expect(page.getByTestId('drawing')).toHaveCount(1);
  await expect(page.getByAltText(/Pàgina 298 de/)).toHaveCount(0);
});

test('section page shows the section map and introduction text', async ({ page }) => {
  await page.goto('/sections/s06/');
  await expect(page.getByTestId('map')).toHaveCount(1);
  await expect(page.getByText('Text OCR sense revisar')).toBeVisible();
  await expect(page.locator('blockquote.original.ocr')).toContainText('Frares');
});

test('region page shows its introduction', async ({ page }) => {
  await page.goto('/regions/agulles/');
  await expect(page.locator('blockquote.original.ocr')).toContainText("regió d'Agulles");
});

test('El Cavall Bernat (added by migration 001): text pages and the drawing plate', async ({ page }) => {
  await page.goto('/needles/n0485/');
  await expect(page.getByRole('heading', { name: 'El Cavall Bernat' })).toBeVisible();
  await expect(page.locator('blockquote.original.ocr')).toContainText('darrera roca');
  await expect(page.getByTestId('drawing')).toHaveCount(1);
  await page.goto('/sections/s35/');
  await expect(page.getByRole('link', { name: 'El Cavall Bernat' })).toBeVisible();
  const names = await page.locator('.needle-list .n').allTextContents();        // book order: Maria Lluïsa, Serra de les Lluernes, Morral del Cavall, El Cavall Bernat
  expect(names.slice(-3)).toEqual(['Serra de les Lluernes', 'Morral del Cavall', 'El Cavall Bernat']);
});

test('needles added by migration 003 are listed in book order and shown with their drawing', async ({ page }) => {
  await page.goto('/sections/s03/');
  const names = await page.locator('.needle-list .n').allTextContents();
  expect(names).toContain('La Bandereta');
  await page.getByRole('link', { name: /La Bandereta/ }).first().click();
  await expect(page.getByTestId('drawing')).toHaveCount(1);
  await expect(page.getByText('Fitxa sense revisar')).toBeVisible();
});

test('region pages show the panoramic views printed in the book', async ({ page }) => {
	await page.goto('/regions/agulles/');
	if (!hasBookImages) { await expect(page.getByTestId('book-panorama')).toHaveCount(0); return; }
	await expect(page.getByRole('heading', { name: 'Panoràmiques de la regió' })).toBeVisible();
	const img = page.getByRole('img', { name: /De la Cadireta a la Portella/ });
	await expect(img).toBeVisible();
	await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(1000);
	await page.goto('/regions/sant-jeroni/');
	await expect(page.getByTestId('book-panorama')).toHaveCount(2);
});

test('escaladors: llista i fitxa amb el text del llibre', async ({ page }) => {
	await page.goto('/escaladors/');
	await expect(page.locator('.bio-list li')).toHaveCount(22);
	await page.getByRole('link', { name: /Alaix i Forrellat/ }).click();
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Alaix i Forrellat');
	await expect(page.getByText('Sabadell')).toBeVisible();
});

test('old /regions/ links lead to the home page', async ({ page }) => {
	await page.goto('/regions/');
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Montserrat Pam a Pam');
});

test('estil: el menú canvia el tema i es recorda', async ({ page }) => {
	await page.goto('/search/');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'fanzine');
	await page.locator('#theme-desk').selectOption('grafit');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'grafit');
	await page.goto('/escaladors/');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'grafit');
	await expect(page.locator('#theme-desk')).toHaveValue('grafit');
});

test('inici: l\'Advertiment del llibre (pàgines 5–6), on hi ha el text OCR', async ({ page }) => {
	await page.goto('/');
	const { existsSync } = await import('node:fs');
	if (!existsSync(new URL('../../data/ocr/front.json', import.meta.url))) return;
	await expect(page.getByRole('heading', { name: 'Advertiment' })).toBeVisible();
	await expect(page.getByTestId('front-advertiment')).toContainText('Ramon de Semir');
});

test('llibre: es passa de pàgina i es veuen les fitxes de cada pàgina', async ({ page }) => {
	await page.goto('/llibre/?p=100');
	await expect(page.getByTestId('page-input')).toHaveValue('100');
	await expect(page.getByTestId('page-items')).toContainText('La Nana');
	await page.getByRole('button', { name: 'Pàgina següent' }).click();
	await expect(page.getByTestId('page-input')).toHaveValue('101');
	await expect(page).toHaveURL(/p=101/);
	await expect(page.getByTestId('page-items')).toContainText('El Bisbe');
	// a swipe is a horizontal scroll of the strip
	await page.getByTestId('book-strip').evaluate((el) => el.scrollTo({ left: el.clientWidth * 6 }));
	await expect(page.getByTestId('page-input')).toHaveValue('7');
	await expect(page.getByRole('heading', { name: 'Pàgina 7' })).toBeVisible();
	await page.getByTestId('page-items').getByRole('link').first().click();
	await expect(page).toHaveURL(/\/$/);
});
