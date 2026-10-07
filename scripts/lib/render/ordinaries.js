/**
 * ordinaries.js - the geometric figures: their shapes in the shield's box
 * (100 wide, the shape's height tall), and where charges sit on them.
 */

import { insetOutline, outlinePath, outlinesPath, pointsAlong, shapeInfo } from "./shapes.js";

/**
 * The proportions, measured from the Pendragon rulebook's plate of
 * ordinaries: widths in units of the shield's width (100), depths as a share
 * of its height.
 */
export const PROPORTIONS = Object.freeze({
  /** The chief takes the top third. */
  chief: 1 / 3,
  /** A pale and a fess are a third of the shield wide. */
  pale: 32,
  fess: 30,
  /** A bend is a little narrower. */
  bend: 24,
  /** The arms of a cross and a saltire are about a fifth. */
  cross: 20,
  saltire: 20,
  /** A chevron's outer point at a fifth of the height, its arms falling 0.9 across, about a fifth thick. */
  chevronApex: 0.18,
  chevronSlope: 0.9,
  chevronDepth: 0.22,
  /** A pile nearly the shield's width at the top, its point near the base. */
  pileTop: 8,
  pilePoint: 0.92,
  /** Bordure and orle bands. */
  bordure: 10,
  orleInset: 10,
  orleWidth: 5.5,
  /** A canton a third across and a third down. */
  canton: 36,
});

const P = PROPORTIONS;

/** The chevron's lines: its outer edge at `x`, and how thick it is (both in height units). */
export function chevronGeometry(H) {
  const apex = H * P.chevronApex;
  const depth = H * P.chevronDepth;
  return { apex, depth, outer: (x) => apex + (Math.abs(x - 50) * P.chevronSlope) };
}

/** A band `w` wide from (x0, y0) to (x1, y1), as a quad in order round its edge. */
function band(x0, y0, x1, y1, w) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (w / 2);
  const ny = (dx / len) * (w / 2);
  return [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]];
}

/** The quads of each ordinary that is made of bands (a cross is a pale and a fess). */
function bands(type, H, fess) {
  switch (type) {
    case "pale":
      return [band(50, -10, 50, H + 10, P.pale)];
    case "fess":
      return [band(-10, fess, 110, fess, P.fess)];
    case "bend":
      return [band(-10, -10, H + 10, H + 10, P.bend)];
    case "bend-sinister":
      return [band(110, -10, 100 - H - 10, H + 10, P.bend)];
    case "cross":
      return [band(50, -10, 50, H + 10, P.cross), band(-10, fess, 110, fess, P.cross)];
    case "saltire": {
      // both diagonals through the fess point
      const r = 160;
      const d = r / Math.SQRT2;
      return [band(50 - d, fess - d, 50 + d, fess + d, P.saltire), band(50 + d, fess - d, 50 - d, fess + d, P.saltire)];
    }
    default:
      return null;
  }
}

/**
 * The Path2D of an ordinary on a shield shape. The shield's clip keeps the
 * parts that run off the edge from showing.
 * @param {string} type
 * @param {string} shapeId
 * @returns {Path2D}
 */
export function ordinaryPath(type, shapeId) {
  const shape = shapeInfo(shapeId);
  const H = shape.height;
  const fess = H * shape.fess;
  const quads = bands(type, H, fess);
  if (quads) return outlinesPath(...quads);
  switch (type) {
    case "chief":
      return outlinePath([[-5, -5], [105, -5], [105, H * P.chief], [-5, H * P.chief]]);
    case "chevron": {
      const { apex, depth, outer } = chevronGeometry(H);
      return outlinePath([
        [-10, outer(-10)], [50, apex], [110, outer(110)],
        [110, outer(110) + depth], [50, apex + depth], [-10, outer(-10) + depth],
      ]);
    }
    case "pile":
      return outlinePath([[P.pileTop, -5], [100 - P.pileTop, -5], [50, H * P.pilePoint]]);
    case "flaunches": {
      // each arc its own subpath, or the two are joined by a line
      const p = new globalThis.Path2D();
      const rx = 34;
      const ry = H * 0.62;
      const cy = H * 0.48;
      p.moveTo(-14 + rx, cy);
      p.ellipse(-14, cy, rx, ry, 0, 0, Math.PI * 2);
      p.closePath();
      p.moveTo(114 + rx, cy);
      p.ellipse(114, cy, rx, ry, 0, 0, Math.PI * 2);
      p.closePath();
      return p;
    }
    case "bordure":
      return outlinesPath([[-5, -5], [105, -5], [105, H + 5], [-5, H + 5]], insetOutline(shape.outline, P.bordure));
    case "orle":
      return outlinesPath(insetOutline(shape.outline, P.orleInset), insetOutline(shape.outline, P.orleInset + P.orleWidth));
    case "quarter":
      return outlinePath([[-5, -5], [50, -5], [50, fess], [-5, fess]]);
    case "canton":
      return outlinePath([[-5, -5], [P.canton, -5], [P.canton, H * 0.33], [-5, H * 0.33]]);
    default:
      return new globalThis.Path2D();
  }
}

/** Ordinaries that sit at the edge and leave the field's charges where they are (no "between"). */
export const EDGE_ORDINARIES = Object.freeze(["chief", "bordure", "orle", "quarter", "canton"]);

/** The fill rule an ordinary's path needs. */
export function ordinaryFillRule(type) {
  return type === "bordure" || type === "orle" ? "evenodd" : "nonzero";
}

