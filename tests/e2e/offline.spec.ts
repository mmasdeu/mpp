import { test, expect, type Page } from '@playwright/test';
import { COUNT, agulles } from './counts';

async function controlled(page: Page) {
	await page.goto('/');
	await page.evaluate(() => navigator.serviceWorker.ready);
	await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}

test('manifest is valid and its icons exist', async ({ request }) => {
	const m = await (await request.get('/manifest.webmanifest')).json();
	expect(m).toMatchObject({ lang: 'ca', display: 'standalone', start_url: './' });
	for (const i of m.icons) expect((await request.get(`/${i.src}`)).status()).toBe(200);
	expect(m.icons.some((i: any) => i.purpose === 'maskable')).toBe(true);
});

test('app works offline: visited pages, shell pages and never-visited needles', async ({ page, context }) => {
	await controlled(page);
	await page.goto('/needles/n0001/');
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await context.setOffline(true);

	await page.goto('/map/');
	await expect(page.locator('#h-list')).toHaveText(agulles(COUNT.total));
	await expect(page.getByRole('status').first()).toContainText('Sense connexió');
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Les sis regions' })).toBeVisible();
	for (const url of ['/needles/n0001/', '/sections/s05/', '/search/?q=agulla', '/offline/']) {
		await page.goto(url);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	}
	// Never visited while online: served from the SPA fallback shell, rendered client-side from the bundled data.
	await page.goto('/needles/n0300/');
	await expect(page.getByRole('region', { name: 'Text original del llibre' })).toBeVisible();
	await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('404');
	await page.goto('/regions/tebaida/');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Regió Tebaida');
	await context.setOffline(false);
});

test('"download everything" stores all needle pages', async ({ page }) => {
	await controlled(page);
	await page.goto('/offline/');
	await page.getByRole('button', { name: /Descarrega totes/ }).click();
	await expect(page.getByText(/Totes les fitxes estan desades/)).toBeVisible({ timeout: 60_000 });
	const n = await page.evaluate(async () => {
		const name = (await caches.keys()).find((k) => k.startsWith('pages-'))!;
		return (await (await caches.open(name)).keys()).length;
	});
	expect(n).toBeGreaterThanOrEqual(484);
	await page.getByRole('button', { name: /Esborra el contingut/ }).click();
	await expect(page.getByText('Contingut desat esborrat.')).toBeVisible();
});

// a 1×1 PNG stands in for the ICGC tiles (the test machine has no internet)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');

test('offline map: download the 3D relief pack, then tiles are served without network', async ({ page, context }) => {
	await context.route(/geoserveis\.icgc\.cat|tilemaps\.icgc\.cat|demotiles\.maplibre\.org/, (r) => r.fulfill({ status: 200, contentType: 'image/png', body: PNG, headers: { 'access-control-allow-origin': '*' } }));
	await controlled(page);
	await page.goto('/offline/');
	await expect(page.getByTestId('pack-dem')).toHaveText('No desat');
	await page.getByRole('button', { name: /Descarrega Relleu 3D/ }).click();
	await expect(page.getByTestId('pack-dem')).toHaveText('Desat', { timeout: 30_000 });
	const url = await page.evaluate(async () => {
		const c = await caches.open('tiles-v1');
		return (await c.keys()).map((r) => r.url).find((u) => u.includes('terreny') && u.includes('/14/'))!;
	});
	await context.unroute(/geoserveis\.icgc\.cat|tilemaps\.icgc\.cat|demotiles\.maplibre\.org/);
	await context.setOffline(true);
	const status = await page.evaluate(async (u) => (await fetch(u)).status, url);       // answered by the service worker from the tile cache
	expect(status).toBe(200);
	await context.setOffline(false);
	await page.getByRole('button', { name: 'Esborra el mapa desat' }).click();
	await expect(page.getByTestId('pack-dem')).toHaveText('No desat');
});
