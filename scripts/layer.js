/**
 * layer.js - putting a coat of arms on a token: the picture rendered at
 * the chosen size, stored, and made an image layer that remembers its arms
 * in a flag so the tool can edit it again.
 */

import { blazon } from "./lib/blazon.js";
import { renderArms } from "./lib/render/render.js";
import { DEFAULT_CHARGE_STYLE } from "./lib/charges/sketch.js";
import { DEFAULT_DAMASK } from "./lib/render/damask.js";
import { ensureArt } from "./art-loader.js";
import { newState, renderOptions } from "./ui/controls.js";

export const MODULE_ID = "tokenizer-2-coat-of-arms";
export const FLAG_ARMS = "arms";

/** A setting of this module, or `fallback` when it is blank or Foundry is not about. */
export function pluginSetting(key, fallback) {
  try {
    const value = game.settings.get(MODULE_ID, key);
    return value === undefined || value === null || value === "" ? fallback : value;
  } catch {
    return fallback;
  }
}

/** A new editing state drawn the way this module's settings say. */
export function settingsState(overrides = {}) {
  return newState({
    shape: pluginSetting("default-shape", "heater"),
    damask: pluginSetting("damask-pattern", DEFAULT_DAMASK),
    chargeStyle: pluginSetting("charge-style", DEFAULT_CHARGE_STYLE),
    ...overrides,
  });
}

/** Whether a layer is one of this plugin's coats of arms. */
export function isArmsLayer(editor, layer) {
  return Boolean(layer && editor?.getFlag(layer, MODULE_ID, FLAG_ARMS));
}

/** The arms rendered at the picture size setting. */
export function renderState(state, size = Number(pluginSetting("export-size", 1024)) || 1024) {
  return renderArms(state.arms, renderOptions(state, { size }));
}

/** What a layer (or an actor) remembers about its arms. */
export function flagData(state) {
  return {
    arms: state.arms, seed: state.seed, shape: state.shape, damask: state.damask,
    chargeStyle: state.chargeStyle, blazon: blazon(state.arms),
  };
}

/** A file name for the picture. */
export function pictureName(state, extension = "png") {
  return `coat-of-arms-${state.seed ?? "arms"}-${Date.now().toString(36)}.${extension}`;
}

/** Stores the picture through the editor, into the plugin's folder. */
export async function storeState(editor, state) {
  await ensureArt();
  const folder = pluginSetting("folder", "tokenizer/coat-of-arms");
  return editor.storePNG(renderState(state), { folder, filename: pictureName(state), label: "the coat of arms" });
}

/**
 * Stores the picture and loads it into the editor, which only draws (and
 * saves) the pictures it has loaded.
 * @returns {Promise<string|null>} The picture's path, or null when it could not be stored or loaded
 */
async function loadedPicture(editor, state) {
  const src = await storeState(editor, state);
  if (!src) return null;
  try {
    await editor.loadImage(src);
  } catch {
    ui.notifications.error(game.i18n.localize("TOKENIZER-2.COA.LoadFailed"));
    return null;
  }
  return src;
}

/**
 * Adds the arms as a new layer above the active one (through the Editor API).
 * @returns {Promise<object|null>} The layer, or null when the picture could not be stored
 */
export async function addArmsLayer(editor, state) {
  const src = await loadedPicture(editor, state);
  if (!src) return null;
  const layer = editor.createImageLayer(src, game.i18n.localize("TOKENIZER-2.COA.LayerName"));
  // as big as the frame, which an oversized token draws smaller
  const fit = 1 / (editor.layerScale || 1);
  layer.transform.scaleX = fit;
  layer.transform.scaleY = fit;
  editor.setFlag(layer, MODULE_ID, FLAG_ARMS, flagData(state));
  editor.pushUndo();
  editor.addLayerAbove(layer, editor.getActiveLayer()?.id ?? null);
  editor.setActiveLayer(layer.id);
  editor.requestRender();
  return layer;
}

/** Redraws an existing coat of arms layer with the state's arms. */
export async function updateArmsLayer(editor, layer, state) {
  const src = await loadedPicture(editor, state);
  if (!src) return null;
  editor.pushUndo();
  editor.invalidateImage(layer.src);
  layer.src = src;
  editor.setFlag(layer, MODULE_ID, FLAG_ARMS, flagData(state));
  editor.requestRender();
  return layer;
}
