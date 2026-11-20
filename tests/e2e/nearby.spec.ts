import { test, expect, type Page } from '@playwright/test';

// a phone on the summit of Sant Jeroni, with a fake camera
test.use({
	viewport: { width: 390, height: 844 }, hasTouch: true,
	geolocation: { latitude: 41.6054, longitude: 1.8113, accuracy: 8 }, permissions: ['geolocation', 'accelerometer', 'gyroscope', 'magnetometer'],
	launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] }
});
const turn = (page: Page, alpha: number) => page.evaluate((a) => {
	for (let i = 0; i < 25; i++) window.dispatchEvent(Object.assign(new Event('deviceorientationabsolute'), { alpha: a, beta: 90, gamma: 0, absolute: true }));
}, alpha);

test('a prop meu: nearby list by distance, then the camera view labels the needles in front', async ({ page }) => {
	await page.goto('/a-prop/');
	const list = page.getByTestId('nearby-list');
	if (!(await list.isVisible())) await page.getByRole('button', { name: /Activa la ubicació/ }).click();
	await expect(list.locator('li').first()).toBeVisible();
	expect(await list.locator('li').count()).toBeGreaterThan(3);
	await expect(list.locator('li').first()).toContainText(/\d+ m/);

	await page.getByTestId('open-ar').click();
	await expect(page.getByRole('dialog', { name: 'Vista de realitat augmentada' })).toBeVisible();
	let best = 0;
	for (let alpha = 0; alpha < 360; alpha += 30) {
		await turn(page, alpha);
		await page.waitForTimeout(120);
		best = Math.max(best, await page.getByTestId('ar-label').count());
	}
	expect(best).toBeGreaterThan(0);
	await expect(page.locator('.compass')).toContainText('°');
	await page.getByRole('button', { name: 'Tanca la càmera' }).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);
});
