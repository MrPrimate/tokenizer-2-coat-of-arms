/* eslint-disable no-console */
/* eslint-disable no-sync */
// Downloads the charge pictures listed in tools/art-sources.json from
// Wikimedia Commons into art/, with their authors and licences.
//
//   node plugins/coat-of-arms/tools/fetch-art.mjs [--refresh]
//
// art-sources.json maps a picture slot to a Commons file:
//   "<charge>"            the charge's picture
//   "<charge>@<attitude>" a beast in an attitude (rampant, passant, statant, couchant)
//   "<charge>@head"       the head alone
// each `{ title, flip?, rotate? }` (flip mirrors it, rotate turns it, degrees).
//
// Public domain, CC0 and CC BY files go to art/charges; CC BY-SA (and GFDL)
// files to art/charges-by-sa, so the share-alike works stay apart. Each
// folder gets the SVGs, a manifest.json the plugin reads, and CREDITS.md.
// Files already downloaded are kept unless --refresh is given. Anything
// under another licence, or an SVG that loads outside resources, is refused.
import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = path.join(ROOT, "tools", "art-sources.json");
const UA = "tokenizer-2-coat-of-arms art fetch (https://github.com/MrPrimate)";
const API = "https://commons.wikimedia.org/w/api.php";
const refresh = process.argv.includes("--refresh");

export const PACKS = Object.freeze({
  charges: {
    folder: "art/charges",
    title: "Coat of Arms charge pictures",
    note: "Public domain, CC0 and CC BY pictures from Wikimedia Commons.",
  },
  "charges-by-sa": {
    folder: "art/charges-by-sa",
    title: "Coat of Arms charge pictures (CC BY-SA)",
    note: "Pictures from Wikimedia Commons under share-alike licences. A coat of arms drawn with one of them is an adaptation of it, and is shared under the same licence.",
  },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function get(url, as = "json") {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": UA } });
      if (response.ok) return as === "json" ? response.json() : response.text();
      if (response.status === 404) return null;
    } catch {
      // retried below
    }
    await sleep(2000 * (attempt + 1));
  }
  throw new Error(`could not fetch ${url}`);
}

function decodeEntities(text) {
  return String(text ?? "").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function stripHtml(text) {
  return decodeEntities(String(text ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Which pack a licence belongs in, or null when it is not one the plugin may ship. */
export function packFor(licence) {
  const l = String(licence ?? "").toLowerCase();
  if ((/public domain|^pd\b|cc0/).test(l)) return "charges";
  if ((/by-sa|gfdl|free art|\bfal\b/).test(l)) return "charges-by-sa";
  if ((/^cc by\b|^attribution/).test(l)) return "charges";
  return null;
}

/** A file name from a Commons title: lower case, ascii, dashes. */
export function fileNameFor(title) {
  return title.replace(/\.svg$/i, "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) + ".svg";
}

/**
 * The SVG with editor leftovers removed (metadata, comments, Inkscape views),
 * and a size on the root so an <img> knows how big it is. Throws when the
 * SVG would load anything from outside itself.
 */
export function sanitiseSvg(text) {
  let svg = String(text);
  if ((/<script|<foreignObject|on(load|click|error)\s*=/i).test(svg)) throw new Error("scripted SVG");
  const hrefs = [...svg.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)].map((m) => m[1]);
  if (hrefs.some((h) => h && !h.startsWith("#") && !h.startsWith("data:"))) throw new Error("SVG links outside itself");
  svg = svg.replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, "")
    // an Inkscape view: self-closed, or holding grids and guides
    .replace(/<sodipodi:namedview\b[^>]*\/>/gi, "")
    .replace(/<sodipodi:namedview\b[^>]*>[\s\S]*?<\/sodipodi:namedview>/gi, "");
  const root = svg.match(/<svg\b[^>]*>/i)?.[0];
  if (!root) throw new Error("no <svg> root");
  const has = (attr) => new RegExp(`\\s${attr}\\s*=`, "i").test(root);
  const viewBox = root.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1]?.trim().split(/[\s,]+/).map(Number);
  if ((!has("width") || !has("height")) && viewBox?.length === 4) {
    const sized = root.replace(/<svg\b/i, `<svg width="${viewBox[2]}" height="${viewBox[3]}"`)
      .replace(/\s(width|height)\s*=\s*["']100%["']/gi, "");
    svg = svg.replace(root, sized);
  }
  return svg;
}

/**
 * The author from a file page's wikitext: the |author= field of its
 * information template, with links and templates reduced to their text.
 */
export function authorFromWikitext(text) {
  const m = String(text ?? "").match(/\|\s*author\s*=\s*([^\n]*)/i);
  if (!m) return null;
  const value = m[1]
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, "$1")
    .replace(/\{\{\s*(?:user|u|creator)\s*[:|]\s*([^}|]*)[^}]*\}\}/gi, "$1")
    .replace(/\{\{\s*unknown[^}]*\}\}/gi, "Unknown")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/[{}]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/'{2,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const clean = decodeEntities(value).trim();
  return clean && !(/^(unknown|own work)$/i).test(clean) ? clean : null;
}

