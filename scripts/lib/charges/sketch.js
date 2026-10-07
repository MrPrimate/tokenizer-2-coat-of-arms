/**
 * sketch.js - how a charge is drawn. A charge's picture is a function of a
 * `Sketch`, drawing in a 100 x 100 box (y down, the beast facing dexter, the
 * viewer's left) with filled parts, thick lines, tapered limbs, holes and
 * detail lines. `renderCharge` runs the picture several times over, once for
 * each pass: the outline under everything, the paint, the holes cut through,
 * then the detail lines, so the parts add up to one outlined silhouette.
 *
 * A charge is drawn in a style (see CHARGE_STYLES) and at a detail level:
 * each detail line and dot has a level, 1 (always drawn: eyes, the line
 * between a far leg and the body), 2 (the usual lines) or 3 (fur, feathers
 * and scales), and is drawn when the charge's detail level reaches it.
 */

import { OUTLINE } from "../tinctures.js";

/** Points along a cubic bezier from p0 through c1, c2 to p1. */
export function bezier(p0, c1, c2, p1, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([
      (u * u * u * p0[0]) + (3 * u * u * t * c1[0]) + (3 * u * t * t * c2[0]) + (t * t * t * p1[0]),
      (u * u * u * p0[1]) + (3 * u * u * t * c1[1]) + (3 * u * t * t * c2[1]) + (t * t * t * p1[1]),
    ]);
  }
  return pts;
}

/** Points on an arc about (cx, cy), angles in radians. */
export function arc(cx, cy, r, a0, a1, n = 12) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i / n);
    pts.push([cx + (r * Math.cos(a)), cy + (r * Math.sin(a))]);
  }
  return pts;
}

/** The width at point `i` of `n`: from a list of widths, or between `w0` and `w1`. */
function widthAt(w0, w1, i, n) {
  if (Array.isArray(w0)) {
    if (w0.length === n) return w0[i];
    // a shorter list is spread along the points
    const t = (i / Math.max(n - 1, 1)) * (w0.length - 1);
    const k = Math.min(Math.floor(t), w0.length - 2);
    return w0[k] + ((w0[k + 1] - w0[k]) * (t - k));
  }
  return w0 + ((w1 - w0) * i / Math.max(n - 1, 1));
}

/**
 * A polygon round a polyline, `w0` wide at its start and `w1` at its end
 * (widths across). `w0` may instead be a list of widths, one per point, for
 * a limb that swells and narrows.
 */
export function taperPolygon(points, w0, w1 = w0) {
  const n = points.length;
  if (n < 2) return [];
  const left = [];
  const right = [];
  for (let i = 0; i < n; i++) {
    const prev = points[Math.max(i - 1, 0)];
    const next = points[Math.min(i + 1, n - 1)];
    let dx = next[0] - prev[0];
    let dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const w = widthAt(w0, w1, i, n) / 2;
    left.push([points[i][0] - (dy * w), points[i][1] + (dx * w)]);
    right.push([points[i][0] + (dy * w), points[i][1] - (dx * w)]);
  }
  return [...left, ...right.reverse()];
}

/** A Path2D round a polyline, tapered, with round caps. */
export function taperPath(points, w0, w1 = w0) {
  const poly = taperPolygon(points, w0, w1);
  const n = points.length;
  const p = new globalThis.Path2D();
  if (!poly.length) return p;
  const capAngle = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const startA = capAngle(points[1], points[0]);
  const endA = capAngle(points[n - 2], points[n - 1]);
  // the left side, round the end, the right side back, round the start
  p.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < n; i++) p.lineTo(poly[i][0], poly[i][1]);
  p.arc(points[n - 1][0], points[n - 1][1], widthAt(w0, w1, n - 1, n) / 2, endA + (Math.PI / 2), endA - (Math.PI / 2), true);
  for (let i = n; i < poly.length; i++) p.lineTo(poly[i][0], poly[i][1]);
  p.arc(points[0][0], points[0][1], widthAt(w0, w1, 0, n) / 2, startA + (Math.PI / 2), startA - (Math.PI / 2), true);
  p.closePath();
  return p;
}

/** The points of a regular star, first point up. */
export function starPoints(cx, cy, points, outer, inner, rotation = 0) {
  const pts = [];
  for (let k = 0; k < points * 2; k++) {
    const r = k % 2 ? inner : outer;
    const a = (k * Math.PI / points) - (Math.PI / 2) + rotation;
    pts.push([cx + (r * Math.cos(a)), cy + (r * Math.sin(a))]);
  }
  return pts;
}

/** An SVG path string (or a Path2D) as a Path2D. */
export function toPath(path) {
  if (typeof path === "string") return new globalThis.Path2D(path);
  return path;
}

