/**
 * art.js - the pictures that come from files: the damask patterns
 * (art/damask, see damaskEntry) and the charge pictures, SVG drawings from
 * Wikimedia Commons in art/charges (public domain, CC0 and CC BY) and
 * art/charges-by-sa (share-alike), each folder with a manifest.json of its
 * files, their authors and licences, and the pictures they give (see
 * tools/fetch-art.mjs).
 *
 * A manifest entry is one picture: `{ charge, attitude, head, file, flip?,
 * rotate? }`. `attitude` is null for a charge's own picture (the one shown
 * unless an attitude asks for another), and `head` marks the head alone.
 *
 * Loading needs the outside world (fetch and Image in Foundry, the disk and
 * a Node canvas in tools and tests), so `loadArt` takes it as functions; the
 * rest is plain data and works before anything is loaded (no art: the
 * charges fall back to their code-drawn or stand-in pictures).
 */

import { drawnAs } from "./catalogue.js";

/** The art folders, in the order they are looked through. */
export const ART_PACKS = Object.freeze([
  Object.freeze({ id: "charges", folder: "art/charges" }),
  Object.freeze({ id: "charges-by-sa", folder: "art/charges-by-sa" }),
]);

/** The damask patterns' folder. */
export const DAMASK_FOLDER = "art/damask";

const state = {
  /** @type {object[]} every entry, with `pack` and `folder` added */
  entries: [],
  /** @type {object[]} the damask patterns: { id, file, units, strength, folder } */
  damask: [],
  /** @type {Object<string, object>} the damask files' credits */
  damaskFiles: {},
  /** @type {Object<string, object>} each pack's files, by pack id */
  files: {},
  /** decoded pictures, by "folder/file" */
  images: new Map(),
  loading: null,
};

/** Takes manifests (as read from the art folders) as the known art; images already decoded are kept. */
export function setArtManifests(manifests) {
  state.entries = [];
  state.files = {};
  for (const { pack, folder, manifest } of manifests) {
    if (!manifest) continue;
    state.files[pack] = manifest.files ?? {};
    for (const entry of manifest.entries ?? []) {
      state.entries.push(Object.freeze({
        charge: entry.charge, attitude: entry.attitude ?? null, head: Boolean(entry.head),
        file: entry.file, flip: Boolean(entry.flip), rotate: Number(entry.rotate) || 0, pack, folder,
      }));
    }
  }
}

/** Takes the damask folder's manifest as the known patterns. */
export function setDamaskManifest(manifest) {
  state.damaskFiles = manifest?.files ?? {};
  state.damask = (manifest?.patterns ?? []).map((p) => Object.freeze({
    id: p.id, file: p.file, units: Number(p.units) || 30, strength: Number(p.strength) || 1, folder: DAMASK_FOLDER,
  }));
}

/** A damask pattern's entry by id, or null. */
export function damaskEntry(id) {
  return state.damask.find((p) => p.id === id) ?? null;
}

/** The damask files' credits: { file: { title, source, author, licence, licenceUrl, made } }. */
export function damaskFiles() {
  return state.damaskFiles;
}

/** Forgets the manifests and pictures (for tests). */
export function resetArt() {
  state.entries = [];
  state.files = {};
  state.damask = [];
  state.damaskFiles = {};
  state.images.clear();
  state.loading = null;
}

/** Every known picture entry. */
export function artEntries() {
  return state.entries;
}

/** The credits of a pack's files: { file: { title, source, author, licence, licenceUrl } }. */
export function artFiles(pack) {
  return state.files[pack] ?? {};
}

/** Where an entry's file lives, relative to the module. */
export function artPath(entry) {
  return `${entry.folder}/${entry.file}`;
}

function entriesOf(id) {
  return state.entries.filter((e) => e.charge === id);
}

/** The charge whose pictures `id` uses: its own when it has any, else the one it borrows. */
function artCharge(id) {
  if (entriesOf(id).length) return id;
  const borrowed = drawnAs(id);
  return entriesOf(borrowed).length ? borrowed : null;
}

/**
 * The picture for a charge in a pose: the head alone, the attitude asked
 * for, or the charge's own picture. Null when it has no file-based art.
 */
