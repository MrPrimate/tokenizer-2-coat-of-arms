/**
 * placement.js - where a group of charges goes when its position or size is
 * chosen rather than left as rolled: the nine points of the shield
 * (dexter chief to sinister base, dexter being the viewer's left), a size
 * and a nudge. Pure: works on the slots `arrange.js` lays out.
 */

import { rowsFor } from "./arrange.js";
import { extentsAt, shapeInfo } from "./shapes.js";

/**
 * The points, as shares of the shield's width and height (`fess` means the
 * shape's own fess line), and how a blazon names them.
 */
export const PLACES = Object.freeze({
  "dexter-chief": Object.freeze({ x: 0.27, y: 0.2, row: true, words: "in dexter chief" }),
  chief: Object.freeze({ x: 0.5, y: 0.18, row: true, words: "in chief" }),
  "sinister-chief": Object.freeze({ x: 0.73, y: 0.2, row: true, words: "in sinister chief" }),
  dexter: Object.freeze({ x: 0.27, y: "fess", words: "to dexter" }),
  fess: Object.freeze({ x: 0.5, y: "fess", words: "in fess point" }),
  sinister: Object.freeze({ x: 0.73, y: "fess", words: "to sinister" }),
  "dexter-base": Object.freeze({ x: 0.33, y: 0.72, row: true, words: "in dexter base" }),
  base: Object.freeze({ x: 0.5, y: 0.78, row: true, words: "in base" }),
  "sinister-base": Object.freeze({ x: 0.67, y: 0.72, row: true, words: "in sinister base" }),
});

/** The point ids, top row first, dexter to sinister. */
export const PLACE_IDS = Object.freeze(Object.keys(PLACES));

export const SCALE_MIN = 0.3;
export const SCALE_MAX = 2.5;
export const NUDGE_MAX = 60;

/** Whether a group has a size, position or nudge of its own. */
export function isPlaced(group) {
  return Boolean(group?.place) || (group?.scale ?? 1) !== 1 || Boolean(group?.offset?.x) || Boolean(group?.offset?.y);
}

/** A point's position in shield units on a shape. */
export function placePoint(place, shapeId) {
  const shape = shapeInfo(shapeId);
  const p = PLACES[place];
  if (!p) return null;
  const y = p.y === "fess" ? shape.fess : p.y;
  return { u: p.x * shape.width, v: y * shape.height };
}

/**
 * The slots of one group, moved to its point (charges in a row there, or in
 * the usual rows when there are many), scaled and nudged.
 * @param {{u: number, v: number, size: number, angle?: number}[]} slots  As rolled
 * @param {object} group  { place, scale, offset, count }
 * @param {string} shapeId
 * @param {object} [options]
 * @param {boolean} [options.allowPlace=true]  False for charges on an ordinary, which keep to it
 */
export function placeSlots(slots, group, shapeId, { allowPlace = true } = {}) {
  if (!slots.length || !isPlaced(group)) return slots;
  const scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, Number(group.scale) || 1));
  const dx = Number(group.offset?.x) || 0;
  const dy = Number(group.offset?.y) || 0;
  const point = allowPlace && group.place ? placePoint(group.place, shapeId) : null;
  if (point) {
    // a fresh layout at the point, the charges as big as they were rolled
    const shape = shapeInfo(shapeId);
    // a charge put at a point starts no bigger than suits it: a third of the
    // shield at the corners and sides, a little more in chief or base
    const p = PLACES[group.place];
    const cap = p.x !== 0.5 ? 34 : p.y === "fess" ? Infinity : 42;
    const size = Math.min(cap, ...slots.map((s) => s.size)) * scale;
    const rows = PLACES[group.place].row && slots.length <= 4 ? [slots.length] : rowsFor(slots.length);
    // every row fits the shield's width where it lies (the heater narrows to its point)
    const width = (v) => {
      const ext = extentsAt(shape, Math.min(Math.max(v, 1), shape.height - 1)) ?? [0, shape.width];
      return { left: ext[0] + 3, right: ext[1] - 3 };
    };
    let fit = size;
    const rowV = (r, step) => point.v + ((r - ((rows.length - 1) / 2)) * step) + dy;
    rows.forEach((count, r) => {
      const { left, right } = width(rowV(r, fit * 1.15));
      fit = Math.min(fit, (right - left) / (count * 1.15));
    });
    const step = fit * 1.15;
    const out = [];
    rows.forEach((count, r) => {
      const v = rowV(r, step);
      const { left, right } = width(v);
      const half = ((count - 1) * step) / 2;
      // keep the row's middle where the whole row stays on the shield
      const u0 = Math.min(Math.max(point.u + dx, left + half + (fit / 2)), right - half - (fit / 2));
      for (let c = 0; c < count; c++) out.push({ u: u0 + ((c - ((count - 1) / 2)) * step), v, size: fit, angle: 0 });
    });
    return out;
  }
  // as rolled, scaled about the group's middle and nudged
  const cu = slots.reduce((n, s) => n + s.u, 0) / slots.length;
  const cv = slots.reduce((n, s) => n + s.v, 0) / slots.length;
  return slots.map((s) => ({ ...s, u: cu + ((s.u - cu) * scale) + dx, v: cv + ((s.v - cv) * scale) + dy, size: s.size * scale }));
}
