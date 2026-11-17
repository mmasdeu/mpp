import { test, expect, type Page } from '@playwright/test';

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

	await page.goto('/');
	await expect(page.getByRole('heading', { name: /regions de Montserrat/ })).toBeVisible();
	await expect(page.getByRole('status').first()).toContainText('Sense connexió');
	for (const url of ['/needles/n0001/', '/sections/s05/', '/search/?q=agulla', '/offline/']) {
		await page.goto(url);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	}
	// Never visited while online: served from the SPA fallback shell, rendered client-side from the bundled data.
	await page.goto('/needles/n0300/');
	await expect(page.getByText('Text original del llibre')).toBeVisible();
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