function polyPath(points, closed = true) {
  const p = new globalThis.Path2D();
  points.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  if (closed) p.closePath();
  return p;
}

/** The passes a charge is drawn in, in order. */
export const PASSES = Object.freeze(["outline", "fill", "hole", "detail"]);

/**
 * The ways a charge can be drawn:
 * - painted: the rulebook's look - flat paint, a fine dark edge round
 *   figures (none round plain shapes such as mullets and crosses) and fine lines
 * - outlined: flat paint inside a bold dark outline
 * - silhouette: flat paint only, no lines at all
 * - line: outline only - the edges and lines in the charge's tincture, the field showing through
 */
export const CHARGE_STYLES = Object.freeze(["painted", "outlined", "silhouette", "line"]);
/** The detail levels: simple, normal and detailed. */
export const DETAIL_LEVELS = Object.freeze([1, 2, 3]);
export const DEFAULT_CHARGE_STYLE = "painted";
export const DEFAULT_DETAIL = 2;

/** A charge style id, or the default for anything else. */
export function chargeStyle(style) {
  return CHARGE_STYLES.includes(style) ? style : DEFAULT_CHARGE_STYLE;
}

/** A detail level, 1 to 3, or the default for anything else. */
export function detailLevel(level) {
  const n = Math.round(Number(level));
  return DETAIL_LEVELS.includes(n) ? n : DEFAULT_DETAIL;
}

/** The paint of lines drawn on a dark charge (sable): the rulebook draws these light. */
const LIGHT_INK = "#efe6cf";

