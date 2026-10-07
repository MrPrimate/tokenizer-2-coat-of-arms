/* eslint-disable no-console */
/* eslint-disable no-sync */
/* eslint-disable no-process-env */
// Renders the plugin's pictures to PNG for a look: every charge on one
// sheet, every field pattern and ordinary on another, and a sheet of
// random arms. Needs a Node canvas: run from a folder with
// `@napi-rs/canvas` installed (`npm i --no-save @napi-rs/canvas`), or set
// NODE_PATH to one.
//
//   node plugins/coat-of-arms/tools/contact-sheet.mjs --out <dir> [charges|fields|random|styles|shields|samples|all] [--seed n] [--count n]
//     [--ids lion,wolf] [--cell 96] [--style painted|outlined|silhouette|line] [--attitude rampant] [--name file]
//
// `styles` draws each charge (--ids) in every style, one row each;
// `shields` draws each charge on a heater as the rulebook's plates do, a
// tincture pair per shield. `samples` draws the README's sample arms
// (docs/samples.png, --out plugins/coat-of-arms/docs) on a clear
// background, keeping to public domain and CC0 pictures so the image needs
// no credits. --ids narrows the charges sheet too. The charge
// pictures are read from art/ (with the Node canvas decoding the SVGs).
import fs from "fs";
import path from "path";
import process from "process";
import { createRequire } from "module";
import { CHARGE_IDS, chargeInfo, chargeLabel } from "../scripts/lib/charges/catalogue.js";
import { codePicture, hasPicture } from "../scripts/lib/charges/index.js";
import { chargeImage, renderArms } from "../scripts/lib/render/render.js";
import { generateArms } from "../scripts/lib/generate.js";
import { artEntry, artFiles, loadArt } from "../scripts/lib/charges/art.js";
import { drawnCharges } from "../scripts/lib/charges/credits.js";
import { blazon } from "../scripts/lib/blazon.js";
import { ORDINARIES, VARIATIONS, DIVISIONS } from "../scripts/lib/tables.js";

const require = createRequire(import.meta.url);
let napi;
try {
  napi = require("@napi-rs/canvas");
} catch {
  napi = require(path.join(process.env.NODE_PATH ?? "", "@napi-rs/canvas"));
}
const { createCanvas: nodeCanvas, loadImage, Path2D } = napi;
globalThis.Path2D = Path2D;
const createCanvas = (w, h) => nodeCanvas(w, h);

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(name);
  if (at < 0) return fallback;
  return args.splice(at, 2)[1];
};
const out = option("--out", "/tmp/coa-sheets");
const seed = Number(option("--seed", 1));
const count = Number(option("--count", 24));
const ids = option("--ids", "");
const cellOption = Number(option("--cell", 0));
const style = option("--style", undefined);
const attitudeOption = option("--attitude", undefined);
const fileName = option("--name", "");
const what = args[0] ?? "all";
const look = { style };
const pickedIds = ids ? ids.split(",").map((id) => id.trim()).filter(Boolean) : null;
fs.mkdirSync(out, { recursive: true });

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
await loadArt({
  readJson: async (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8")),
  decode: (file) => loadImage(fs.readFileSync(path.join(ROOT, file))),
});

function label(ctx, text, x, y, w) {
  ctx.fillStyle = "#222";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, x + (w / 2), y, w);
}

function sheet(items, cell, cols, draw, name) {
  const rows = Math.ceil(items.length / cols);
  const canvas = createCanvas(cols * cell, rows * (cell + 16));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#e9e4d8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  items.forEach((item, i) => {
    const x = (i % cols) * cell;
    const y = Math.floor(i / cols) * (cell + 16);
    draw(ctx, item, x, y, cell);
  });
  const file = path.join(out, name);
  fs.writeFileSync(file, canvas.toBuffer("image/png"));
  console.log(`wrote ${file}`);
}

if (what === "charges" || what === "all") {
  const ids = CHARGE_IDS.filter((id) => hasPicture(id));
  const missing = CHARGE_IDS.filter((id) => !hasPicture(id));
  console.log(`${ids.length} drawn, ${missing.length} without a picture: ${missing.join(", ")}`);
  const list = pickedIds ?? CHARGE_IDS;
  sheet(list, cellOption || 96, pickedIds ? Math.min(list.length, 8) : 10, (ctx, id, x, y, cell) => {
    ctx.fillStyle = hasPicture(id) ? "#5c9a3f" : "#b8b0a0";
    ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
    const img = chargeImage(id, cell - 8, "or", { createCanvas, attitude: attitudeOption, ...look });
    if (img) ctx.drawImage(img, x + 4, y + 4);
    label(ctx, chargeLabel(id), x, y + cell + 11, cell);
  }, fileName || "charges.png");
}

