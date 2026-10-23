# tiny_great_circle_distance

Computes the shortest distance between two latitude-longitude points on a sphere using the spherical law of cosines.

## Usage

```js
import { greatCircleDistance } from './src/index.js';

const london = { lat: 51.5074, lon: -0.1278 };
const newYork = { lat: 40.7128, lon: -74.0060 };

const metres = greatCircleDistance(london, newYork);
// ~5,570,000
```

Pass a third argument to use a non-Earth radius (e.g. the Moon):

```js
const moonDistance = greatCircleDistance(a, b, 1_737_400);
```

## Why

The spherical law of cosines is a single line of trigonometry with no
weighting schemes, no ellipsoidal parameters, and no numerical edge cases
beyond the well-known ill-conditioning near coincident points. That is exactly
the level of fidelity many applications need: ranking, filtering, display,
"is A within 100 km of B". For those uses pulling in a full geodesics library
is disproportionate.

The trade-off is accuracy. The default radius is the IUGG mean Earth radius
(6,371,008.8 m), so results are spherical, not ellipsoidal, and typically
differ from WGS-84 truth by under 0.5%. That is acceptable for the uses above
and not acceptable for surveying.

## Edge you will hit

The law of cosines becomes numerically unstable when the two points are very
lose together — roughly under one metre on Earth — because `acos` is
ill-conditioned near an argument of 1. If you need sub-metre distances use a
Haversine or Vincenty implementation instead; this library does not attempt to
patch that regime.

Out-of-range coordinates are normalised rather than rejected: a latitude of
100° is reflected to 80° (10° past the pole), and a longitude of 270° is
wrapped to -90°. This is deliberate so that callers can pass un-normalised
data without a crash, but it means a typo like `lat: 100` will not throw.
