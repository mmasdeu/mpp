import { defineConfig } from '@playwright/test';
// Editor smoke tests: dev server with EDITOR=1. These tests never write data (no reviewer name is entered).
export default defineConfig({
	testDir: 'tests/editor', timeout: 60_000,
	webServer: { command: 'EDITOR=1 npx vite dev --port 4180 --strictPort', port: 4180, reuseExistingServer: false, timeout: 120_000 },
	use: { baseURL: 'http://127.0.0.1:4180' }
});
