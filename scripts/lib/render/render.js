/**
 * render.js - draws a coat of arms: the shield shape, its field, the
 * ordinary and the charges, with the rulebook's damask and a soft edge.
 * Pure canvas 2D; `createCanvas` makes the canvases (the DOM's by default,
 * or a Node one for tests and tools).
 */

import { chargeInfo, isFlat, isGeometric } from "../charges/catalogue.js";
import { codePicture, picture } from "../charges/index.js";
import { artEntry, artImage, artPath } from "../charges/art.js";
import { renderArt } from "../charges/art-render.js";
import { chargeStyle, inkFor, renderCharge } from "../charges/sketch.js";
import { OUTLINE, PROPER, tinctureFill } from "../tinctures.js";
import { fieldSlots } from "./arrange.js";
import { paintDamask } from "./damask.js";
import { divisionRegions, paintField, paintVariation } from "./field.js";
import { EDGE_ORDINARIES, ordinaryFillRule, ordinaryPath, ordinarySlots } from "./ordinaries.js";
import { isPlaced, placeSlots } from "./placement.js";
import { shapeInfo, shapePath } from "./shapes.js";

/** The default canvas maker: a DOM canvas. */
export function domCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

const cache = new Map();
const CACHE_LIMIT = 240;

/**
 * The picture of a charge at `px` pixels in a tincture (or proper), cached:
 * drawn in code for the plain geometric charges, from its file picture for
 * the rest (the roundel stands in while that is not loaded). `style` is one
 * of CHARGE_STYLES.
 * @returns {HTMLCanvasElement|null}
 */
