/**
 * arrange.js - where charges sit on the field: in rows that follow the
 * shield's shape, and round an ordinary ("between") where there is one.
 */

import { extentsAt, shapeInfo } from "./shapes.js";
import { chevronGeometry, PROPORTIONS as P } from "./ordinaries.js";

/** Rows for n charges, top first: 3 = two and one, 6 = three, two and one. */
export function rowsFor(n) {
  const known = {
    1: [1], 2: [2], 3: [2, 1], 4: [2, 2], 5: [2, 1, 2], 6: [3, 2, 1], 7: [3, 3, 1], 8: [3, 3, 2], 9: [3, 3, 3],
    10: [4, 3, 2, 1], 11: [4, 3, 3, 1], 12: [4, 4, 3, 1], 13: [4, 4, 3, 2], 14: [4, 4, 4, 2], 15: [4, 4, 4, 3], 16: [4, 4, 4, 4],
  };
  if (known[n]) return known[n];
  const rows = [];
  let left = n;
  while (left > 0) {
    const take = Math.min(5, left);
    rows.push(take);
    left -= take;
  }
  return rows;
}

/**
 * `n` charges in rows inside a region of the shield: { top, bottom } in
 * height units and optional { left, right } insets in width units.
 * @returns {{u: number, v: number, size: number}[]}
 */
export function regionRows(shape, n, region, { maxSize = 60, stack = false } = {}) {
  if (n <= 0) return [];
  const rows = stack ? Array.from({ length: n }, () => 1) : rowsFor(n);
  const top = region.top ?? 0;
  const bottom = region.bottom ?? shape.height;
  const rowHeight = (bottom - top) / rows.length;
  const placed = [];
  let size = Infinity;
  rows.forEach((count, r) => {
    const v = top + (rowHeight * (r + 0.5));
    const ext = extentsAt(shape, Math.min(Math.max(v, 1), shape.height - 1)) ?? [0, 100];
    const left = Math.max(ext[0], region.left ?? 0) + 3;
    const right = Math.min(ext[1], region.right ?? 100) - 3;
    const span = Math.max(right - left, 10);
    const cell = span / count;
    const fit = n === 1 ? Math.min(span * 0.66, rowHeight * 0.72) : Math.min(cell * 0.88, rowHeight * 0.88);
    size = Math.min(size, fit, maxSize);
    for (let c = 0; c < count; c++) placed.push({ u: left + (cell * (c + 0.5)), v });
  });
  return placed.map((p) => ({ ...p, size }));
}

/**
 * A charge alone on the field: large, as the rulebook draws it, a little
 * above the middle where the shield is widest (smaller on a lozenge).
 */
function loneCharge(shape) {
  const [u, v] = shape.centre;
  if (shape.id === "lozenge") return { u, v, size: 58 };
  return { u, v: v + (shape.height > 100 ? 3 : 0), size: 80 };
}

/** Splits n among k groups, first groups getting the extra. */
function split(n, k) {
  const base = Math.floor(n / k);
  const extra = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
}

/**
 * Where `n` charges sit on the field, round the ordinary if there is one.
 * @param {string} shapeId
 * @param {number} n
 * @param {string|null} ordinary
 * @returns {{u: number, v: number, size: number}[]}
 */
