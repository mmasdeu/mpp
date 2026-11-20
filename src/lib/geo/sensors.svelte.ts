/**
 * Phone sensors for «A prop meu»: GPS position (watchPosition) and compass orientation (DeviceOrientation, absolute).
 * Android/Chrome: `deviceorientationabsolute` gives alpha relative to north. iOS/Safari: permission must be asked from a tap
 * (DeviceOrientationEvent.requestPermission) and north comes from `webkitCompassHeading`.
 */
import { cameraPose } from './nearby';

export const position = $state<{ coords: { latitude: number; longitude: number; altitude: number | null; accuracy: number } | null; error: string; watching: boolean }>({ coords: null, error: '', watching: false });
export const orientation = $state<{ alpha: number | null; beta: number; gamma: number; absolute: boolean; error: string; active: boolean; offset: number }>(
	{ alpha: null, beta: 90, gamma: 0, absolute: false, error: '', active: false, offset: 0 });

let watchId: number | null = null;
export function startPosition() {
	if (watchId !== null) return;
	if (!('geolocation' in navigator)) { position.error = 'Aquest navegador no dona la ubicació.'; return; }
	position.error = ''; position.watching = true;
	watchId = navigator.geolocation.watchPosition(
		(p) => { position.coords = { latitude: p.coords.latitude, longitude: p.coords.longitude, altitude: p.coords.altitude, accuracy: p.coords.accuracy }; position.error = ''; },
		(e) => { position.error = e.code === e.PERMISSION_DENIED ? 'Cal permetre l\'accés a la ubicació.' : 'No s\'ha pogut obtenir la ubicació.'; },
		{ enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
	);
}
export function stopPosition() {
	if (typeof window === 'undefined') return;   // onDestroy also runs while prerendering
	if (watchId !== null) navigator.geolocation.clearWatch(watchId);
	watchId = null; position.watching = false;
}

// smoothing: compass readings jitter by a few degrees; average on the unit circle
const SMOOTH = 0.25;
let sx = 0, sy = 0, started = false;
function onOrientation(e: DeviceOrientationEvent, absoluteEvent: boolean) {
	const ios = (e as any).webkitCompassHeading;
	let alpha: number | null = null, absolute = false;
	if (typeof ios === 'number' && ios >= 0) { alpha = (360 - ios) % 360; absolute = true; }           // iOS: compass heading of the device top
	else if (e.alpha !== null && (absoluteEvent || e.absolute)) { alpha = e.alpha; absolute = true; }
	else if (e.alpha !== null && !orientation.absolute) alpha = e.alpha;                                  // relative only: better than nothing
	if (alpha === null || e.beta === null || e.gamma === null) return;
	if (orientation.absolute && !absolute) return;                                                     // don't mix relative events into an absolute stream
	const r = (alpha * Math.PI) / 180;
	if (!started) { sx = Math.cos(r); sy = Math.sin(r); started = true; }
	else { sx += (Math.cos(r) - sx) * SMOOTH; sy += (Math.sin(r) - sy) * SMOOTH; }
	orientation.alpha = ((Math.atan2(sy, sx) * 180) / Math.PI + 360) % 360;
	orientation.beta += (e.beta - orientation.beta) * 0.5; orientation.gamma = e.gamma; orientation.absolute = absolute; orientation.active = true;
}
const abs = (e: Event) => onOrientation(e as DeviceOrientationEvent, true);
const rel = (e: Event) => onOrientation(e as DeviceOrientationEvent, false);

/** Must be called from a user gesture (iOS asks for permission). */
export async function startOrientation(): Promise<boolean> {
	if (typeof DeviceOrientationEvent === 'undefined') { orientation.error = 'Aquest dispositiu no té brúixola.'; return false; }
	const req = (DeviceOrientationEvent as any).requestPermission;
	if (typeof req === 'function') {
		try { if ((await req()) !== 'granted') { orientation.error = 'Cal permetre l\'accés a l\'orientació del dispositiu.'; return false; } }
		catch { orientation.error = 'No s\'ha pogut activar la brúixola.'; return false; }
	}
	orientation.error = '';
	window.addEventListener('deviceorientationabsolute', abs);
	window.addEventListener('deviceorientation', rel);
	return true;
}
export function stopOrientation() {
	if (typeof window === 'undefined') return;
	window.removeEventListener('deviceorientationabsolute', abs);
	window.removeEventListener('deviceorientation', rel);
	orientation.active = false; started = false;
}

const screenAngle = () => (typeof screen !== 'undefined' && screen.orientation ? screen.orientation.angle : (window as any).orientation ?? 0);
/** Camera pose with the user's manual compass correction applied (orientation.offset, degrees). */
export function pose() {
	if (orientation.alpha === null) return null;
	const p = cameraPose(orientation.alpha, orientation.beta, orientation.gamma, screenAngle());
	return { ...p, heading: (p.heading + orientation.offset + 360) % 360 };
}