export function chargeImage(id, px, tincture, { head = false, attitude = null, style, createCanvas = domCanvas } = {}) {
  const size = Math.max(4, Math.round(px));
  const look = chargeStyle(style);
  const info = chargeInfo(id);
  const code = codePicture(id);
  const entry = code ? null : artEntry(id, { head, attitude: attitude ?? info.attitude ?? null });
  const image = entry ? artImage(entry) : null;
  const key = `${id}|${size}|${tincture}|${look}|${image ? artPath(entry) : `code:${head}|${attitude}`}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const proper = tincture === PROPER;
  const fill = proper ? (isGeometric(id) ? tinctureFill("or") : info.proper.fill) : tinctureFill(tincture);
  let canvas;
  if (image) {
    canvas = renderArt(image, entry, { size, paint: fill, ink: inkFor(fill), style: look, createCanvas });
  } else {
    const second = proper ? (info.proper.second ?? info.proper.fill) : fill;
    canvas = renderCharge(code ?? picture(id), {
      size, fill, second, proper, createCanvas, style: look, flat: isFlat(id),
      pose: { head, attitude: attitude ?? info.attitude ?? null, id },
    });
  }
  if (cache.size >= CACHE_LIMIT) cache.clear();
  // a stand-in drawn before the art loaded is not kept
  if (image || code) cache.set(key, canvas);
  return canvas;
}

/** Forgets every cached charge picture. */
export function clearChargeCache() {
  cache.clear();
}

/**
 * Draws one charge at a slot: { u, v, size, angle } in shield units.
 */
function drawCharge(ctx, group, slot, { unit, shapeId, createCanvas, counter, look }) {
  const px = slot.size * unit;
  const draw = (tincture) => {
    const img = chargeImage(group.type, px, tincture, { head: group.head, attitude: group.attitude, createCanvas, style: look.style });
    if (!img) return;
    ctx.save();
    ctx.translate(slot.u, slot.v);
    if (slot.angle) ctx.rotate((slot.angle * Math.PI) / 180);
    ctx.drawImage(img, -slot.size / 2, -slot.size / 2, slot.size, slot.size);
    ctx.restore();
  };
  if (!counter) {
    draw(group.tincture);
    return;
  }
  const [first, second] = divisionRegions(counter.division.type, shapeId);
  const [a, b] = counter.tinctures;
  for (const [region, tincture] of [[first, b], [second, a]]) {
    ctx.save();
    ctx.clip(region);
    draw(tincture);
    ctx.restore();
  }
}

/**
 * Draws the arms into a canvas.
 * @param {object} arms
 * @param {object} [options]
 * @param {number} [options.size=512]  Canvas width and height in pixels
 * @param {string} [options.shape="heater"]
 * @param {string|boolean} [options.damask="scrolls"]  The faint pattern over the paint: scrolls, lattice, brocade or none (true and false read as scrolls and none)
 * @param {boolean} [options.shade=true]  A soft edge shadow and highlight
 * @param {boolean} [options.outline=true]  The dark line round the shield
 * @param {number} [options.damaskStrength=1]  How strongly the damask shows (the Shield tab's tiles draw it stronger)
 * @param {number|string} [options.seed]  Shifts the damask
 * @param {string} [options.chargeStyle="painted"]  How charges are drawn: painted, outlined, silhouette or line
 * @param {Function} [options.createCanvas]
 * @returns {HTMLCanvasElement}
 */
export function renderArms(arms, options = {}) {
  const { size = 512, shape: shapeId = "heater", createCanvas = domCanvas } = options;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const shape = shapeInfo(shapeId);
  const margin = 0.04;
  const unit = (size * (1 - (2 * margin))) / Math.max(shape.width, shape.height);
  ctx.save();
  ctx.translate((size - (shape.width * unit)) / 2, (size - (shape.height * unit)) / 2);
  ctx.scale(unit, unit);
  paintShield(ctx, arms, { ...options, shapeId, unit, createCanvas });
  ctx.restore();
  return canvas;
}

/**
 * Paints arms in the shield's box on a context already scaled to it.
 * `unit` is pixels per box unit (for charge pictures).
 */
export function paintShield(ctx, arms, { shapeId = "heater", unit = 5, createCanvas = domCanvas, damask = true, damaskStrength = 1, shade = true, outline = true, seed = 7, chargeStyle: style }) {
  const shape = shapeInfo(shapeId);
  const path = shapePath(shapeId);
  const look = { style };
  const charge = (id, px, tincture) => chargeImage(id, px * unit, tincture, { createCanvas, style });
  ctx.save();
  ctx.clip(path);
  paintField(ctx, arms.field, { shapeId, chargeImage: charge });
  if (arms.halves) {
    paintHalves(ctx, arms, { shapeId, unit, createCanvas, look });
  } else {
    paintContents(ctx, arms, { shapeId, unit, createCanvas, charge, look });
  }
  paintDamask(ctx, shape.width, shape.height, { pattern: damask, seed, unit, createCanvas, strength: damaskStrength });
  if (shade) paintShade(ctx, shape);
  ctx.restore();
  if (outline) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.7;
    ctx.lineJoin = "round";
    ctx.stroke(path);
  }
}

/** The ordinary and the charges of undivided arms (or of a division drawn overall). */
function paintContents(ctx, arms, { shapeId, unit, createCanvas, charge, look }) {
  const counterchanged = arms.field.division?.design === "countercharged"
    ? { division: arms.field.division, tinctures: arms.field.division.tinctures }
    : null;
  const ordinary = arms.ordinary;
  // each group's slots as rolled, then moved, sized and nudged as it asks
  const slotsFor = (groups, slotFn, options) => {
    const total = groups.reduce((n, g) => n + g.count, 0);
    const slots = slotFn(total);
    let k = 0;
    return groups.map((g) => ({ group: g, slots: placeSlots(slots.slice(k, (k += g.count)), g, shapeId, options) }));
  };
  // charges on the field, round the ordinary
  const between = ordinary && !EDGE_ORDINARIES.includes(ordinary.type) ? ordinary.type : (ordinary?.type ?? null);
  const onField = slotsFor(arms.charges, (n) => fieldSlots(shapeId, n, between));
  // charges as rolled lie beside the ordinary, under it; a charge moved or
  // resized on purpose is drawn over it, so it shows wherever it was put
  const drawField = (moved) => {
    for (const { group, slots } of onField) {
      if (isPlaced(group) !== moved) continue;
      for (const slot of slots) drawCharge(ctx, group, slot, { unit, shapeId, createCanvas, counter: counterchanged, look });
    }
  };
  drawField(false);
  if (!ordinary) {
    drawField(true);
    return;
  }
  const opath = ordinaryPath(ordinary.type, shapeId);
  const rule = ordinaryFillRule(ordinary.type);
  // the outline first, then the paint over it: only its outer half shows,
  // so a cross or saltire has no seams where its bands overlap
  ctx.save();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.8;
  ctx.lineJoin = "round";
  ctx.stroke(opath);
  ctx.restore();
  ctx.save();
  ctx.clip(opath, rule);
  if (ordinary.variation) {
    paintVariation(ctx, ordinary.variation, 100, shapeInfo(shapeId).height, { chargeImage: charge, shapeId });
  } else if (counterchanged) {
    const [first, second] = divisionRegions(counterchanged.division.type, shapeId);
    const [a, b] = counterchanged.tinctures;
    for (const [region, tincture] of [[first, b], [second, a]]) {
      ctx.save();
      ctx.clip(region);
      ctx.fillStyle = tinctureFill(tincture);
      ctx.fillRect(-20, -20, 140, 160);
      ctx.restore();
    }
  } else {
    ctx.fillStyle = tinctureFill(ordinary.tincture);
    ctx.fillRect(-20, -20, 140, 160);
  }
  ctx.restore();
  for (const { group, slots } of slotsFor(ordinary.charges ?? [], (n) => ordinarySlots(ordinary.type, n, shapeId), { allowPlace: false })) {
    for (const slot of slots) drawCharge(ctx, group, slot, { unit, shapeId, createCanvas, counter: null, look });
  }
  drawField(true);
}

/**
 * A divided shield whose halves are their own arms: quarterly, each coat
 * is drawn small in its quarters; otherwise each is drawn full size and
 * clipped to its half.
 */
function paintHalves(ctx, arms, { shapeId, unit, createCanvas, look }) {
  const shape = shapeInfo(shapeId);
  const type = arms.field.division.type;
  const [first, second] = divisionRegions(type, shapeId);
  const H = shape.height;
  const fess = H * shape.fess;
  if (type === "quarterly") {
    const quarters = [[0, 0, 0], [50, fess, 0], [50, 0, 1], [0, fess, 1]];
    for (const [x, y, k] of quarters) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, 50, k === 0 && y === 0 ? fess : H);
      ctx.clip();
      ctx.translate(x, y);
      ctx.scale(0.5, 0.5);
      paintShield(ctx, arms.halves[k], { shapeId: "square", unit: unit / 2, createCanvas, damask: false, shade: false, outline: false, chargeStyle: look.style });
      ctx.restore();
    }
    return;
  }
  [first, second].forEach((region, k) => {
    ctx.save();
    ctx.clip(region);
    paintShield(ctx, arms.halves[k], { shapeId, unit, createCanvas, damask: false, shade: false, outline: false, chargeStyle: look.style });
    ctx.restore();
  });
  ctx.save();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.8;
  ctx.stroke(second);
  ctx.restore();
}

/** A soft darkening toward the edge and a light from the top left. */
function paintShade(ctx, shape) {
  const [cx, cy] = shape.centre;
  const r = Math.max(shape.width, shape.height) * 0.62;
  const vignette = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = vignette;
  ctx.fillRect(-20, -20, shape.width + 40, shape.height + 40);
  const light = ctx.createLinearGradient(0, 0, shape.width * 0.6, shape.height * 0.7);
  light.addColorStop(0, "rgba(255,255,255,0.14)");
  light.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = light;
  ctx.fillRect(-20, -20, shape.width + 40, shape.height + 40);
}
