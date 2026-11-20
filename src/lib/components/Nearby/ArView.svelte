<script lang="ts">
	/**
	 * Augmented-reality view: the back camera fills the screen and the located needles in range are drawn where they are, using the GPS
	 * position, the compass/tilt of the phone and the elevations (needle altitude, or the 3D map's elevation model).
	 */
	import { base } from '$app/paths';
	import { onDestroy, onMount } from 'svelte';
	import { regionColor } from '$lib/ui/regions';
	import { declutter, formatDistance, cardinal, project } from '$lib/geo/nearby';
	import { orientation, pose } from '$lib/geo/sensors.svelte';
	import type { Target } from './targets';

	let { targets, range = $bindable(1000), onclose }: { targets: Target[]; range?: number; onclose: () => void } = $props();

	let video: HTMLVideoElement | undefined = $state();
	let stream: MediaStream | null = null;
	let camError = $state('');
	let w = $state(360), h = $state(640);
	let fovLong = $state(66);            // camera field of view along the long side of the picture (typical phone main camera)
	let showSettings = $state(false);
	let frame = $state(0);               // bumped every animation frame so the labels follow the sensors
	let raf = 0;

	onMount(async () => {
		const loop = () => { frame++; raf = requestAnimationFrame(loop); };
		raf = requestAnimationFrame(loop);
		try {
			stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
			if (video) { video.srcObject = stream; await video.play().catch(() => {}); }
		} catch {
			camError = 'Sense càmera: es mostren només les etiquetes.';
		}
	});
	onDestroy(() => { cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); });

	// fields of view of what is visible on screen (video shown with object-fit: cover)
	const fov = $derived.by(() => {
		const vw = video?.videoWidth || 3, vh = video?.videoHeight || 4;     // portrait-ish default before the stream starts
		const scale = Math.max(w / vw, h / vh), f = Math.max(vw, vh) / 2 / Math.tan((fovLong * Math.PI) / 360);
		const ang = (px: number) => (2 * Math.atan(px / (2 * scale) / f) * 180) / Math.PI;
		return { h: ang(w), v: ang(h) };
	});

	const MAX_LABELS = 14, TOP = 64;
	const placed = $derived.by(() => {
		frame;
		const p = pose();
		if (!p) return { labels: [], dots: [] };
		const inView = targets
			.filter((t) => t.distance <= range)
			.map((t) => ({ t, at: project(t.bearing, t.elevationAngle, p, fov.h, fov.v, w, h) }))
			.filter((x) => x.at !== null) as { t: Target; at: { x: number; y: number } }[];
		// the nearest MAX_LABELS get a label (box centre 8 px above the point, pushed up when they overlap; ly = bottom edge of the label);
		// labels pushed under the top bar, and the farther targets, are shown as dots only
		const named = inView.slice(0, MAX_LABELS);
		const ys = declutter(named.map(({ t, at }) => ({ x: at.x, y: at.y - 8 - 19, w: Math.min(220, 24 + t.name.length * 7.2), h: 38 })));
		const out = named.map((x, i) => ({ ...x, ly: ys[i] + 19 }));
		return { labels: out.filter((x) => x.ly > TOP + 38), dots: [...out.filter((x) => x.ly <= TOP + 38), ...inView.slice(MAX_LABELS)] };
	});
	const labels = $derived(placed.labels);
	const heading = $derived.by(() => { frame; return pose()?.heading ?? null; });
	const horizon = $derived.by(() => { frame; const p = pose(); return p ? { y: h / 2 + (p.pitch / fov.v) * h, roll: -p.roll } : null; });
</script>

