/**
 * damask.js - the faint pattern over a shield's paint, so a plain field is
 * not quite flat: a repeating tile from art/damask (see art.js), its lines
 * drawn in a slightly darker tone with a slightly lighter copy beside them,
 * as if pressed into the paint.
 *
 * The patterns: dotted scrolls (the default), a lattice of lozenges and
 * crescents, and a pomegranate brocade. A coat's `damask` is one of their
 * ids or "none"; true and false, from coats saved before there was a choice,
 * read as the default and "none".
 */

import { artImage, damaskEntry } from "../charges/art.js";
import { hashString } from "../rng.js";

/** The damask patterns, the default first. */
export const DAMASK_PATTERNS = Object.freeze(["scrolls", "lattice", "brocade"]);
export const DEFAULT_DAMASK = "scrolls";
/** No damask at all. */
export const NO_DAMASK = "none";

/** A damask choice from anything: a pattern id, "none", or an old true/false. */
export function damaskPattern(value) {
  if (value === false || value === NO_DAMASK) return NO_DAMASK;
  return DAMASK_PATTERNS.includes(value) ? value : DEFAULT_DAMASK;
}

const tiles = new Map();
const TILE_LIMIT = 24;

/** A tile drawn `width` pixels across, its lines as alpha in one colour. */
function inkTile(entry, image, width, colour, createCanvas) {
  const key = `${entry.id}|${width}|${colour}`;
  const hit = tiles.get(key);
  if (hit) return hit;
  const iw = image.naturalWidth || image.width || 1;
  const ih = image.naturalHeight || image.height || 1;
  const w = Math.max(8, Math.round(width));
  const h = Math.max(8, Math.round(w * ih / iw));
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(image, 0, 0, w, h);
  const pixels = ctx.getImageData(0, 0, w, h);
  const d = pixels.data;
  const [r, g, b] = colour === "light" ? [255, 255, 255] : [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) {
    // the darker the drawing, the more of the tone
    const ink = 1 - (((0.2126 * d[i]) + (0.7152 * d[i + 1]) + (0.0722 * d[i + 2])) / 255);
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = Math.round(ink * 255);
  }
  ctx.putImageData(pixels, 0, 0);
  if (tiles.size >= TILE_LIMIT) tiles.clear();
  tiles.set(key, canvas);
  return canvas;
}

/** Forgets the drawn tiles (for tests). */
export function clearDamaskTiles() {
  tiles.clear();
}

/**
 * Paints a damask pattern over the current clip, on a context scaled to
 * shield units: `w` by `h` units, `unit` pixels per unit. Nothing is drawn
 * for "none" or while the pattern's picture is not loaded.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {object} options
 * @param {string|boolean} [options.pattern]  A pattern id (see damaskPattern)
 * @param {number|string} [options.seed]  Shifts the pattern, so coats do not all line up the same
 * @param {number} options.unit
 * @param {(w: number, h: number) => HTMLCanvasElement} options.createCanvas
 * @param {number} [options.strength]  How visible, 1 being the usual faint tone
 */
export function paintDamask(ctx, w, h, { pattern, seed = 7, unit, createCanvas, strength = 1 }) {
  const id = damaskPattern(pattern);
  if (id === NO_DAMASK) return;
  const entry = damaskEntry(id);
  const image = artImage(entry);
  if (!image) return;
  const width = Math.max(8, entry.units * unit);
  const shift = hashString(String(seed));
  const offset = [(shift % 997) / 997, (Math.floor(shift / 997) % 991) / 991].map((f) => f * width);
  const amount = entry.strength * strength;
  ctx.save();
  // back to pixels, so the tile is drawn at its own resolution
  ctx.scale(1 / unit, 1 / unit);
  const W = (w + 40) * unit;
  const H = (h + 40) * unit;
  for (const [colour, nudge, alpha] of [["light", Math.max(0.6, unit * 0.12), 0.16], ["dark", 0, 0.2]]) {
    const tile = inkTile(entry, image, width, colour, createCanvas);
    const fill = ctx.createPattern(tile, "repeat");
    ctx.save();
    ctx.globalAlpha = alpha * amount;
    ctx.translate(offset[0] + nudge, offset[1] + nudge);
    ctx.fillStyle = fill;
    ctx.fillRect(-offset[0] - nudge - (20 * unit), -offset[1] - nudge - (20 * unit), W, H);
    ctx.restore();
  }
  ctx.restore();
}