/** Whether a paint is dark enough that dark lines would vanish on it. */
export function isDarkPaint(paint) {
  const m = (/^#?([0-9a-f]{6})$/i).exec(String(paint ?? ""));
  if (!m) return false;
  const [r, g, b] = [0, 2, 4].map((k) => parseInt(m[1].slice(k, k + 2), 16) / 255);
  return ((0.2126 * r) + (0.7152 * g) + (0.0722 * b)) < 0.3;
}

/** How wide a style draws the edge round a charge, in box units (0 for none). */
function edgeWidth(style, outline, flat) {
  if (style === "silhouette" || (style === "painted" && flat)) return 0;
  if (style === "painted") return outline * 0.45;
  if (style === "line") return outline * 0.75;
  return outline;
}

/** How wide a style draws the lines between a charge's parts (0 for none). */
function innerWidth(style, outline) {
  if (style === "silhouette") return 0;
  if (style === "outlined") return Math.min(outline, 1.4);
  return Math.min(outline * 0.5, 1.1) * (style === "line" ? 1.3 : 1);
}

/** The paint of lines on a charge of this paint: light on a dark charge, else the outline's. */
export function inkFor(fill) {
  return isDarkPaint(fill) ? LIGHT_INK : OUTLINE;
}

/** The paint of a charge's lines: its own paint for line art, light on a dark charge, else the outline's. */
function linePaint(style, fill) {
  if (style === "line") return fill;
  return isDarkPaint(fill) ? LIGHT_INK : OUTLINE;
}

/**
 * The drawing surface a charge's picture draws on. One is made per pass;
 * each method does what the pass needs and nothing else.
 */
export class Sketch {
  /**
   * @param {CanvasRenderingContext2D} ctx  Transformed so 100 units fill the charge's box
   * @param {string} pass  outline | fill | hole | detail
   * @param {object} options
   * @param {number} options.outline  Width of the outline, in box units
   * @param {string} options.fill  Paint of the charge
   * @param {string} options.second  Paint of its second parts (proper), or the same paint
   * @param {boolean} options.proper  Whether second parts get their own paint
   * @param {string} [options.style]  One of CHARGE_STYLES
   * @param {number} [options.detail]  The detail level, 1 to 3
   * @param {boolean} [options.flat]  A plain shape: no edge in the painted style
   * @param {number} [options.lineScale]  How much thicker detail lines are drawn (small charges)
   */
  constructor(ctx, pass, { outline, fill, second, proper, style = "outlined", detail = 3, flat = false, lineScale = 1 }) {
    this.ctx = ctx;
    this.pass = pass;
    this.style = chargeStyle(style);
    this.level = detailLevel(detail);
    this.fillPaint = fill;
    this.secondPaint = second;
    this.proper = proper;
    this.lineScale = lineScale;
    const line = this.style === "line";
    /** The edge round the silhouette (0 for none), the lines inside it, and their paint. */
    this.outline = edgeWidth(this.style, outline, flat);
    this.inner = innerWidth(this.style, outline);
    this.edgeInk = line ? fill : OUTLINE;
    this.ink = linePaint(this.style, fill);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  /** The paint a part gets in the fill pass. */
  paintFor(second) {
    return second && this.proper ? this.secondPaint : this.fillPaint;
  }

  /** Whether lines of a detail level are drawn. */
  shows(level) {
    return this.style !== "silhouette" && level <= this.level;
  }

  /** In the line style the paint is cut away, leaving the outline pass's edge. */
  get _cut() {
    return this.style === "line";
  }

  _erase(fn) {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#000";
    fn(ctx);
    ctx.restore();
  }

  _fillPath(path, { second = false, rule = "nonzero", edged = false } = {}) {
    const { ctx } = this;
    // a part's own line is drawn with its paint, so parts drawn over it cover it
    const lined = (edged || second) && this.inner > 0;
    if (this.pass === "outline") {
      if (!this.outline) return;
      ctx.fillStyle = this.edgeInk;
      ctx.strokeStyle = this.edgeInk;
      ctx.lineWidth = this.outline * 2;
      ctx.fill(path, rule);
      ctx.stroke(path);
    } else if (this.pass === "fill") {
      if (this._cut) {
        this._erase((c) => c.fill(path, rule));
        if (lined) {
          ctx.strokeStyle = this.ink;
          ctx.lineWidth = this.inner;
          ctx.stroke(path);
        }
        return;
      }
      ctx.fillStyle = this.paintFor(second);
      ctx.fill(path, rule);
      if (lined) {
        ctx.strokeStyle = this.ink;
        ctx.lineWidth = this.inner;
        ctx.stroke(path);
      }
    }
  }

  /** A filled area: an SVG path string, a Path2D or a list of points. */
  part(path, options) {
    const p = Array.isArray(path) ? polyPath(path) : toPath(path);
    this._fillPath(p, options);
    return this;
  }

  /** A polygon. */
  poly(points, options) {
    return this.part(points, options);
  }

  circle(cx, cy, r, options) {
    const p = new globalThis.Path2D();
    p.arc(cx, cy, r, 0, Math.PI * 2);
    this._fillPath(p, options);
    return this;
  }

  ellipse(cx, cy, rx, ry, rotation, options) {
    const p = new globalThis.Path2D();
    p.ellipse(cx, cy, rx, ry, rotation ?? 0, 0, Math.PI * 2);
    this._fillPath(p, options);
    return this;
  }

  rect(x, y, w, h, options) {
    const p = new globalThis.Path2D();
    p.rect(x, y, w, h);
    this._fillPath(p, options);
    return this;
  }

  /** A thick line (part of the silhouette): points or a path, `w` wide. */
  line(path, w, { second = false, closed = false, edged = false } = {}) {
    const p = Array.isArray(path) ? polyPath(path, closed) : toPath(path);
    const { ctx } = this;
    const lined = (edged || second) && this.inner > 0;
    if (this.pass === "outline") {
      if (!this.outline) return this;
      ctx.strokeStyle = this.edgeInk;
      ctx.lineWidth = w + (this.outline * 2);
      ctx.stroke(p);
    } else if (this.pass === "fill") {
      if (this._cut) {
        if (lined) {
          ctx.strokeStyle = this.ink;
          ctx.lineWidth = w + (this.inner * 2);
          ctx.stroke(p);
        }
        this._erase((c) => {
          c.lineWidth = w;
          c.stroke(p);
        });
        return this;
      }
      if (lined) {
        ctx.strokeStyle = this.ink;
        ctx.lineWidth = w + (this.inner * 2);
        ctx.stroke(p);
      }
      ctx.strokeStyle = this.paintFor(second);
      ctx.lineWidth = w;
      ctx.stroke(p);
    }
    return this;
  }

  /** A limb: a polyline `w0` wide at the start and `w1` at the end (or a list of widths), round-ended, as one shape. */
  taper(points, w0, w1 = w0, options = {}) {
    this.part(taperPath(points, w0, w1), options);
    return this;
  }

  /** A hole through the charge, showing the field. */
  hole(path) {
    if (this.pass !== "hole") return this;
    const p = Array.isArray(path) ? polyPath(path) : toPath(path);
    const { ctx } = this;
    this._erase((c) => c.fill(p));
    if (!this.outline) return this;
    ctx.save();
    // the edge round the hole: inside the paint, or (line style) round the cut-out
    ctx.globalCompositeOperation = this._cut ? "source-over" : "source-atop";
    ctx.strokeStyle = this.edgeInk;
    ctx.lineWidth = this._cut ? this.outline : this.outline * 2;
    ctx.stroke(p);
    ctx.restore();
    return this;
  }

  /** A detail line in the outline's paint: a path or points, `w` wide, drawn from detail `level` up. */
  detail(path, w = 1.4, { closed = false, level = 2 } = {}) {
    if (this.pass !== "detail" || !this.shows(level)) return this;
    const p = Array.isArray(path) ? polyPath(path, closed) : toPath(path);
    const { ctx } = this;
    ctx.strokeStyle = this.ink;
    ctx.lineWidth = this._lineWidth(w);
    ctx.stroke(p);
    return this;
  }

  /** A detail dot (an eye), drawn from detail `level` up. */
  dot(cx, cy, r = 1.6, { level = 1 } = {}) {
    if (this.pass !== "detail" || !this.shows(level)) return this;
    const { ctx } = this;
    ctx.fillStyle = this.ink;
    ctx.beginPath();
    ctx.arc(cx, cy, r * Math.min(this.lineScale, 1.4), 0, Math.PI * 2);
    ctx.fill();
    return this;
  }

  /** A small area filled in the line paint (a nostril, an open mouth), drawn from detail `level` up. */
  mark(path, { level = 1 } = {}) {
    if (this.pass !== "detail" || !this.shows(level)) return this;
    const p = Array.isArray(path) ? polyPath(path) : toPath(path);
    this.ctx.fillStyle = this.ink;
    this.ctx.fill(p);
    return this;
  }

  _lineWidth(w) {
    const scaled = w * this.lineScale;
    if (this.style === "outlined") return scaled;
    // painted and line styles keep their lines fine, a touch heavier for line art
    return scaled * (this._cut ? 0.95 : 0.8);
  }

  /** Draws `fn` clipped to a path (an SVG path string, a Path2D or points), in every pass. */
  clipped(path, fn, rule = "nonzero") {
    const p = Array.isArray(path) ? polyPath(path) : toPath(path);
    const { ctx } = this;
    ctx.save();
    ctx.clip(p, rule);
    fn(this);
    ctx.restore();
    return this;
  }

  /** Draws `fn` with the box mirrored left to right. */
  mirrored(fn) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(100, 0);
    ctx.scale(-1, 1);
    fn(this);
    ctx.restore();
    return this;
  }

  /** Draws `fn` moved, scaled and turned (degrees) about (x, y). */
  at(x, y, scale, degrees, fn) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(((degrees ?? 0) * Math.PI) / 180);
    ctx.scale(scale ?? 1, scale ?? 1);
    ctx.translate(-50, -50);
    fn(this);
    ctx.restore();
    return this;
  }
}