export async function fileInfo(titles) {
  const out = {};
  for (const title of titles) {
    const params = new URLSearchParams({
      action: "query", format: "json", formatversion: "2", prop: "imageinfo|revisions",
      iiprop: "extmetadata|url|user|timestamp", iilimit: "50", rvprop: "content", rvslots: "main",
      titles: `File:${title}`,
    });
    const json = await get(`${API}?${params}`);
    const page = json.query.pages[0];
    const history = page.imageinfo ?? [];
    const info = history[0];
    if (!info) {
      out[title] = null;
      continue;
    }
    const meta = info.extmetadata ?? {};
    const artist = stripHtml(meta.Artist?.value);
    const wikitext = page.revisions?.[0]?.slots?.main?.content;
    // the first upload's user, when the page names no author
    const firstUploader = history[history.length - 1]?.user;
    out[title] = {
      url: info.url.split("?")[0],
      source: info.descriptionurl,
      licence: stripHtml(meta.LicenseShortName?.value) || "unknown",
      licenceUrl: stripHtml(meta.LicenseUrl?.value) || null,
      author: (artist && !(/^unknown/i).test(artist) ? artist : null) ?? authorFromWikitext(wikitext)
        ?? (stripHtml(meta.Attribution?.value) || `Wikimedia Commons user ${firstUploader}`),
    };
    await sleep(250);
  }
  return out;
}

/** "lion@passant" -> { charge: "lion", attitude: "passant", head: false }. */
export function parseSlot(slot) {
  const [charge, pose = null] = slot.split("@");
  return { charge, attitude: pose && pose !== "head" ? pose : null, head: pose === "head" };
}

function credits(pack, manifest) {
  const { title, note } = PACKS[pack];
  const lines = [`# ${title}`, "", note, "",
    "Every picture is recoloured, cropped and resized when a coat of arms is drawn.",
    "Sources, authors and licences are as given on each file's Wikimedia Commons page.", "",
    "| File | Charges | Author | Licence | Source |", "|---|---|---|---|---|"];
  for (const [file, f] of Object.entries(manifest.files)) {
    const charges = manifest.entries.filter((e) => e.file === file)
      .map((e) => `${e.charge}${e.head ? " (head)" : ""}${e.attitude ? ` (${e.attitude})` : ""}`).join(", ");
    const licence = f.licenceUrl ? `[${f.licence}](${f.licenceUrl})` : f.licence;
    lines.push(`| ${file} | ${charges} | ${f.author.replace(/\|/g, "/")} | ${licence} | [${f.title}](${f.source}) |`);
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const sources = JSON.parse(fs.readFileSync(SOURCES, "utf8"));
  const titles = [...new Set(Object.values(sources).map((s) => s.title))];
  console.log(`${Object.keys(sources).length} slots, ${titles.length} files`);
  const info = await fileInfo(titles);
  const manifests = Object.fromEntries(Object.keys(PACKS).map((p) => [p, { pack: p, files: {}, entries: [] }]));
  const refused = [];
  for (const title of titles) {
    const f = info[title];
    const pack = f && packFor(f.licence);
    if (!pack) {
      refused.push(`${title}: ${f ? f.licence : "not found"}`);
      continue;
    }
    const file = fileNameFor(title);
    const target = path.join(ROOT, PACKS[pack].folder, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (refresh || !fs.existsSync(target)) {
      try {
        fs.writeFileSync(target, sanitiseSvg(await get(f.url, "text")));
      } catch (err) {
        refused.push(`${title}: ${err.message}`);
        continue;
      }
      await sleep(250);
    }
    manifests[pack].files[file] = { title, source: f.source, author: f.author, licence: f.licence, licenceUrl: f.licenceUrl };
  }
  for (const [slot, s] of Object.entries(sources)) {
    const file = fileNameFor(s.title);
    const pack = Object.keys(manifests).find((p) => manifests[p].files[file]);
    if (!pack) continue;
    manifests[pack].entries.push({ ...parseSlot(slot), file, ...(s.flip ? { flip: true } : {}), ...(s.rotate ? { rotate: s.rotate } : {}) });
  }
  for (const [pack, manifest] of Object.entries(manifests)) {
    const folder = path.join(ROOT, PACKS[pack].folder);
    fs.mkdirSync(folder, { recursive: true });
    // files no longer listed are removed, so the folder matches the manifest
    for (const name of fs.readdirSync(folder)) {
      if (name.endsWith(".svg") && !manifest.files[name]) fs.unlinkSync(path.join(folder, name));
    }
    fs.writeFileSync(path.join(folder, "manifest.json"), `${JSON.stringify(manifest, null, 1)}\n`);
    fs.writeFileSync(path.join(folder, "CREDITS.md"), credits(pack, manifest));
    console.log(`${pack}: ${Object.keys(manifest.files).length} files, ${manifest.entries.length} pictures`);
  }
  if (refused.length) console.log(`Refused:\n  ${refused.join("\n  ")}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