if ((what === "charges" || what === "all") && !pickedIds) {
  const heads = CHARGE_IDS.filter((id) => hasPicture(id)).slice(0, 60);
  sheet(heads, 96, 10, (ctx, id, x, y, cell) => {
    ctx.fillStyle = "#2d5e9c";
    ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
    const img = chargeImage(id, cell - 8, "proper", { head: true, createCanvas, ...look });
    if (img) ctx.drawImage(img, x + 4, y + 4);
    label(ctx, `${chargeLabel(id)} head/proper`, x, y + cell + 11, cell);
  }, "charges-heads-proper.png");
  const beasts = ["lion", "wolf", "horse", "hound", "bear", "stag", "boar", "goat", "bull", "fox"];
  const poses = ["rampant", "passant", "statant", "couchant"];
  sheet(beasts.flatMap((b) => poses.map((p) => [b, p])), 96, 8, (ctx, [id, attitude], x, y, cell) => {
    ctx.fillStyle = "#c4372b";
    ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
    const img = chargeImage(id, cell - 8, "argent", { attitude, createCanvas, ...look });
    if (img) ctx.drawImage(img, x + 4, y + 4);
    label(ctx, `${id} ${attitude}`, x, y + cell + 11, cell);
  }, "charges-attitudes.png");
}

if (what === "fields" || what === "all") {
  const items = [];
  for (const v of VARIATIONS) {
    const variation = { type: v.type, tinctures: ["or", "azure"], count: v.count ?? (v.type === "gyronny" ? 8 : null), charge: "cross" };
    items.push({ name: v.type, arms: { version: 1, field: { tincture: "or", division: null, variation }, ordinary: null, charges: [], halves: null } });
  }
  for (const d of DIVISIONS) {
    items.push({ name: `per ${d.type}`, arms: { version: 1, field: { tincture: "gules", division: { type: d.type, tinctures: ["gules", "argent"], design: "solid" }, variation: null }, ordinary: null, charges: [], halves: null } });
  }
  for (const fur of ["ermine", "vair", "ermines", "erminois"]) {
    items.push({ name: fur, arms: { version: 1, field: { tincture: fur, division: null, variation: null }, ordinary: null, charges: [], halves: null } });
  }
  for (const o of ORDINARIES) {
    items.push({ name: o, arms: { version: 1, field: { tincture: "azure", division: null, variation: null }, ordinary: { type: o, tincture: "or", charges: [], variation: null }, charges: [], halves: null } });
  }
  for (const o of ORDINARIES) {
    const n = o === "bordure" ? 9 : o === "orle" ? 8 : 3;
    items.push({ name: `on a ${o} 3`, arms: { version: 1, field: { tincture: "vert", division: null, variation: null }, ordinary: { type: o, tincture: "argent", charges: [{ type: "mullet", tincture: "gules", count: n, head: false, attitude: null }], variation: null }, charges: [], halves: null } });
  }
  for (const o of [null, ...ORDINARIES]) {
    for (const n of [1, 2, 3, 6]) {
      items.push({ name: `${o ?? "plain"} between ${n}`, arms: { version: 1, field: { tincture: "sable", division: null, variation: null }, ordinary: o ? { type: o, tincture: "or", charges: [], variation: null } : null, charges: [{ type: "roundel", tincture: "argent", count: n, head: false, attitude: null }], halves: null } });
    }
  }
  sheet(items, 120, 10, (ctx, item, x, y, cell) => {
    const img = renderArms(item.arms, { size: cell, createCanvas, seed });
    ctx.drawImage(img, x, y);
    label(ctx, item.name, x, y + cell + 11, cell);
  }, "fields.png");
  const shapes = ["heater", "round", "square", "lozenge"];
  sheet(shapes, 200, 4, (ctx, shape, x, y, cell) => {
    const { arms } = generateArms({ seed: 5 });
    ctx.drawImage(renderArms(arms, { size: cell, shape, createCanvas, seed }), x, y);
    label(ctx, shape, x, y + cell + 11, cell);
  }, "shapes.png");
}

if (what === "random" || what === "all") {
  const items = Array.from({ length: count }, (_, i) => generateArms({ seed: seed + i }));
  items.forEach((r, i) => console.log(`${seed + i}: ${blazon(r.arms)}`));
  sheet(items, 180, 6, (ctx, r, x, y, cell) => {
    ctx.drawImage(renderArms(r.arms, { size: cell, createCanvas, seed: r.seed }), x, y);
    label(ctx, blazon(r.arms).slice(0, 34), x, y + cell + 11, cell);
  }, `random-${seed}.png`);
}

