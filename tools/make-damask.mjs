/* eslint-disable no-console */
/* eslint-disable no-sync */
/* eslint-disable no-process-env */
// Builds the damask patterns in art/damask from their Wikimedia Commons
// sources: one repeating tile per pattern, a manifest.json the plugin reads
// and CREDITS.md. Needs `@napi-rs/canvas` on NODE_PATH (for the brocade).
//
//   node plugins/coat-of-arms/tools/make-damask.mjs
//
// - scrolls: Bibar's "Champ de sable diapré.svg" (CC0); its dotted scrolls
//   repeat every 188.75 x 182 units, so the tile is the scroll path seen
//   through a viewBox one repeat wide.
// - lattice: Bibar's "D'argent diapré.svg" (CC0); the tile is the file's own
//   <pattern>, drawn in black.
// - brocade: "Brocade 3.png" (public domain, Encyclopaedia Britannica 1911);
//   one 360 x 472 repeat of the scan, its edges cross-faded with the next
//   repeat so it tiles without seams, cleaned of speckles, reversed (its white
//   lines become the pattern) and doubled in size.
import fs from "fs";
import path from "path";
import process from "process";
import { Buffer } from "buffer";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { fileInfo, get } from "./fetch-art.mjs";

const require = createRequire(import.meta.url);
let napi;
try {
  napi = require("@napi-rs/canvas");
} catch {
  napi = require(path.join(process.env.NODE_PATH ?? "", "@napi-rs/canvas"));
}
const { createCanvas, loadImage } = napi;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "art/damask");

/**
 * The patterns: `units` is a tile's width in shield units (the shield is 100
 * wide), `strength` how strongly it shows (1 is the usual faint tone).
 */
const PATTERNS = [
  { id: "scrolls", file: "scrolls.svg", title: "Champ de sable diapré.svg", units: 36, strength: 1 },
  { id: "lattice", file: "lattice.svg", title: "D'argent diapré.svg", units: 17, strength: 1 },
  { id: "brocade", file: "brocade.png", title: "Brocade 3.png", units: 46, strength: 0.55 },
];

async function svgSource(info) {
  return get(info.url, "text");
}

/** The dotted scroll path, black, through a window one repeat across. */
function scrollsTile(svg) {
  const layer = svg.match(/<g id="layer4"[\s\S]*?<\/g>/)?.[0];
  const d = layer?.match(/\sd="([^"]+)"/)?.[1];
  if (!d) throw new Error("scroll path not found");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="377.5" height="364" viewBox="110 100 188.75 182">`
    + `<path fill="none" stroke="#000" stroke-width="2.387" stroke-dasharray="2.387 4.774" stroke-linecap="round" stroke-linejoin="round" d="${d}"/></svg>\n`;
}

/** The file's own pattern tile, black. */
function latticeTile(svg) {
  const pattern = svg.match(/<pattern id="pat"[\s\S]*?<\/pattern>/)?.[0];
  if (!pattern) throw new Error("pattern not found");
  const body = pattern.replace(/^<pattern[^>]*>/, "").replace(/<\/pattern>$/, "")
    .replace(/<path fill="#fff"[^>]*\/>/, "")
    .replace(/stroke="#313131" opacity="\.18"/, "stroke=\"#000\" stroke-width=\"1.4\"");
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="318.66" height="318.66" viewBox="0 0 53.11 53.11">${body}</svg>\n`;
}