/** The outline width a charge gets at `size` pixels: thinner on small charges, in box units. */
export function outlineFor(size) {
  return Math.max(1.2, Math.min(2.4, 180 / Math.max(size, 1)));
}

/** Below this many pixels a charge is drawn at the simple detail level whatever was asked. */
const SMALL_CHARGE = 48;

/**
 * Draws a charge into a new square canvas of `size` pixels.
 * @param {(s: Sketch, o: object) => void} picture
 * @param {object} options
 * @param {number} options.size
 * @param {string} options.fill  The charge's paint
 * @param {string} [options.second]  The paint of its second parts when proper
 * @param {boolean} [options.proper]
 * @param {object} [options.pose]  Passed to the picture: { head, attitude }
 * @param {(w: number, h: number) => HTMLCanvasElement} options.createCanvas
 * @param {number} [options.outline]  Outline width in box units
 * @param {number} [options.pad]  Extra room round the box, as a fraction of size
 * @param {string} [options.style]  One of CHARGE_STYLES
 * @param {number} [options.detail]  1 (simple) to 3 (detailed)
 * @param {boolean} [options.flat]  A plain shape, drawn without an edge in the painted style
 */
export function renderCharge(picture, { size, fill, second, proper = false, pose = {}, createCanvas, outline, pad = 0.06, style = DEFAULT_CHARGE_STYLE, detail = DEFAULT_DETAIL, flat = false }) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const inner = size * (1 - (2 * pad));
  const scale = inner / 100;
  const o = outline ?? outlineFor(inner);
  const level = inner < SMALL_CHARGE ? 1 : detailLevel(detail);
  const lineScale = o / 1.2;
  const cut = chargeStyle(style) === "line";
  for (const pass of PASSES) {
    ctx.save();
    if (pass === "detail" && !cut) ctx.globalCompositeOperation = "source-atop";
    ctx.translate(size * pad, size * pad);
    ctx.scale(scale, scale);
    const sketch = new Sketch(ctx, pass, { outline: o, fill, second: second ?? fill, proper, style, detail: level, flat, lineScale });
    picture(sketch, pose);
    ctx.restore();
  }
  return canvas;
}
