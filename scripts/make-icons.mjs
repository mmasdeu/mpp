// One-off: renders static/icons/icon.svg to the PNG sizes used by the PWA manifest. Run: node scripts/make-icons.mjs
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const svg = readFileSync(new URL('../static/icons/icon.svg', import.meta.url), 'utf8');
const b = await chromium.launch();
const render = async (size, inset, file) => {
	const p = await b.newPage({ viewport: { width: size, height: size } });
	// inset > 0 shrinks the artwork onto the brand colour (maskable safe zone)
	await p.setContent(`<body style="margin:0;background:#8a3b12;display:grid;place-items:center;height:100vh"><div style="width:${100 - inset * 2}%;height:${100 - inset * 2}%">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body>`);
	writeFileSync(new URL(`../static/icons/${file}`, import.meta.url), await p.screenshot());
	await p.close();
};
await render(192, 0, 'icon-192.png');
await render(512, 0, 'icon-512.png');
await render(512, 10, 'icon-maskable-512.png');
await render(180, 0, 'apple-touch-icon.png');
await b.close();
