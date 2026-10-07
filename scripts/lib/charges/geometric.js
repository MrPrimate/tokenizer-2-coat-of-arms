/**
 * geometric.js - the charges drawn in code: plain geometric figures
 * (roundels, mullets, lozenges, crescents, the foils, the fountain and
 * their kin). Every pictorial charge is drawn from a file (see art.js).
 */

import { starPoints } from "./sketch.js";

const C = 50;
const PI = Math.PI;

/** A circle as a Path2D (for holes and clips). */
function ring(cx, cy, r) {
  const p = new globalThis.Path2D();
  p.arc(cx, cy, r, 0, PI * 2);
  return p;
}

/** A mullet of `points` points, nudged down so it sits in the middle of the box. */
function mullet(points, inner) {
  // an odd star is taller above its centre than below
  const cy = points % 2 ? 54 : C;
  return (s) => s.poly(starPoints(C, cy, points, 48, inner));
}

/**
 * The crescent, horns up: an outer circle less an inner one set higher, so
 * the horns come to points. Its bowl is about a third of the radius thick.
 */
function crescentPath() {
  const R = 46;
  const d = 11;
  const r = 40.4;
  const cy = 41;
  const hy = ((r * r) - (R * R) - (d * d)) / (2 * d);
  const hx = Math.sqrt((R * R) - (hy * hy));
  const outerA = Math.atan2(hy, hx);
  const innerA = Math.atan2(hy + d, hx);
  const p = new globalThis.Path2D();
  p.arc(C, cy, R, outerA, PI - outerA);
  p.arc(C, cy - d, r, PI - innerA, innerA, true);
  p.closePath();
  return p;
}

/** A crescent turned `degrees` about the centre (90: horns to sinister). */
function crescent(degrees) {
  return (s) => s.at(C, C, 1, degrees, (t) => t.part(crescentPath()));
}

/**
 * A ray that waves as it goes out from the centre: a tapered S along the
 * angle `a`, from radius `r0` to `r1`, swinging `swing` to the side.
 */
function wavyRay(a, r0, r1, swing, cx = C, cy = C) {
  const dir = [Math.cos(a), Math.sin(a)];
  const side = [-dir[1], dir[0]];
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const r = r0 + ((r1 - r0) * t);
    const off = swing * Math.sin(t * PI * 2) * Math.min(1, t * 3);
    pts.push([cx + (dir[0] * r) + (side[0] * off), cy + (dir[1] * r) + (side[1] * off)]);
  }
  return pts;
}

/**
 * A leaf of a foil as a path, pointing up from (50, 50): `len` long and
 * `half` wide on each side, round with a small point at its tip.
 */
function leafPath(len, half, base = 0) {
  const y = (f) => 50 - base - (len * f);
  return `M50 ${y(0)} C ${50 - (half * 0.5)} ${y(0.08)} ${50 - half} ${y(0.3)} ${50 - half} ${y(0.55)} `
    + `C ${50 - half} ${y(0.8)} ${50 - (half * 0.45)} ${y(0.92)} 50 ${y(1)} `
    + `C ${50 + (half * 0.45)} ${y(0.92)} ${50 + half} ${y(0.8)} ${50 + half} ${y(0.55)} `
    + `C ${50 + half} ${y(0.3)} ${50 + (half * 0.5)} ${y(0.08)} 50 ${y(0)} Z`;
}

/** A heraldic foil of `n` leaves meeting in the middle, optionally pierced. */
function foil(s, n, len, half, { pierced = false } = {}) {
  for (let k = 0; k < n; k++) s.at(50, 50, 1, k * 360 / n, (t) => t.part(leafPath(len, half)));
  s.circle(50, 50, len * 0.32);
  if (pierced) s.hole(ring(50, 50, 6));
}

export const GEOMETRIC = Object.freeze({
  roundel: (s) => s.circle(C, C, 46),
  annulet: (s) => {
    s.circle(C, C, 46);
    s.hole(ring(C, C, 33));
  },
  billet: (s) => s.rect(28, 6, 44, 88),
  lozenge: (s) => s.poly([[C, 2], [80, C], [C, 98], [20, C]]),
  mascle: (s) => {
    s.poly([[C, 2], [80, C], [C, 98], [20, C]]);
    s.hole([[C, 22], [66, C], [C, 78], [34, C]]);
  },
  rustre: (s) => {
    s.poly([[C, 2], [80, C], [C, 98], [20, C]]);
    s.hole(ring(C, C, 12));
  },
  mullet: mullet(5, 20),
  "mullet-6": mullet(6, 26),
  "mullet-8": mullet(8, 30),
  "mullet-pierced": (s) => {
    s.poly(starPoints(C, 54, 5, 48, 21));
    s.hole(ring(C, 54, 11));
  },
  estoile: (s) => {
    // six rays waving out from the centre, all swung the same way
    s.circle(C, C, 12);
    for (let k = 0; k < 6; k++) {
      const a = (k * PI / 3) - (PI / 2);
      const pts = wavyRay(a, 4, 48, 6.5);
      s.taper(pts, [12, 13, 11, 7, 3, 1]);
      s.detail(pts.slice(2, 17), 0.8, { level: 3 });
    }
  },
  crescent: crescent(0),
  increscent: crescent(-90),
  decrescent: crescent(90),
  heart: (s) => s.part("M50 94 C 22 72 5 54 5 33 C 5 17 17 7 30 7 C 40 7 47 13 50 22 C 53 13 60 7 70 7 C 83 7 95 17 95 33 C 95 54 78 72 50 94 Z"),
  fountain: (s) => {
    // a roundel barry wavy of six, argent and azure
    s.circle(C, C, 46);
    const h = 92 / 6;
    const wave = (y, back) => {
      const pts = [];
      for (let x = 0; x <= 100; x += 2.5) pts.push([x, y + (2.8 * Math.sin((x - 4) * PI / 11.5))]);
      return back ? pts.reverse() : pts;
    };
    s.clipped(ring(C, C, 46), (t) => {
      for (const k of [1, 3, 5]) {
        const top = 4 + (k * h);
        const bottom = k === 5 ? 104 : top + h;
        t.part([...wave(top, false), ...(k === 5 ? [[100, bottom], [0, bottom]] : wave(bottom, true))], { second: true });
      }
    });
  },
  trefoil: (s) => {
    // three round leaves on short stems, slipped with a long waving stalk
    const stalk = Array.from({ length: 17 }, (_, i) => {
      const t = i / 16;
      return [50 + (5 * Math.sin(t * PI * 3) * t), 44 + (t * 54)];
    });
    s.taper(stalk, [6.5, 5.5, 4.5, 3]);
    for (const deg of [0, -95, 95]) s.at(50, 46, 1, deg, (t) => t.part(leafPath(34, 15.5, 8)));
    s.circle(50, 46, 4.5);
    s.taper([[50, 46], [50, 34]], 4, 4);
    s.taper([[50, 46], [38, 47]], 4, 4);
    s.taper([[50, 46], [62, 47]], 4, 4);
  },
  quatrefoil: (s) => foil(s, 4, 47, 16),
  cinquefoil: (s) => foil(s, 5, 47, 14, { pierced: true }),
  "chi-rho": (s) => {
    s.line([[24, 22], [76, 90]], 10);
    s.line([[76, 22], [24, 90]], 10);
    s.line([[50, 4], [50, 97]], 11);
    s.line("M50 9 C 84 7 86 46 50 45", 9);
  },
});
