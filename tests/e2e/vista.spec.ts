import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// the map services are replaced by a flat 700 m elevation model and a plain ground texture
const DEM = readFileSync(new URL('../fixtures/dem-700m.png', import.meta.url)), GROUND = readFileSync(new URL('../fixtures/ground.png', import.meta.url));
test.use({ viewport: { width: 390, height: 844 } });
test.beforeEach(async ({ context }) => {
	await context.route(/geoserveis\.icgc\.cat|demotiles\.maplibre\.org/, (r) => r.fulfill({ status: 200, contentType: 'image/png', body: GROUND, headers: { 'access-control-allow-origin': '*' } }));
	await context.route(/contextmaps-terreny/, (r) => r.fulfill({ status: 200, contentType: 'image/png', body: DEM, headers: { 'access-control-allow-origin': '*' } }));   // registered last = matched first
});

test('vista simulada: labels the needles in sight, turns and zooms', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto('/vista/?lat=41.5935&lon=1.8376&b=300');
	await expect(page.getByTestId('sim-compass')).toHaveText('300° NO');
	await expect(page.getByRole('status')).toHaveCount(0, { timeout: 20000 });     // line of sight computed
	await expect.poll(() => page.getByTestId('sim-label').count()).toBeGreaterThan(2);
	await page.getByRole('button', { name: 'Gira a la dreta' }).click();
	await expect(page.getByTestId('sim-compass')).toHaveText('330° NO');
	await page.getByRole('button', { name: 'Apropa (zoom)' }).click();
	expect(errors).toEqual([]);
	await page.getByTestId('sim-label').first().click();
	await expect(page).toHaveURL(/\/needles\/n\d+\//);
});

test('map: «Vista» then a click opens the simulated view from that point', async ({ page }) => {
	await page.setViewportSize({ width: 1200, height: 800 });
	await page.goto('/map/', { waitUntil: 'networkidle' });
	await page.getByTestId('pick-view').click();
	await expect(page.getByText("Toca el punt des d'on vols veure el paisatge.")).toBeVisible();
	await page.locator('.maplibregl-canvas').click({ position: { x: 700, y: 400 } });
	await expect(page).toHaveURL(/\/vista\/\?lat=41\.\d+&lon=1\.\d+/);
	await expect(page.getByTestId('sim-compass')).toBeVisible();
});
