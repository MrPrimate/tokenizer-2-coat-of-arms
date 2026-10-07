/**
 * shapes.js - the shield shapes, as outlines in a box 100 units wide (the
 * heater is 110 tall), with the usable width at each height for laying
 * charges out.
 */

import { bezier } from "../charges/sketch.js";

function heaterOutline() {
  const right = bezier([100, 40], [100, 74], [76, 98], [50, 110], 24);
  const left = right.map(([x, y]) => [100 - x, y]).reverse();
  return [[0, 0], [100, 0], ...right, ...left.slice(1)];
}

function roundOutline() {
  const pts = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    pts.push([50 + (50 * Math.cos(a)), 50 + (50 * Math.sin(a))]);
  }
  return pts;
}

/** The shapes: outline points, height, and where the fess line and the centre of the field sit. */
export const SHAPES = Object.freeze({
  heater: Object.freeze({ id: "heater", label: "Heater", outline: heaterOutline(), width: 100, height: 110, fess: 0.45, centre: Object.freeze([50, 48]) }),
  round: Object.freeze({ id: "round", label: "Round", outline: roundOutline(), width: 100, height: 100, fess: 0.5, centre: Object.freeze([50, 50]) }),
  square: Object.freeze({ id: "square", label: "Banner", outline: [[0, 0], [100, 0], [100, 100], [0, 100]], width: 100, height: 100, fess: 0.5, centre: Object.freeze([50, 50]) }),
  lozenge: Object.freeze({ id: "lozenge", label: "Lozenge", outline: [[50, 0], [100, 55], [50, 110], [0, 55]], width: 100, height: 110, fess: 0.5, centre: Object.freeze([50, 55]) }),
});

export const SHAPE_IDS = Object.freeze(Object.keys(SHAPES));

/** A shape by id; the heater for an unknown one. */
export function shapeInfo(id) {
  return SHAPES[id] ?? SHAPES.heater;
}

/** A Path2D of a closed outline. */
export function outlinePath(points) {
  const p = new globalThis.Path2D();
  points.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}

/**
 * One Path2D of several closed outlines, each its own subpath (built
 * directly rather than with `addPath`, which some canvases join up).
 */
export function outlinesPath(...outlines) {
  const p = new globalThis.Path2D();
  for (const points of outlines) {
    points.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    p.closePath();
  }
  return p;
}

/** The shape's outline as a Path2D. */
export function shapePath(id) {
  return outlinePath(shapeInfo(id).outline);
}

/** The left and right edge of the shape at height `v`, or null above or below it. */
export function extentsAt(shape, v) {
  const pts = shape.outline;
  let left = Infinity;
  let right = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    if ((v < Math.min(y0, y1)) || (v > Math.max(y0, y1)) || y0 === y1) continue;
    const x = x0 + ((x1 - x0) * (v - y0) / (y1 - y0));
    left = Math.min(left, x);
    right = Math.max(right, x);
  }
  if (!Number.isFinite(left)) return null;
  return [left, right];
}

/**
 * The outline moved inward by `d` units. The shapes are convex, so this is
 * the outline cut by each of its edges' lines moved `d` inward
 * (Sutherland-Hodgman clipping): exact, with sharp corners kept and no
 * folds where the edges meet at a point.
 */
export function insetOutline(points, d) {
  let poly = points.map((p) => [...p]);
  const n = points.length;
  for (let i = 0; i < n && poly.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    if (a[0] === b[0] && a[1] === b[1]) continue;
    const [nx, ny] = edgeNormal(a, b);
    // signed distance inside the moved edge
    const side = (p) => (((p[0] - a[0]) * nx) + ((p[1] - a[1]) * ny)) - d;
    const out = [];
    for (let k = 0; k < poly.length; k++) {
      const cur = poly[k];
      const next = poly[(k + 1) % poly.length];
      const sc = side(cur);
      const sn = side(next);
      if (sc >= 0) out.push(cur);
      if ((sc >= 0) !== (sn >= 0)) {
        const t = sc / (sc - sn);
        out.push([cur[0] + ((next[0] - cur[0]) * t), cur[1] + ((next[1] - cur[1]) * t)]);
      }
    }
    poly = out;
  }
  return poly;
}

/** The inward normal of an edge of an outline that runs clockwise on screen (y down). */
function edgeNormal(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return [-dy / len, dx / len];
}

/** `n` points spread evenly along a closed outline, starting at the top centre. */
export function pointsAlong(points, n, offset = 0) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push({ a, b, len, start: total });
    total += len;
  }
  // start at the point nearest the top centre
  let startDist = 0;
  let best = Infinity;
  for (const seg of segs) {
    const d = Math.hypot(((seg.a[0] + seg.b[0]) / 2) - 50, (seg.a[1] + seg.b[1]) / 2);
    if (d < best) {
      best = d;
      startDist = seg.start;
    }
  }
  const out = [];
  for (let k = 0; k < n; k++) {
    let dist = (startDist + (((k + offset) / n) * total)) % total;
    const seg = segs.find((s) => dist >= s.start && dist < s.start + s.len) ?? segs[segs.length - 1];
    const t = seg.len ? (dist - seg.start) / seg.len : 0;
    out.push([seg.a[0] + ((seg.b[0] - seg.a[0]) * t), seg.a[1] + ((seg.b[1] - seg.a[1]) * t)]);
  }
  return out;
}
