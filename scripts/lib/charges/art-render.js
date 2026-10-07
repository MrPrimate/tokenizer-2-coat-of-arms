/**
 * art-render.js - draws a charge from its file picture into a square
 * canvas: turned and mirrored as its entry asks, cropped to what it draws
 * (files come with their own margins), fitted to the charge's box, then
 * recoloured in the charge's tincture (see tint.js).
 */

import { artPath } from "./art.js";
import { hexBytes, isSilhouette, paintLevel, solidBox, tintPixels } from "./tint.js";

/** The size pictures are measured at (their solid box and paint brightness). */
const PROBE = 256;
const measures = new Map();

function imageSize(image) {
  return [image.naturalWidth || image.width || 1, image.naturalHeight || image.height || 1];
}

/** Draws the picture turned and mirrored, filling an `s` x `s` square at the origin (aspect kept). */
function drawOriented(ctx, image, entry, s) {
  const [w, h] = imageSize(image);
  const turn = (((entry.rotate ?? 0) % 360) + 360) % 360;
  const across = turn === 90 || turn === 270;
  const k = s / Math.max(across ? h : w, across ? w : h);
  ctx.save();
  ctx.translate(s / 2, s / 2);
  if (turn) ctx.rotate((turn * Math.PI) / 180);
  if (entry.flip) ctx.scale(-1, 1);
  ctx.drawImage(image, -(w * k) / 2, -(h * k) / 2, w * k, h * k);
  ctx.restore();
}

/** The picture's solid box (fractions of its oriented square) and paint brightness, measured once. */
function measure(image, entry, createCanvas) {
  const key = `${artPath(entry)}|${entry.flip}|${entry.rotate}`;
  const hit = measures.get(key);
  if (hit) return hit;
  const canvas = createCanvas(PROBE, PROBE);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  drawOriented(ctx, image, entry, PROBE);
  const { data } = ctx.getImageData(0, 0, PROBE, PROBE);
  const result = { box: solidBox(data, PROBE, PROBE), level: paintLevel(data) };
  measures.set(key, result);
  return result;
}

/** Forgets the measurements (for tests). */
export function clearArtMeasures() {
  measures.clear();
}

/** A shape's edge: the shape less itself shrunk by a line's width (a silhouette in the line style). */
function edgeOf(shape, size, createCanvas) {
  const w = Math.max(1, size * 0.018);
  const inner = createCanvas(size, size);
  const ictx = inner.getContext("2d");
  ictx.drawImage(shape, 0, 0);
  // shrink: keep only what is still covered with the shape moved each way
  ictx.globalCompositeOperation = "destination-in";
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    ictx.drawImage(shape, Math.cos(a) * w, Math.sin(a) * w);
  }
  const out = createCanvas(size, size);
  const octx = out.getContext("2d");
  octx.drawImage(shape, 0, 0);
  octx.globalCompositeOperation = "destination-out";
  octx.drawImage(inner, 0, 0);
  return out;
}

/**
 * The charge drawn from its picture.
 * @param {object} image  The decoded picture (an Image, or a Node canvas image)
 * @param {object} entry  Its art entry
 * @param {object} options
 * @param {number} options.size  Canvas width and height, in pixels
 * @param {string} options.paint  The charge's paint, "#rrggbb"
 * @param {string} options.ink  The lines' paint, "#rrggbb"
 * @param {string} [options.style]  painted | outlined | silhouette | line
 * @param {(w: number, h: number) => HTMLCanvasElement} options.createCanvas
 * @param {number} [options.pad]  Room round the picture, as a fraction of size
 * @returns {HTMLCanvasElement}
 */
export function renderArt(image, entry, { size, paint, ink, style = "painted", createCanvas, pad = 0.06 }) {
  const { box, level } = measure(image, entry, createCanvas);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const inner = size * (1 - (2 * pad));
  const [x0, y0, x1, y1] = box;
  // the oriented square's size that makes the solid box fill the inner square
  const s = inner / Math.max(x1 - x0, y1 - y0, 1e-3);
  ctx.save();
  ctx.translate((size / 2) - (((x0 + x1) / 2) * s), (size / 2) - (((y0 + y1) / 2) * s));
  drawOriented(ctx, image, entry, s);
  ctx.restore();
  const pixels = ctx.getImageData(0, 0, size, size);
  tintPixels(pixels.data, { paint: hexBytes(paint), ink: hexBytes(ink), style, level });
  ctx.putImageData(pixels, 0, 0);
  if (style === "line" && isSilhouette(level)) return edgeOf(canvas, size, createCanvas);
  if (style !== "outlined") return canvas;
  // outlined: the picture over a bolder rim of ink
  const rim = createCanvas(size, size);
  const rctx = rim.getContext("2d");
  rctx.drawImage(canvas, 0, 0);
  rctx.globalCompositeOperation = "source-in";
  rctx.fillStyle = ink;
  rctx.fillRect(0, 0, size, size);
  const out = createCanvas(size, size);
  const octx = out.getContext("2d");
  const w = Math.max(1, size * 0.014);
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6;
    octx.drawImage(rim, Math.cos(a) * w, Math.sin(a) * w);
  }
  octx.drawImage(canvas, 0, 0);
  return out;
}