export function artEntry(id, { head = false, attitude = null } = {}) {
  const charge = artCharge(id);
  if (!charge) return null;
  const all = entriesOf(charge);
  if (head) {
    const found = all.find((e) => e.head);
    if (found) return found;
  }
  const bodies = all.filter((e) => !e.head);
  if (attitude) {
    const found = bodies.find((e) => e.attitude === attitude);
    if (found) return found;
  }
  return bodies.find((e) => e.attitude === null) ?? bodies[0] ?? null;
}

/** Whether a charge has a file-based picture (its own or one it borrows). */
export function hasArt(id) {
  return artCharge(id) !== null;
}

/** The attitudes a charge has pictures for (empty when it has none, or no art at all). */
export function artAttitudes(id) {
  const charge = artCharge(id);
  if (!charge) return [];
  return [...new Set(entriesOf(charge).filter((e) => !e.head && e.attitude).map((e) => e.attitude))];
}

/** Whether a charge has a picture of its head alone. */
export function hasHeadArt(id) {
  const charge = artCharge(id);
  return Boolean(charge && entriesOf(charge).some((e) => e.head));
}

/**
 * Whether the art decides a charge's poses: true once its pictures are known,
 * so rolls and menus keep to them; false when there is no art for it (or none
 * loaded), when any pose is allowed.
 */
export function artKnown(id) {
  return artCharge(id) !== null;
}

/**
 * The attitude a charge's own picture shows (when the same file is also
 * listed for an attitude), or null.
 */
export function artDefaultAttitude(id) {
  const own = artEntry(id);
  if (!own) return null;
  if (own.attitude) return own.attitude;
  return entriesOf(own.charge).find((e) => !e.head && e.attitude && e.file === own.file)?.attitude ?? null;
}

/**
 * A pose the pictures can show: the head alone only when there is a head
 * picture, an attitude only when there is a picture of it (else the one the
 * charge's own picture shows). `changed` names what had to change ("head",
 * "attitude") or is null. Charges without file pictures keep any pose.
 */
export function fitPose(id, { head = false, attitude = null } = {}) {
  if (!artKnown(id)) return { head, attitude, changed: null };
  let changed = null;
  let fitted = attitude;
  if (head && !hasHeadArt(id)) {
    changed = "head";
    head = false;
  }
  if (!head && fitted && !artAttitudes(id).includes(fitted)) {
    changed ??= "attitude";
    fitted = artDefaultAttitude(id);
  }
  return { head, attitude: head ? attitude : fitted, changed };
}

/** The decoded picture of an entry, or null until it is loaded. */
export function artImage(entry) {
  return entry ? state.images.get(artPath(entry)) ?? null : null;
}

/** Whether the art has finished loading. */
export function artLoaded() {
  return state.loading !== null && state.images.size > 0;
}

/**
 * Loads the manifests and decodes every picture, once (later calls share the
 * first one's promise). A pack whose manifest cannot be read is left out, so
 * the share-alike folder can be removed without breaking anything.
 * @param {object} io
 * @param {(path: string) => Promise<object|null>} io.readJson  A manifest by module-relative path
 * @param {(path: string) => Promise<object>} io.decode  A picture by module-relative path
 * @param {number} [io.concurrency]
 * @returns {Promise<void>}
 */
export function loadArt({ readJson, decode, concurrency = 8 }) {
  state.loading ??= (async () => {
    const manifests = await Promise.all(ART_PACKS.map(async ({ id, folder }) => ({
      pack: id, folder, manifest: await readJson(`${folder}/manifest.json`).catch(() => null),
    })));
    setArtManifests(manifests);
    setDamaskManifest(await readJson(`${DAMASK_FOLDER}/manifest.json`).catch(() => null));
    const paths = [...new Set([...state.damask, ...state.entries].map(artPath))];
    let next = 0;
    const worker = async () => {
      while (next < paths.length) {
        const path = paths[next++];
        try {
          state.images.set(path, await decode(path));
        } catch {
          // a picture that will not load falls back to the stand-in
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, paths.length) }, worker));
  })();
  return state.loading;
}
