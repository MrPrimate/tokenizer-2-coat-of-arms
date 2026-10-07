/**
 * field.js - painting the field: a plain tincture, a fur, a variation (the
 * stripes, checks and lattices of Sub-table B.1.1) or a division, in the
 * shield's box with the shield already clipped.
 */

import { tinctureFill, TINCTURES } from "../tinctures.js";
import { outlinePath, outlinesPath, shapeInfo } from "./shapes.js";
import { semeSlots } from "./arrange.js";

const OUTSIDE = 12;

/** The two halves of a divided field, as Path2D in the shield's box: [first, second]. */
// eslint-disable-next-line complexity
export function divisionRegions(type, shapeId) {
  const shape = shapeInfo(shapeId);
  const H = shape.height;
  const fess = H * shape.fess;
  const o = OUTSIDE;
  const box = (pts) => outlinePath(pts);
  switch (type) {
    case "pale":
      return [box([[-o, -o], [50, -o], [50, H + o], [-o, H + o]]), box([[50, -o], [100 + o, -o], [100 + o, H + o], [50, H + o]])];
    case "fess":
      return [box([[-o, -o], [100 + o, -o], [100 + o, fess], [-o, fess]]), box([[-o, fess], [100 + o, fess], [100 + o, H + o], [-o, H + o]])];
    case "bend":
      return [box([[-o, -o], [100 + o, -o], [100 + o, H + o], [H + o - (2 * o), H + o]]), box([[-o, -o], [-o, H + o], [H + o - (2 * o), H + o]])];
    case "bend-sinister":
      return [box([[100 + o, -o], [-o, -o], [100 - H - o + (2 * o), H + o]]), box([[100 + o, -o], [100 - H - o + (2 * o), H + o], [100 + o, H + o]])];
    case "quarterly":
      return [
        outlinesPath([[-o, -o], [50, -o], [50, fess], [-o, fess]], [[50, fess], [100 + o, fess], [100 + o, H + o], [50, H + o]]),
        outlinesPath([[50, -o], [100 + o, -o], [100 + o, fess], [50, fess]], [[-o, fess], [50, fess], [50, H + o], [-o, H + o]]),
      ];
    case "saltire": {
      // the diagonals through the fess point, out past the shield
      const c = [50, fess];
      const r = 200;
      const tl = [50 - r, fess - r];
      const tr = [50 + r, fess - r];
      const bl = [50 - r, fess + r];
      const br = [50 + r, fess + r];
      return [outlinesPath([tl, tr, c], [bl, br, c]), outlinesPath([tl, c, bl], [tr, c, br])];
    }
    case "chevron": {
      const apex = fess - 10;
      const line = [[-o, apex + 70], [50, apex], [100 + o, apex + 70]];
      return [box([[-o, -o], [100 + o, -o], ...line.slice().reverse()]), box([...line, [100 + o, H + o], [-o, H + o]])];
    }
    default:
      return [box([[-o, -o], [100 + o, -o], [100 + o, H + o], [-o, H + o]]), new globalThis.Path2D()];
  }
}

