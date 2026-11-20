import { describe, it, expect } from 'vitest';
import { angleDiff, bearing, cameraPose, cardinal, declutter, distance, elevationAngle, formatDistance, project } from '../../src/lib/geo/nearby';

const monestir = { latitude: 41.5935, longitude: 1.8376 }, santJeroni = { latitude: 41.6054, longitude: 1.8113 };
describe('geometry', () => {
	it('distance and bearing between the monastery and Sant Jeroni', () => {
		expect(distance(monestir, santJeroni)).toBeGreaterThan(2500);
		expect(distance(monestir, santJeroni)).toBeLessThan(2600);
		const b = bearing(monestir, santJeroni);
		expect(b).toBeGreaterThan(295); expect(b).toBeLessThan(305);
		expect(cardinal(b)).toBe('NO');
	});
	it('elevation angle: 100 m higher at 1 km is about 5.7°; curvature lowers far targets', () => {
		expect(elevationAngle(1000, 100)).toBeCloseTo(5.7, 1);
		expect(elevationAngle(20000, 0)).toBeLessThan(-0.05);
	});
	it('angleDiff wraps around north', () => {
		expect(angleDiff(10, 350)).toBe(20);
		expect(angleDiff(350, 10)).toBe(-20);
	});
	it('formats distances', () => {
		expect(formatDistance(347)).toBe('350 m');
		expect(formatDistance(1234)).toBe('1,2 km');
	});
});
describe('camera pose', () => {
	it('phone upright, top up, facing north/east', () => {
		const p = cameraPose(0, 90, 0);
		expect(p.heading).toBeCloseTo(0, 5); expect(p.pitch).toBeCloseTo(0, 5); expect(p.roll).toBeCloseTo(0, 5);
		expect(cameraPose(270, 90, 0).heading).toBeCloseTo(90, 5);   // alpha counter-clockwise: 270 → camera to the east
	});
	it('tilted back shows the sky; lying flat looks down', () => {
		expect(cameraPose(0, 120, 0).pitch).toBeCloseTo(30, 5);
		expect(cameraPose(0, 0, 0).pitch).toBeCloseTo(-90, 5);
	});
	it('right edge lowered = clockwise roll; landscape compensates the screen angle', () => {
		expect(cameraPose(0, 60, 10).roll).toBeGreaterThan(0);
		expect(cameraPose(0, 90, 0, 90).roll).toBeCloseTo(90, 5);
	});
});
describe('projection', () => {
	const pose = { heading: 0, pitch: 0, roll: 0 };
	it('straight ahead is the centre; right and up move right and up', () => {
		expect(project(0, 0, pose, 60, 80, 600, 800)).toEqual({ x: 300, y: 400 });
		const p = project(15, 10, pose, 60, 80, 600, 800)!;
		expect(p.x).toBeCloseTo(450); expect(p.y).toBeCloseTo(300);
		expect(project(90, 0, pose, 60, 80, 600, 800)).toBeNull();
	});
	it('a clockwise-rolled phone sees a target on the right higher up the screen', () => {
		const p = project(15, 0, { heading: 0, pitch: 0, roll: 20 }, 60, 80, 600, 800)!;
		expect(p.y).toBeLessThan(400);
	});
	it('declutter pushes overlapping farther labels up', () => {
		const ys = declutter([{ x: 100, y: 100, w: 80, h: 20 }, { x: 110, y: 105, w: 80, h: 20 }, { x: 400, y: 100, w: 80, h: 20 }]);
		expect(ys[0]).toBe(100); expect(ys[1]).toBeLessThanOrEqual(78); expect(ys[2]).toBe(100);
	});
});
describe('line of sight', () => {
	const a = { latitude: 41.60, longitude: 1.80 }, b = { latitude: 41.60, longitude: 1.82 };   // ~1.7 km apart
	it('flat ground: visible; a 300 m wall in the middle: hidden', async () => {
		const { lineOfSight } = await import('../../src/lib/geo/nearby');
		expect(await lineOfSight(a, 102, b, 102, async () => 100)).toBe(true);
		expect(await lineOfSight(a, 102, b, 102, async (_lat, lon) => (lon > 1.809 && lon < 1.811 ? 400 : 100))).toBe(false);
		expect(await lineOfSight(a, 102, b, 102, async () => null)).toBe(true);
	});
});
