/**
 * gallery.js - the picture tiles the window chooses from: small shields
 * showing a field pattern or an ordinary, charge thumbnails, a beast in
 * each attitude, shield shapes, and tincture swatches. Tiles draw when
 * they scroll into view.
 */

import { chargeImage, renderArms } from "../lib/render/render.js";
import { paintField } from "../lib/render/field.js";
import { tinctureFill, TINCTURES } from "../lib/tinctures.js";

let observer = null;
const pending = new WeakMap();

/** Draws into `canvas` once it is on screen (straight away without IntersectionObserver). */
export function whenVisible(canvas, draw) {
  if (typeof IntersectionObserver === "undefined") {
    draw();
    return;
  }
  observer ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const fn = pending.get(entry.target);
      pending.delete(entry.target);
      observer.unobserve(entry.target);
      fn?.();
    }
  }, { rootMargin: "120px" });
  pending.set(canvas, draw);
  observer.observe(canvas);
}

/** A thumbnail canvas that fills itself with `draw(ctx, size)` when seen. */
function thumb(size, draw) {
  const canvas = document.createElement("canvas");
  canvas.className = "tie-coa-thumb";
  // drawn at device resolution, so patterns stay crisp on HiDPI screens
  const scale = Math.min(3, Math.max(1, Math.ceil(globalThis.devicePixelRatio || 1)));
  canvas.width = size * scale;
  canvas.height = size * scale;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  whenVisible(canvas, () => draw(canvas.getContext("2d"), size * scale));
  return canvas;
}

/**
 * A tile: a thumbnail over a label, selected or not.
 * @param {object} options
 * @param {string} options.label
 * @param {boolean} options.selected
 * @param {() => void} options.onPick
 * @param {(ctx: CanvasRenderingContext2D, size: number) => void} options.draw
 * @param {number} [options.size]
 * @param {string} [options.title]
 */
export function tile({ label, selected, onPick, draw, size = 64, title }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `tie-coa-tile${selected ? " is-selected" : ""}`;
  button.title = title ?? label;
  button.appendChild(thumb(size, draw));
  if (label) {
    const text = document.createElement("span");
    text.className = "tie-coa-tile__label";
    text.textContent = label;
    button.appendChild(text);
  }
  button.addEventListener("click", () => onPick(button));
  return button;
}

/** A grid of tiles. */
export function grid(tiles, className = "") {
  const box = document.createElement("div");
  box.className = `tie-coa-grid ${className}`.trim();
  tiles.forEach((t) => box.appendChild(t));
  return box;
}

/** Marks one tile of a grid selected. */
export function select(gridEl, button) {
  for (const b of gridEl.querySelectorAll(".tie-coa-tile, .tie-coa-swatch")) b.classList.toggle("is-selected", b === button);
}

/** Draws arms small, plain (no damask or shade unless asked), as a tile picture. */
export function drawArms(arms, shape, { damask = false, seed } = {}) {
  return (ctx, size) => {
    const img = renderArms(arms, { size, shape, damask, shade: false, seed });
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0);
  };
}

/** Draws a charge in a tincture as a tile picture. */
export function drawCharge(id, tincture, pose = {}) {
  return (ctx, size) => {
    const img = chargeImage(id, size * 0.92, tincture, pose);
    ctx.clearRect(0, 0, size, size);
    if (img) ctx.drawImage(img, size * 0.04, size * 0.04);
  };
}

/** A tincture swatch: a square of its paint (a fur's pattern, stripes for proper). */
export function swatch(id, { selected, onPick, label }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `tie-coa-swatch${selected ? " is-selected" : ""}`;
  button.title = label ?? (id === "proper" ? "Proper" : TINCTURES[id]?.name ?? id);
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (id === "proper") {
    const colours = ["#c58a3c", "#5c9a3f", "#8d8d88", "#e8c39e"];
    colours.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(i * 8, 0, 8, 32);
    });
  } else if (TINCTURES[id]?.kind === "fur") {
    ctx.save();
    ctx.scale(0.32, 0.32);
    paintField(ctx, { tincture: id, division: null, variation: null }, { shapeId: "square", chargeImage: () => null });
    ctx.restore();
  } else {
    ctx.fillStyle = tinctureFill(id);
    ctx.fillRect(0, 0, 32, 32);
  }
  button.appendChild(canvas);
  button.addEventListener("click", () => onPick(button));
  return button;
}

/** A row of tincture swatches, one selected. */
export function swatches(ids, value, onPick) {
  const row = document.createElement("div");
  row.className = "tie-coa-swatches";
  for (const id of ids) {
    row.appendChild(swatch(id, {
      selected: id === value,
      onPick: (button) => {
        select(row, button);
        onPick(id);
      },
    }));
  }
  return row;
}
