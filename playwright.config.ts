import { defineConfig } from '@playwright/test';
export default defineConfig({
	testDir: 'tests/e2e',
	testMatch: '**/*.spec.ts',
	webServer: { command: 'npm run build && node scripts/serve-static.mjs 4173', port: 4173, reuseExistingServer: true, timeout: 180_000 },
	use: { baseURL: 'http://localhost:4173' }
});