/** One repeat of the brocade scan, made seamless. */
async function brocadeTile(png) {
  const img = await loadImage(png);
  const [W, H] = [img.width, img.height];
  const src = createCanvas(W, H).getContext("2d");
  src.fillStyle = "#fff";
  src.fillRect(0, 0, W, H);
  src.drawImage(img, 0, 0);
  const s = src.getImageData(0, 0, W, H).data;
  const ink = (x, y) => 1 - (s[((y * W) + x) * 4] / 255);
  // the repeat and where it is cut from; the last BAND rows and columns fade
  // into the copy one repeat back, so the tile's far edge meets its near one
  const [PW, PH, X0, Y0, BAND] = [360, 472, 150, 300, 48];
  const fade = (k, size) => Math.max(0, (k - (size - BAND)) / BAND);
  const tile = new Float32Array(PW * PH);
  for (let y = 0; y < PH; y++) {
    const ty = fade(y, PH);
    for (let x = 0; x < PW; x++) {
      const tx = fade(x, PW);
      // only the copies that count are read (the others may lie outside the scan)
      const at = (weight, dx, dy) => (weight > 0 ? weight * ink(X0 + x - dx, Y0 + y - dy) : 0);
      tile[(y * PW) + x] = at((1 - tx) * (1 - ty), 0, 0) + at(tx * (1 - ty), PW, 0)
        + at((1 - tx) * ty, 0, PH) + at(tx * ty, PW, PH);
    }
  }
  // speckles: a lone pixel unlike all four neighbours takes their mean
  const clean = Float32Array.from(tile);
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => tile[((((y + dy) + PH) % PH) * PW) + (((x + dx) + PW) % PW)]);
      const mean = n.reduce((a, b) => a + b, 0) / 4;
      if (n.every((v) => Math.abs(v - tile[(y * PW) + x]) > 0.5)) clean[(y * PW) + x] = mean;
    }
  }
  const small = createCanvas(PW, PH);
  const sctx = small.getContext("2d");
  const id = sctx.createImageData(PW, PH);
  for (let i = 0; i < clean.length; i++) {
    // reversed: the woodcut's white lines become the pattern's lines, so it
    // shades the paint as lightly as the line patterns do
    const v = Math.round(clean[i] * 255);
    id.data.set([v, v, v, 255], i * 4);
  }
  sctx.putImageData(id, 0, 0);
  // doubled with smoothing, so it is not blocky when drawn large
  const big = createCanvas(PW * 2, PH * 2);
  const bctx = big.getContext("2d");
  bctx.imageSmoothingEnabled = true;
  bctx.imageSmoothingQuality = "high";
  bctx.drawImage(small, 0, 0, PW * 2, PH * 2);
  return big.encode("png");
}

function credits(manifest) {
  const lines = ["# Coat of Arms damask patterns", "",
    "Each pattern is one repeat of a drawing from Wikimedia Commons, drawn faintly over the paint of a shield.",
    "Sources, authors and licences are as given on each file's Wikimedia Commons page.", "",
    "| Pattern | Made from | Author | Licence | Source |", "|---|---|---|---|---|"];
  for (const p of manifest.patterns) {
    const f = manifest.files[p.file];
    const licence = f.licenceUrl ? `[${f.licence}](${f.licenceUrl})` : f.licence;
    lines.push(`| ${p.id} (${p.file}) | ${f.made} | ${f.author.replace(/\|/g, "/")} | ${licence} | [${f.title}](${f.source}) |`);
  }
  return `${lines.join("\n")}\n`;
}

const MADE = {
  scrolls: "one repeat of the dotted scrolls",
  lattice: "the file's own repeating tile, in black",
  brocade: "a Byzantine brocade from the Encyclopaedia Britannica (1911): one repeat of the scan, made seamless, cleaned, reversed and doubled in size",
};

async function main() {
  const info = await fileInfo(PATTERNS.map((p) => p.title));
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = { files: {}, patterns: [] };
  for (const p of PATTERNS) {
    const f = info[p.title];
    if (!f || !(/public domain|cc0/i).test(f.licence)) throw new Error(`${p.title}: ${f?.licence ?? "not found"}`);
    let data;
    if (p.id === "scrolls") data = scrollsTile(await svgSource(f));
    else if (p.id === "lattice") data = latticeTile(await svgSource(f));
    else data = await brocadeTile(Buffer.from(await (await fetch(f.url, { headers: { "User-Agent": "tokenizer-2-coat-of-arms art fetch" } })).arrayBuffer()));
    fs.writeFileSync(path.join(OUT, p.file), data);
    manifest.files[p.file] = { title: p.title, source: f.source, author: f.author, licence: f.licence, licenceUrl: f.licenceUrl, made: MADE[p.id] };
    manifest.patterns.push({ id: p.id, file: p.file, units: p.units, strength: p.strength });
    console.log(`${p.id}: ${p.file} (${f.licence}, ${f.author})`);
  }
  fs.writeFileSync(path.join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 1)}\n`);
  fs.writeFileSync(path.join(OUT, "CREDITS.md"), credits(manifest));
}

main();
