/**
 * Earth's mean radius in metres, per the IUGG definition.
 *
 * Using a single mean radius rather than a specific ellipsoid means results are
 * spherical approximations: good enough for most non-geodetic uses, typically
 * within 0.5% of the true ellipsoidal distance. Callers who need WGS-84
 * accuracy should use a geodesics library, not this one.
 */
export const EARTH_RADIUS_METRES = 6371008.8;

/**
 * Convert degrees to radians.
 *
 * @param {number} degrees
 * @returns {number}
 */
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Normalise an angle in degrees to the half-open interval [-90, 90] for
 * latitude or [-180, 180] for longitude by reflecting or wrapping excess.
 *
 * Why not just clamp? Clamping silently maps every out-of-range value to the
 * nearest bound, which hides caller mistakes and produces a meaningless
 * distance. Reflecting/wrapping instead gives the mathematically correct
 * point on the sphere, and lets a deliberate caller pass (270, 0) to mean
 * (-90, 0) if they choose to.
 *
 * @param {number} degrees
 * @param {'lat'|'lon'} axis
 * @returns {number}
 */
function normalise(degrees, axis) {
  let wrapped = ((degrees % 360) + 360) % 360; // [0, 360)
  if (axis === 'lat') {
    if (wrapped > 270) return wrapped - 360;        // (270, 360) -> (-90, 0)
    if (wrapped > 90) return 180 - wrapped;          // (90, 270) -> (90, -90)
    return wrapped;                                  // [0, 90]
  }
  if (wrapped > 180) return wrapped - 360;           // (180, 360) -> (-180, 0)
  return wrapped;                                   // [0, 180]
}

/**
 * Compute the great-circle distance between two latitude/longitude points on
 * a sphere using the spherical law of cosines.
 *
 * Formula:  d = R * arccos( sin φ1·sin φ2 + cos φ1·cos φ2·cos Δλ )
 *
 * Where φ is latitude, λ is longitude, and Δλ is the longitude difference.
 * Latitude and longitude are both in radians here.
 *
 * The spherical law of cosines suffers from floating-point rounding when the
 * two points are very close together: the argument to arccos approaches 1 and
 * arccos(1) is numerically ill-conditioned (the derivative tends to infinity).
 * For points closer than roughly one metre on Earth the result can be
 * inaccurate by several orders of magnitude. The Haversine formula is the
 * standard remedy for that regime; this library deliberately does not
 * implement it, keeping the surface area small and the formula transparent.
 *
 * @param {{lat: number, lon: number}} a
 * @param {{lat: number, lon: number}} b
 * @param {number} [radius] - Sphere radius in metres; defaults to Earth's mean radius.
 * @returns {number} Distance in the same units as `radius` (metres by default).
 */
export function greatCircleDistance(a, b, radius = EARTH_RADIUS_METRES) {
  if (typeof radius !== 'number' || !Number.isFinite(radius) || radius <= 0) {
    throw new RangeError(`radius must be a positive finite number, got ${radius}`);
  }
  if (radius === Infinity) {
    throw new RangeError('radius must be a positive finite number, got Infinity');
  }

  const lat1 = toRadians(normalise(a.lat, 'lat'));
  const lat2 = toRadians(normalise(b.lat, 'lat'));
  const lon1 = toRadians(normalise(a.lon, 'lon'));
  const lon2 = toRadians(normalise(b.lon, 'lon'));
  const dLon = lon2 - lon1;

  const cosCentral =
    Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLon);

  // Clamp to [-1, 1] to guard against floating-point drift that would make
  // Math.acos return NaN (e.g. an argument of 1.0000000000000002).
  const clamped = Math.max(-1, Math.min(1, cosCentral));

  return radius * Math.acos(clamped);
}
