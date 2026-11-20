<script lang="ts">
	// Small inline icon set (stroke icons, 24×24), so the app needs no icon font and works offline.
	type Name = 'map' | 'layers' | 'search' | 'mountain' | 'more' | 'pin' | 'pin-off' | 'cube' | 'locate' | 'close' | 'chevron-up' | 'chevron-down' | 'arrow-right' | 'arrow-left' | 'book' | 'check' | 'list' | 'chart' | 'wifi-off' | 'expand' | 'eye';
	let { name, size = 20, label = '' }: { name: Name; size?: number; label?: string } = $props();
	const P: Record<Name, string> = {
		eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
		map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
		layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
		search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4',
		mountain: 'm3 20 6.5-11 3.5 6 2-3 6 8H3Zm6.5-11L11 6.5',
		more: 'M5 12h.01M12 12h.01M19 12h.01',
		pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
		'pin-off': 'M12 21s-6.5-5.6-6.5-11c0-1 .2-1.9.6-2.8M8.2 4.7A6.5 6.5 0 0 1 18.5 10c0 2-.9 4-2 5.7M3 3l18 18',
		cube: 'm12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12v9m0-9L4 7.5',
		locate: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v3m0 14v3M2 12h3m14 0h3',
		close: 'M6 6l12 12M18 6 6 18',
		'chevron-up': 'm6 15 6-6 6 6',
		'chevron-down': 'm6 9 6 6 6-6',
		'arrow-right': 'M5 12h14m-6-6 6 6-6 6',
		'arrow-left': 'M19 12H5m6-6-6 6 6 6',
		book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Zm0 16a2 2 0 0 1 2-2h13v2H6',
		check: 'm5 12 5 5 9-10',
		list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
		chart: 'M4 20V10m6 10V4m6 16v-7m4 7H3',
		'wifi-off': 'M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.8M19 13a10 10 0 0 0-2.4-1.8M2 9a15 15 0 0 1 4.2-2.6M22 9a15 15 0 0 0-11-4M12 20h.01',
		expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5m11-5v5h-5'
	};
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
	aria-hidden={label ? undefined : 'true'} role={label ? 'img' : undefined} aria-label={label || undefined} focusable="false"><path d={P[name]} /></svg>