/** Field and charge tinctures in turn, as the rulebook's plates pair them. */
const PAIRS = [["azure", "or"], ["argent", "gules"], ["gules", "or"], ["vert", "argent"], ["or", "azure"], ["sable", "or"], ["purpure", "argent"], ["argent", "sable"], ["or", "gules"], ["gules", "argent"]];
const plain = (field, charge, extra = {}) => ({ version: 1, field: { tincture: field, division: null, variation: null }, ordinary: null, charges: [{ type: charge, tincture: extra.tincture, count: 1, head: Boolean(extra.head), attitude: extra.attitude ?? null }], halves: null });

if (what === "styles") {
  const list = pickedIds ?? ["lion", "eagle", "martlet", "dragon", "stag", "rose", "castle", "mullet-pierced", "cross-flory", "escallop"];
  const looks = ["painted", "outlined", "silhouette", "line"];
  const items = list.flatMap((id, i) => looks.map((st) => ({ id, st, pair: PAIRS[i % PAIRS.length] })));
  sheet(items, cellOption || 150, looks.length, (ctx, { id, st, pair }, x, y, cell) => {
    const arms = plain(pair[0], id, { tincture: pair[1], attitude: attitudeOption });
    ctx.drawImage(renderArms(arms, { size: cell, createCanvas, seed, damask: false, chargeStyle: st }), x, y);
    label(ctx, `${chargeLabel(id)} ${st}`, x, y + cell + 11, cell);
  }, fileName || "styles.png");
}

if (what === "shields") {
  const list = pickedIds ?? CHARGE_IDS;
  sheet(list, cellOption || 160, 8, (ctx, id, x, y, cell) => {
    const pair = PAIRS[list.indexOf(id) % PAIRS.length];
    const arms = plain(pair[0], id, { tincture: pair[1], attitude: attitudeOption });
    ctx.drawImage(renderArms(arms, { size: cell, createCanvas, seed, chargeStyle: style }), x, y);
    label(ctx, chargeLabel(id), x, y + cell + 11, cell);
  }, fileName || "shields.png");
}

/** The README's sample arms: designed ones, and rolls by seed. */
const SAMPLES = [
  { arms: plain("azure", "lion", { tincture: "or", attitude: "rampant" }) },
  { arms: plain("or", "eagle", { tincture: "sable" }), shape: "round" },
  { roll: 39 },
  { arms: plain("purpure", "unicorn", { tincture: "argent" }), shape: "lozenge" },
  { arms: plain("sable", "griffin", { tincture: "or" }), shape: "square", damask: "lattice" },
  { roll: 31 },
  { roll: 33 },
  { arms: { version: 1, field: { tincture: "argent", division: null, variation: { type: "barry", tinctures: ["argent", "azure"], count: 6, charge: null } }, ordinary: null, charges: [{ type: "castle", tincture: "gules", count: 1, head: false, attitude: null }], halves: null }, damask: "brocade" },
];

if (what === "samples") {
  const cell = cellOption || 256;
  const cols = 4;
  const items = SAMPLES.map((s) => ({ ...s, arms: s.arms ?? generateArms({ seed: s.roll }).arms }));
  for (const { arms } of items) {
    for (const { type, head, attitude } of drawnCharges(arms)) {
      if (codePicture(type)) continue;
      const entry = artEntry(type, { head, attitude: attitude ?? chargeInfo(type).attitude ?? null });
      const licence = artFiles(entry?.pack)[entry?.file]?.licence;
      if (!["Public domain", "CC0"].includes(licence)) throw new Error(`${type} is drawn from ${entry?.file} (${licence}): pick arms with public domain or CC0 pictures`);
    }
    console.log(blazon(arms));
  }
  const canvas = createCanvas(cols * cell, Math.ceil(items.length / cols) * cell);
  const ctx = canvas.getContext("2d");
  items.forEach((item, i) => {
    const img = renderArms(item.arms, { size: cell, createCanvas, seed: 7, shape: item.shape, damask: item.damask });
    ctx.drawImage(img, (i % cols) * cell, Math.floor(i / cols) * cell);
  });
  const file = path.join(out, fileName || "samples.png");
  fs.writeFileSync(file, canvas.toBuffer("image/png"));
  console.log(`wrote ${file}`);
}