// eslint-disable-next-line complexity
export function fieldSlots(shapeId, n, ordinary = null) {
  const shape = shapeInfo(shapeId);
  const H = shape.height;
  const fess = H * shape.fess;
  if (n <= 0) return [];
  switch (ordinary) {
    case null:
    case undefined:
      if (n === 1) return [loneCharge(shape)];
      return regionRows(shape, n, { top: 0, bottom: H });
    case "chief":
      return regionRows(shape, n, { top: (H * P.chief) + 2, bottom: H - 2 }, { maxSize: 46 });
    case "bordure":
      return regionRows(shape, n, { top: 11, bottom: H - 13, left: 11, right: 89 }, { maxSize: 46 });
    case "orle":
      return regionRows(shape, n, { top: 17, bottom: H - 20, left: 17, right: 83 }, { maxSize: 38 });
    case "quarter":
      if (n === 1) return [{ u: 62, v: fess + 6, size: 40 }];
      if (n === 2) return [{ u: 75, v: fess / 2, size: 30 }, { u: 40, v: fess + 20, size: 30 }];
      if (n === 3) return [{ u: 75, v: fess / 2, size: 28 }, { u: 30, v: fess + 20, size: 28 }, { u: 70, v: fess + 20, size: 28 }];
      return regionRows(shape, n, { top: fess + 2, bottom: H }, { maxSize: 30 });
    case "canton":
      if (n === 1) return [{ u: 55, v: fess + 4, size: 46 }];
      if (n === 2) return [{ u: 70, v: 18, size: 28 }, { u: 45, v: fess + 18, size: 32 }];
      if (n === 3) return [{ u: 70, v: 18, size: 26 }, { u: 30, v: fess + 18, size: 26 }, { u: 70, v: fess + 18, size: 26 }];
      return regionRows(shape, n, { top: H * 0.36, bottom: H }, { maxSize: 30 });
    case "pale": {
      const [l, r] = split(n, 2);
      return [
        ...regionRows(shape, l, { top: 4, bottom: H - 10, left: 0, right: 50 - (P.pale / 2) }, { maxSize: 26, stack: true }),
        ...regionRows(shape, r, { top: 4, bottom: H - 10, left: 50 + (P.pale / 2), right: 100 }, { maxSize: 26, stack: true }),
      ];
    }
    case "fess": {
      const [a, b] = split(n, 2);
      return [
        ...regionRows(shape, a, { top: 2, bottom: fess - (P.fess / 2) - 1 }, { maxSize: 24 }),
        ...regionRows(shape, b, { top: fess + (P.fess / 2) + 1, bottom: H - 4 }, { maxSize: 24 }),
      ];
    }
    case "bend":
    case "bend-sinister": {
      const mirror = ordinary === "bend-sinister";
      const [a, b] = split(n, 2);
      const corner = (count, chief) => {
        // a run of charges parallel to the bend, in the free corner
        const size = count === 1 ? 30 : Math.min(24, 56 / count);
        return Array.from({ length: count }, (_, i) => {
          const t = count === 1 ? 0.5 : (i + 0.5) / count;
          const u = chief ? 60 + (t * 30) : 10 + (t * 28);
          const v = chief ? 8 + (t * 34) : (H * 0.52) + (t * 32);
          return { u: mirror ? 100 - u : u, v, size };
        });
      };
      return [...corner(a, true), ...corner(b, false)];
    }
    case "chevron": {
      // two in chief, one in base, as "a chevron between three": the chief's
      // charges in the corners above the arms, the rest under the point
      const { apex, depth } = chevronGeometry(H);
      const chief = n === 1 ? 0 : n <= 3 ? 2 : 2 * Math.ceil(n / 3);
      const [l, r] = split(chief, 2);
      const corner = (count, left) => regionRows(shape, count, { top: 2, bottom: apex + 26, left: left ? 0 : 60, right: left ? 40 : 100 }, { maxSize: 24, stack: true });
      return [
        ...corner(l, true), ...corner(r, false),
        ...regionRows(shape, n - chief, { top: apex + depth + 4, bottom: H - 6 }, { maxSize: 26 }),
      ];
    }
    case "cross": {
      const parts = split(n, 4);
      const regions = [
        { top: 0, bottom: fess - (P.cross / 2), left: 0, right: 50 - (P.cross / 2) }, { top: 0, bottom: fess - (P.cross / 2), left: 50 + (P.cross / 2), right: 100 },
        { top: fess + (P.cross / 2), bottom: H, left: 0, right: 50 - (P.cross / 2) }, { top: fess + (P.cross / 2), bottom: H, left: 50 + (P.cross / 2), right: 100 },
      ];
      return parts.flatMap((count, i) => regionRows(shape, count, regions[i], { maxSize: 24 }));
    }
    case "saltire": {
      const parts = split(n, 4);
      const regions = [
        { top: 0, bottom: fess - 20, left: 25, right: 75 }, { top: fess - 18, bottom: fess + 18, left: 0, right: 30 },
        { top: fess - 18, bottom: fess + 18, left: 70, right: 100 }, { top: fess + 24, bottom: H, left: 25, right: 75 },
      ];
      return parts.flatMap((count, i) => regionRows(shape, count, regions[i], { maxSize: 20 }));
    }
    case "pile": {
      const parts = split(n, 2);
      // beside the pile, low down where it has narrowed
      const regions = [{ top: H * 0.38, bottom: H * 0.78, left: 0, right: 30 }, { top: H * 0.38, bottom: H * 0.78, left: 70, right: 100 }];
      return parts.flatMap((count, i) => regionRows(shape, count, regions[i], { maxSize: 18, stack: true }));
    }
    case "flaunches":
      return regionRows(shape, n, { top: 0, bottom: H, left: 22, right: 78 }, { maxSize: 44 });
    default:
      return regionRows(shape, n, { top: 0, bottom: H });
  }
}

/** The lattice of a semé: small charges in offset rows across the whole box. */
export function semeSlots(shapeId, size = 11) {
  const shape = shapeInfo(shapeId);
  const out = [];
  const step = size * 1.45;
  let row = 0;
  for (let v = size * 0.5; v < shape.height + size; v += step * 0.9, row++) {
    for (let u = (row % 2 ? step / 2 : 0) - size; u < 100 + size; u += step) out.push({ u, v, size });
  }
  return out;
}
