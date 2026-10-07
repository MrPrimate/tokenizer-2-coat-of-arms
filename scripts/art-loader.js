/**
 * art-loader.js - loads the charge pictures in Foundry: the art folders'
 * manifests by fetch, each SVG as an <img>. Loaded once, on first use (the
 * window, the tool, the API), not at start-up, so players who never open
 * the generator do not download them.
 */

import { artLoaded, loadArt } from "./lib/charges/art.js";
import { clearChargeCache } from "./lib/render/render.js";

const MODULE_PATH = "modules/tokenizer-2-coat-of-arms/";

/** A module file's URL, minding Foundry's route prefix. */
export function moduleUrl(path) {
  const route = globalThis.foundry?.utils?.getRoute;
  return route ? route(`${MODULE_PATH}${path}`) : `${MODULE_PATH}${path}`;
}

let loading = null;
const waiting = new Set();

/** Loads the charge pictures (once); resolves when they are ready. */
export function ensureArt() {
  loading ??= loadArt({
    readJson: async (path) => {
      const response = await fetch(moduleUrl(path));
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      return response.json();
    },
    decode: (path) => new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`${path} did not load`));
      img.src = moduleUrl(path);
    }),
  }).then(() => {
    // pictures drawn with the stand-in before the art arrived are redrawn
    clearChargeCache();
    const callbacks = [...waiting];
    waiting.clear();
    callbacks.forEach((redraw) => redraw());
  });
  return loading;
}

/** Calls `callback` once the pictures are loaded (straight away when they are). */
export function whenArtReady(callback) {
  if (artLoaded()) {
    callback();
    return;
  }
  waiting.add(callback);
  ensureArt();
}
