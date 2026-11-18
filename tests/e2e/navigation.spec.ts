import { test, expect } from '@playwright/test';

test('home lists six regions and navigates to a section and a needle', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 2 })).toHaveCount(6);
	await page.getByRole('link', { name: 'Agulles', exact: true }).click();
	await page.getByRole('link', { name: /Sant Pau Vell/ }).first().click();
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Secció 1');
	await page.getByRole('link', { name: /Veure al mapa/ }).waitFor();
	await page.locator('ul.plain a').first().click();
	await expect(page.getByText('Text original del llibre')).toBeVisible();
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
	await page.goto('/map/');
	const heading = page.getByRole('heading', { name: /^Llista/ });
	await expect(heading).toContainText('484');
	await page.getByLabel('Regió').selectOption({ label: 'Tebaida' });
	await expect(heading).not.toContainText('484');
	await expect(page.getByLabel('Filtres actius')).toContainText('Tebaida');
	await page.getByRole('button', { name: /Esborra/ }).click();
	await page.getByLabel('Geolocalització').selectOption('yes');
	await expect(heading).toContainText('(200 agulles)');
	await page.getByLabel('Geolocalització').selectOption('no');
	await expect(heading).toContainText('(284 agulles)');
	await page.getByRole('button', { name: /Esborra/ }).click();
	await expect(heading).toContainText('484');
});

test('map page honours ?section= URL parameter', async ({ page }) => {
	await page.goto('/map/?section=s26');
	await expect(page.getByLabel('Secció')).toHaveValue('s26');
	await expect(page.getByRole('heading', { name: /^Llista/ })).toContainText('(10 agulles)');
});

test('panoramas index renders (empty state until panoramas are published)', async ({ page }) => {
	await page.goto('/panoramas/');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Panorames anotats');
});

test('a geolocated needle shows coordinates with provenance and links to the map', async ({ page }) => {
	await page.goto('/needles/n0001/');
	await expect(page.getByText(/OpenStreetMap contributors/)).toBeVisible();
	await page.getByRole('link', { name: 'Veure al mapa' }).click();
	await expect(page).toHaveURL(/\/map\/\?needle=n0001/);
});

import { existsSync } from 'node:fs';
const hasBookImages = existsSync(new URL('../../static/images/book/p010.webp', import.meta.url));
test('needle page shows the book page image (only where the images exist locally)', async ({ page }) => {
	await page.goto('/needles/n0119/');
	await expect(page.getByRole('heading', { name: 'Pàgina del llibre' })).toBeVisible();
	if (!hasBookImages) {
		await expect(page.getByText(/no s'inclouen en aquesta versió/)).toBeVisible();
		return;
	}
	const img = page.getByRole('img', { name: /Pàgina 100 de «Montserrat pam a pam»/ });
	await expect(img).toBeVisible();
	await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(300);
	await expect(page.getByText('LA NANA (115)')).toBeVisible();
});