/** An ermine spot: a tail with three dots over it, `s` tall at (x, y). */
function ermineSpot(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y - (s * 0.1));
  ctx.bezierCurveTo(x + (s * 0.32), y + (s * 0.25), x + (s * 0.18), y + (s * 0.55), x, y + (s * 0.62));
  ctx.bezierCurveTo(x - (s * 0.18), y + (s * 0.55), x - (s * 0.32), y + (s * 0.25), x, y - (s * 0.1));
  ctx.fill();
  for (const [dx, dy] of [[0, -0.32], [-0.2, -0.2], [0.2, -0.2]]) {
    ctx.beginPath();
    ctx.arc(x + (dx * s), y + (dy * s), s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Paints a fur over the box. */
function paintFur(ctx, id, w, h) {
  const fur = TINCTURES[id];
  ctx.fillStyle = fur.fill;
  ctx.fillRect(-OUTSIDE, -OUTSIDE, w + (2 * OUTSIDE), h + (2 * OUTSIDE));
  if (id === "vair") {
    ctx.fillStyle = fur.bells;
    const cw = 16;
    const ch = 17;
    let row = 0;
    for (let y = -ch; y < h + ch; y += ch, row++) {
      const offset = row % 2 ? cw / 2 : 0;
      for (let x = -cw + offset; x < w + cw; x += cw) {
        ctx.beginPath();
        ctx.moveTo(x, y + ch);
        ctx.lineTo(x + (cw * 0.25), y + (ch * 0.42));
        ctx.lineTo(x + (cw * 0.25), y);
        ctx.lineTo(x + (cw * 0.75), y);
        ctx.lineTo(x + (cw * 0.75), y + (ch * 0.42));
        ctx.lineTo(x + cw, y + ch);
        ctx.closePath();
        ctx.fill();
      }
    }
    return;
  }
  ctx.fillStyle = fur.spots;
  const step = 15;
  let row = 0;
  for (let y = 4; y < h + step; y += step * 0.95, row++) {
    for (let x = (row % 2 ? step / 2 : 0); x < w + step; x += step) ermineSpot(ctx, x, y, 8);
  }
}

/** Paints a variation (two tinctures in a pattern) over the box. */
// eslint-disable-next-line complexity
export function paintVariation(ctx, variation, w, h, { chargeImage, shapeId }) {
  const [a, b] = variation.tinctures;
  if (variation.type === "fur") {
    paintFur(ctx, a, w, h);
    return;
  }
  const fillA = tinctureFill(a);
  const fillB = tinctureFill(b);
  ctx.fillStyle = fillA;
  ctx.fillRect(-OUTSIDE, -OUTSIDE, w + (2 * OUTSIDE), h + (2 * OUTSIDE));
  ctx.fillStyle = fillB;
  const count = variation.count ?? 6;
  switch (variation.type) {
    case "barry": {
      const s = h / count;
      for (let i = 1; i < count; i += 2) ctx.fillRect(-OUTSIDE, i * s, w + (2 * OUTSIDE), s);
      break;
    }
    case "paly": {
      const s = w / count;
      for (let i = 1; i < count; i += 2) ctx.fillRect(i * s, -OUTSIDE, s, h + (2 * OUTSIDE));
      break;
    }
    case "bendy":
    case "bendy-sinister": {
      const s = (w * 1.1) / count;
      const sign = variation.type === "bendy" ? 1 : -1;
      ctx.save();
      ctx.translate(50, h / 2);
      ctx.rotate(sign * Math.PI / 4);
      const L = 180;
      for (let k = -8; k < 8; k += 2) ctx.fillRect(k * s, -L, s, 2 * L);
      ctx.restore();
      break;
    }
    case "chequy": {
      const cols = 6;
      const s = w / cols;
      for (let r = -1; r * s < h + s; r++) {
        for (let c = 0; c < cols; c++) if ((r + c) % 2 === 0) ctx.fillRect(c * s, r * s, s, s);
      }
      break;
    }
    case "chevronny": {
      const n = 6;
      const step = (h * 1.15) / n;
      for (let i = -1; i < n + 1; i += 2) {
        const top = (i * step) - (h * 0.1);
        ctx.beginPath();
        ctx.moveTo(-OUTSIDE, top + 50 + OUTSIDE);
        ctx.lineTo(50, top);
        ctx.lineTo(100 + OUTSIDE, top + 50 + OUTSIDE);
        ctx.lineTo(100 + OUTSIDE, top + step + 50 + OUTSIDE);
        ctx.lineTo(50, top + step);
        ctx.lineTo(-OUTSIDE, top + step + 50 + OUTSIDE);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case "fretty": {
      ctx.save();
      ctx.translate(50, h / 2);
      ctx.rotate(Math.PI / 4);
      const gap = 26;
      const band = 6.5;
      ctx.strokeStyle = "rgba(0,0,0,0.28)";
      ctx.lineWidth = 0.9;
      for (let k = -5; k <= 5; k++) {
        ctx.fillRect((k * gap) - (band / 2), -180, band, 360);
        ctx.strokeRect((k * gap) - (band / 2), -180, band, 360);
      }
      for (let k = -5; k <= 5; k++) {
        ctx.fillRect(-180, (k * gap) - (band / 2), 360, band);
        ctx.strokeRect(-180, (k * gap) - (band / 2), 360, band);
      }
      ctx.restore();
      break;
    }
    case "gyronny": {
      const cx = 50;
      const cy = h * 0.45;
      const R = 200;
      for (let i = 0; i < count; i += 2) {
        const a0 = ((i / count) * Math.PI * 2) - Math.PI;
        const a1 = (((i + 1) / count) * Math.PI * 2) - Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + (R * Math.cos(a0)), cy + (R * Math.sin(a0)));
        ctx.lineTo(cx + (R * Math.cos(a1)), cy + (R * Math.sin(a1)));
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case "lozengy": {
      const cw = 20;
      const ch = 27;
      for (let r = -1; (r * ch) / 2 < h + ch; r++) {
        for (let c = -1; c * cw < w + cw; c++) {
          if ((r + c) % 2) continue;
          const x = c * cw;
          const y = (r * ch) / 2;
          ctx.beginPath();
          ctx.moveTo(x, y - (ch / 2));
          ctx.lineTo(x + (cw / 2), y);
          ctx.lineTo(x, y + (ch / 2));
          ctx.lineTo(x - (cw / 2), y);
          ctx.closePath();
          ctx.fill();
        }
      }
      break;
    }
    case "seme": {
      const id = variation.charge ?? "cross";
      for (const slot of semeSlots(shapeId, 11)) {
        const img = chargeImage(id, slot.size, b);
        if (img) ctx.drawImage(img, slot.u - (slot.size / 2), slot.v - (slot.size / 2), slot.size, slot.size);
      }
      break;
    }
    default:
      break;
  }
}

/**
 * Paints a field in the (clipped) shield box: plain, fur, variation or a
 * division in its two tinctures.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} field  arms.field
 * @param {{ shapeId: string, chargeImage: Function }} options
 */
export function paintField(ctx, field, { shapeId, chargeImage }) {
  const shape = shapeInfo(shapeId);
  const w = shape.width;
  const h = shape.height;
  if (field.division) {
    const [first, second] = divisionRegions(field.division.type, shapeId);
    const [a, b] = field.division.tinctures;
    for (const [region, tincture] of [[first, a], [second, b]]) {
      ctx.save();
      ctx.clip(region);
      if (TINCTURES[tincture]?.kind === "fur") paintFur(ctx, tincture, w, h);
      else {
        ctx.fillStyle = tinctureFill(tincture);
        ctx.fillRect(-OUTSIDE, -OUTSIDE, w + (2 * OUTSIDE), h + (2 * OUTSIDE));
      }
      ctx.restore();
    }
    return;
  }
  if (field.variation) {
    paintVariation(ctx, field.variation, w, h, { chargeImage, shapeId });
    return;
  }
  if (TINCTURES[field.tincture]?.kind === "fur") {
    paintFur(ctx, field.tincture, w, h);
    return;
  }
  ctx.fillStyle = tinctureFill(field.tincture);
  ctx.fillRect(-OUTSIDE, -OUTSIDE, w + (2 * OUTSIDE), h + (2 * OUTSIDE));
}
