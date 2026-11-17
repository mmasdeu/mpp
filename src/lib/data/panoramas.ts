import type { ObservationPoint, Panorama } from './types';
import type { Issue } from './validation';

export function validatePanoramas(panoramas: Panorama[], observations: ObservationPoint[], needleIds: Set<string>, fileExists: (filename: string) => boolean = () => true): Issue[] {
	const out: Issue[] = [];
	const err = (message: string) => out.push({ level: 'error', message });
	const warn = (message: string) => out.push({ level: 'warning', message });
	const obsIds = new Set<string>();
	for (const o of observations) {
		if (obsIds.has(o.id)) err(`duplicate observation point ${o.id}`);
		obsIds.add(o.id);
		const l = o.location;
		if (!(l.latitude >= -90 && l.latitude <= 90 && l.longitude >= -180 && l.longitude <= 180)) err(`observation ${o.id}: coordinates out of range`);
		if (!l.source || !l.accuracy) err(`observation ${o.id}: location lacks provenance`);
		if (l.accuracy !== 'verified') warn(`observation ${o.id}: location not verified`);
	}
	const ids = new Set<string>();
	for (const p of panoramas) {
		if (ids.has(p.id)) err(`duplicate panorama ${p.id}`);
		ids.add(p.id);
		if (!p.title?.trim()) err(`panorama ${p.id}: empty title`);
		if (!fileExists(p.filename)) err(`panorama ${p.id}: image file ${p.filename} not found`);
		if (!(p.width > 0 && p.height > 0)) err(`panorama ${p.id}: invalid image size`);
		if (p.observationPointId && !obsIds.has(p.observationPointId)) err(`panorama ${p.id}: unknown observation point ${p.observationPointId}`);
		if (p.viewingDirection !== undefined && !(p.viewingDirection >= 0 && p.viewingDirection <= 360)) err(`panorama ${p.id}: viewingDirection out of range`);
		if (!p.author || !p.source || !p.license) warn(`panorama ${p.id}: incomplete provenance (author/source/license)`);
		if (!p.observationPointId) warn(`panorama ${p.id}: no observation point`);
		if (!p.annotations.length) warn(`panorama ${p.id}: no annotations`);
		p.annotations.forEach((a, i) => {
			if (!needleIds.has(a.needleId)) err(`panorama ${p.id}: annotation ${i + 1} points to unknown needle ${a.needleId}`);
			if (!(a.x >= 0 && a.x <= 1 && a.y >= 0 && a.y <= 1)) err(`panorama ${p.id}: annotation ${i + 1} outside the image`);
		});
		if (p.status === 'unreviewed') warn(`panorama ${p.id}: annotations unreviewed`);
	}
	return out;
}