<div class="ar" bind:clientWidth={w} bind:clientHeight={h} role="dialog" aria-modal="true" aria-label="Vista de realitat augmentada">
	<!-- svelte-ignore a11y_media_has_caption -->
	<video bind:this={video} playsinline muted autoplay></video>
	{#if horizon}<div class="horizon" style:top="{horizon.y}px" style:transform="rotate({horizon.roll}deg)" aria-hidden="true"></div>{/if}

	{#each placed.dots as { t, at } (t.id)}
		<a class="dot" href="{base}/needles/{t.id}/" style:left="{at.x}px" style:top="{at.y}px" style:--c={regionColor(t.regionId)} aria-label="{t.name}, {formatDistance(t.distance)}"></a>
	{/each}
	{#each labels as { t, at, ly } (t.id)}
		<svg class="stem" aria-hidden="true" style:left="{at.x - 1}px" style:top="{Math.min(ly, at.y)}px" width="2" height={Math.max(2, at.y - ly)}><line x1="1" y1="0" x2="1" y2="100%" /></svg>
		<a class="label" data-testid="ar-label" href="{base}/needles/{t.id}/" style:left="{at.x}px" style:top="{ly}px" style:--c={regionColor(t.regionId)}
			style:font-size="{t.distance < 300 ? 1 : t.distance < 1000 ? 0.9 : 0.8}rem">
			<strong>{t.name}</strong><small>{formatDistance(t.distance)}{t.dh !== null ? ` · ${t.dh > 0 ? '+' : ''}${Math.round(t.dh)} m` : ''}</small>
		</a>
	{/each}

	<div class="top">
		<button type="button" class="round" onclick={onclose} aria-label="Tanca la càmera">✕</button>
		<div class="compass" aria-live="off">{heading === null ? 'Brúixola…' : `${Math.round(heading)}° ${cardinal(heading)}`}</div>
		<button type="button" class="round" onclick={() => (showSettings = !showSettings)} aria-expanded={showSettings} aria-label="Ajustos">⚙</button>
	</div>
	{#if heading === null}<p class="hint">{orientation.error || 'Mou el mòbil fent un vuit per activar la brúixola.'}</p>{/if}
	{#if camError}<p class="hint">{camError}</p>{/if}

	{#if showSettings}
		<div class="settings">
			<label>Abast: {formatDistance(range)} <input type="range" min="250" max="5000" step="250" bind:value={range} /></label>
			<label>Correcció de la brúixola: {orientation.offset > 0 ? '+' : ''}{orientation.offset}° <input type="range" min="-30" max="30" step="1" bind:value={orientation.offset} /></label>
			<label>Camp de visió de la càmera: {fovLong}° <input type="range" min="40" max="100" step="1" bind:value={fovLong} /></label>
			<p class="small">Si les etiquetes no cauen sobre les roques, ajusta la correcció de la brúixola mirant una agulla coneguda.</p>
		</div>
	{/if}
	<p class="count">{labels.length + placed.dots.length} a la vista · {targets.filter((t) => t.distance <= range).length} a menys de {formatDistance(range)}</p>
</div>

<style>
	.ar { position: fixed; inset: 0; z-index: 100; background: #111; overflow: hidden; color: #fff; touch-action: manipulation; }
	video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
	.horizon { position: absolute; left: -50%; width: 200%; height: 0; border-top: 1px dashed rgb(255 255 255 / .45); transform-origin: 50% 0; pointer-events: none; }
	.dot { position: absolute; width: .7rem; height: .7rem; margin: -.35rem 0 0 -.35rem; border-radius: 50%; background: var(--c); border: 2px solid #fff; box-shadow: 0 0 3px #000; }
	.stem { position: absolute; overflow: visible; pointer-events: none; }
	.stem line { stroke: #fff; stroke-width: 1.5; filter: drop-shadow(0 0 1px #000); }
	.label { position: absolute; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; max-width: 13rem; padding: .25rem .55rem;
		background: rgb(10 10 10 / .72); border-left: 4px solid var(--c); border-radius: .4rem; color: #fff; text-decoration: none; line-height: 1.15; text-align: center;
		box-shadow: 0 2px 8px rgb(0 0 0 / .4); white-space: nowrap; }
	.label strong { overflow: hidden; text-overflow: ellipsis; max-width: 12rem; font-family: var(--font-ui); }
	.label small { opacity: .85; font-size: .75em; }
	.top { position: absolute; top: calc(env(safe-area-inset-top) + .6rem); left: .6rem; right: .6rem; display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
	.round { width: 2.75rem; height: 2.75rem; min-height: 0; padding: 0; border-radius: 50%; background: rgb(0 0 0 / .55); color: #fff; border: 1px solid rgb(255 255 255 / .3); font-size: 1.2rem; }
	.compass { background: rgb(0 0 0 / .55); padding: .35rem .9rem; border-radius: 999px; font-variant-numeric: tabular-nums; font-weight: 700; }
	.hint { position: absolute; left: 1rem; right: 1rem; top: 40%; text-align: center; background: rgb(0 0 0 / .6); padding: .6rem; border-radius: .5rem; }
	.hint + .hint { top: calc(40% + 3.5rem); }
	.settings { position: absolute; left: .6rem; right: .6rem; top: calc(env(safe-area-inset-top) + 4rem); background: rgb(0 0 0 / .78); padding: .8rem 1rem; border-radius: .6rem; display: grid; gap: .6rem; }
	.settings label { display: grid; gap: .2rem; font-size: .9rem; }
	.settings input { width: 100%; }
	.small { font-size: .8rem; opacity: .8; margin: 0; }
	.count { position: absolute; bottom: calc(env(safe-area-inset-bottom) + .6rem); left: 0; right: 0; text-align: center; margin: 0; font-size: .8rem; text-shadow: 0 1px 2px #000; }
</style>
