import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greatCircleDistance, EARTH_RADIUS_METRES } from '../src/index.js';

const DEG_TO_METRES = EARTH_RADIUS_METRES * Math.PI / 180; // one degree of arc at the equator

/**
 * Compare two distances with an absolute tolerance in metres.
 * Float equality is forbidden in this suite; every comparison goes through here.
 */
function approxEqual(actual, expected, tolerance) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${expected} ± ${tolerance}, got ${actual}`
  );
}

test('identical points return zero distance', () => {
  const a = { lat: 51.4779, lon: -0.0015 };
  const p = greatCircleDistance(a, a);
  approxEqual(p, 0, 1e-3);
});

test('antipodal points return half the circumference', () => {
  // London and its antipode ~Antipodes Islands, New Zealand.
  const a = { lat: 51.5, lon: -0.1 };
  const b = { lat: -51.5, lon: 179.9 };
  const p = greatCircleDistance(a, b);
  approxEqual(p, Math.PI * EARTH_RADIUS_METRES, 1);
});

test('one degree at the equator is roughly 111.2 km', () => {
  const p = greatCircleDistance({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
  approxEqual(p, DEG_TO_METRES, 1); // 1 m tolerance
});

test('one degree of longitude shrinks with latitude', () => {
  // At 60°, cos(60°) = 0.5, so a degree of longitude is ~half its equatorial length.
  const p = greatCircleDistance({ lat: 60, lon: 0 }, { lat: 60, lon: 1 });
  approxEqual(p, 0.5 * DEG_TO_METRES, 1);
});

test('north-south distance is independent of longitude', () => {
  // One degree of latitude is the same ~111.2 km everywhere on the sphere.
  const p = greatCircleDistance({ lat: 50, lon: 100 }, { lat: 51, lon: 100 });
  approxEqual(p, DEG_TO_METRES, 1);
});

test('London to New York is approximately 5,570 km', () => {
  const london = { lat: 51.5074, lon: -0.1278 };
  const ny = { lat: 40.7128, lon: -74.0060 };
  const p = greatCircleDistance(london, ny);
  approxEqual(p, 5_570_000, 50_000); // 50 km tolerance; this is an approximation
});

test('longitude wraps around the antimeridian', () => {
  // 179° and -179° are 2° apart, not 358°.
  const p = greatCircleDistance({ lat: 0, lon: 179 }, { lat: 0, lon: -179 });
  approxEqual(p, 2 * DEG_TO_METRES, 1);
});

test('latitude over 90 is reflected, not clamped', () => {
  // 100° latitude is the same as 80° (10° past the pole, reflected back).
  const reflected = greatCircleDistance({ lat: 0, lon: 0 }, { lat: 100, lon: 0 });
  const direct = greatCircleDistance({ lat: 0, lon: 0 }, { lat: 80, lon: 0 });
  approxEqual(reflected, direct, 1e-3);
});

test('custom radius is used', () => {
  const p = greatCircleDistance({ lat: 0, lon: 0 }, { lat: 0, lon: 90 }, 1);
  approxEqual(p, Math.PI / 2, 1e-9);
});

test('non-positive radius throws', () => {
  assert.throws(() => greatCircleDistance({ lat: 0, lon: 0 }, { lat: 1, lon: 1 }, -1), RangeError);
  assert.throws(() => greatCircleDistance({ lat: 0, lon: 0 }, { lat: 1, lon: 1 }, 0), RangeError);
});

test('non-finite radius throws', () => {
  assert.throws(() => greatCircleDistance({ lat: 0, lon: 0 }, { lat: 1, lon: 1 }, NaN), RangeError);
  assert.throws(() => greatCircleDistance({ lat: 0, lon: 0 }, { lat: 1, lon: 1 }, Infinity), RangeError);
});

test('acos clamp prevents NaN for near-antipodal points', () => {
  // Without clamping, floating-point drift can push cosCentral just above 1
  // for points that are very nearly (but not exactly) antipodal.
  const p = greatCircleDistance({ lat: 45.0000001, lon: 0.0000001 }, { lat: -45.0000001, lon: 180.0000001 });
  assert.ok(Number.isFinite(p));
  approxEqual(p, Math.PI * EARTH_RADIUS_METRES, 1);
});