/**
 * Where `n` charges sit on an ordinary: [{ u, v, size, angle }] in shield
 * units (angle in degrees, for charges that follow a bend).
 */
// eslint-disable-next-line complexity
export function ordinarySlots(type, n, shapeId) {
  const shape = shapeInfo(shapeId);
  const H = shape.height;
  const fess = H * shape.fess;
  const row = (v, from, to, max) => {
    const span = to - from;
    const size = Math.min(max, (span / n) * 0.9);
    return Array.from({ length: n }, (_, i) => ({ u: from + (span * (i + 0.5) / n), v, size, angle: 0 }));
  };
  const column = (u, from, to, max) => {
    const span = to - from;
    const size = Math.min(max, (span / n) * 0.9);
    return Array.from({ length: n }, (_, i) => ({ u, v: from + (span * (i + 0.5) / n), size, angle: 0 }));
  };
  switch (type) {
    case "chief":
      return row(H * P.chief / 2, 8, 92, 26);
    case "fess":
      return row(fess, 8, 92, 24);
    case "pale":
      return column(50, 6, H - 14, 26);
    case "bend":
    case "bend-sinister": {
      const sign = type === "bend" ? 1 : -1;
      const from = 0.16;
      const to = 0.72;
      const size = Math.min(19, (((to - from) * 100 * Math.SQRT2) / n) * 0.8);
      return Array.from({ length: n }, (_, i) => {
        const t = from + ((to - from) * (i + 0.5) / n);
        const x = t * 100;
        return { u: sign > 0 ? x : 100 - x, v: t * H * 0.95, size, angle: sign * 45 };
      });
    }
    case "chevron": {
      const { apex, depth, outer } = chevronGeometry(H);
      const size = Math.min(depth * 0.78, 17, n > 1 ? 80 / n : 17);
      const on = (x) => ({ u: x, v: outer(x) + (depth / 2), size, angle: 0 });
      if (n === 1) return [{ ...on(50), v: apex + (depth / 2) }];
      // spread along both arms, the middle one at the point
      const span = 40;
      return Array.from({ length: n }, (_, i) => {
        const x = 50 - span + ((2 * span * i) / (n - 1));
        return on(x);
      });
    }
    case "cross": {
      const c = [50, fess];
      const arm = 27;
      const spots = [c, [50, fess - arm], [50, fess + arm], [50 - arm, fess], [50 + arm, fess]];
      const order = n === 1 ? [0] : n === 2 ? [1, 2] : n === 3 ? [1, 0, 2] : n === 4 ? [1, 3, 4, 2] : [0, 1, 3, 4, 2];
      if (n <= 5) return order.map((k) => ({ u: spots[k][0], v: spots[k][1], size: 16, angle: 0 }));
      // more than five: down the pale and along the fess
      const down = Math.ceil(n / 2);
      const across = n - down;
      const size = Math.min(12, 80 / down);
      return [
        ...Array.from({ length: down }, (_, i) => ({ u: 50, v: 8 + ((H - 18) * (i + 0.5) / down), size, angle: 0 })),
        ...Array.from({ length: across }, (_, i) => ({ u: 8 + (84 * (i + 0.5) / across), v: fess, size, angle: 0 })),
      ];
    }
    case "saltire": {
      const c = [50, fess];
      const d = 24;
      const spots = [c, [50 - d, fess - d], [50 + d, fess - d], [50 - d, fess + d], [50 + d, fess + d]];
      const order = n === 1 ? [0] : n === 2 ? [1, 4] : n === 3 ? [1, 0, 4] : n === 4 ? [1, 2, 3, 4] : [0, 1, 2, 3, 4];
      if (n <= 5) return order.map((k) => ({ u: spots[k][0], v: spots[k][1], size: 15, angle: 0 }));
      // more than five: along both diagonals
      const first = Math.ceil(n / 2);
      const second = n - first;
      const size = Math.min(11, 70 / first);
      const along = (count, sign) => Array.from({ length: count }, (_, i) => {
        const t = 0.14 + ((0.72 * (i + 0.5)) / count);
        return { u: sign > 0 ? t * 100 : 100 - (t * 100), v: t * H * 0.92, size, angle: 0 };
      });
      return [...along(first, 1), ...along(second, -1)];
    }
    case "bordure":
      return pointsAlong(insetOutline(shape.outline, P.bordure / 2), n, 0.5).map(([u, v]) => ({ u, v, size: Math.min(8, 240 / n), angle: 0 }));
    case "orle":
      return pointsAlong(insetOutline(shape.outline, P.orleInset + (P.orleWidth / 2)), n, 0.5).map(([u, v]) => ({ u, v, size: Math.min(6.5, 200 / n), angle: 0 }));
    case "quarter":
      if (n === 1) return [{ u: 25, v: fess / 2, size: 30, angle: 0 }];
      return row(fess / 2, 4, 46, 14);
    case "canton":
      if (n === 1) return [{ u: P.canton / 2, v: H * 0.165, size: 22, angle: 0 }];
      return row(H * 0.165, 3, P.canton - 3, 10);
    case "pile":
      return column(50, 6, H * P.pilePoint * 0.72, 22).map((s, i) => ({ ...s, size: s.size * (1 - ((i / Math.max(n, 2)) * 0.45)) }));
    case "flaunches":
      return Array.from({ length: n }, (_, i) => ({ u: i % 2 ? 91 : 9, v: (H * 0.48) + ((Math.floor(i / 2) - (Math.floor((n - 1) / 4) / 2)) * 16), size: 12, angle: 0 }));
    default:
      return row(fess, 10, 90, 20);
  }
}
