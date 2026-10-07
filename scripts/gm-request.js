/**
 * gm-request.js - a player's coat of arms sent to the GM for approval,
 * through Tokenizer 2's player requests (`Tokenizer2.gmRequests`, API 1.3).
 * The request carries only the recipe (well under a kilobyte of JSON); the
 * GM's client draws the picture again, uploads it (players usually cannot)
 * and writes it to the sheet.
 */

import { normaliseArms } from "./lib/arms.js";
import { blazon } from "./lib/blazon.js";
import { chargeStyle } from "./lib/charges/sketch.js";
import { damaskPattern } from "./lib/render/damask.js";
import { SHAPE_IDS } from "./lib/render/shapes.js";
import { FLAG_ARMS, MODULE_ID, pictureName, pluginSetting, renderState } from "./layer.js";
import { ensureArt } from "./art-loader.js";
import { newState } from "./ui/controls.js";

/** The request type. */
export const ARMS_REQUEST = `${MODULE_ID}.arms`;
/** Charge groups kept on a field or an ordinary; more would only slow the GM's drawing. */
export const MAX_CHARGE_GROUPS = 12;

/** Arms with no more than MAX_CHARGE_GROUPS groups anywhere, halves included. */
function capGroups(arms) {
  arms.charges = arms.charges.slice(0, MAX_CHARGE_GROUPS);
  if (arms.ordinary) arms.ordinary.charges = (arms.ordinary.charges ?? []).slice(0, MAX_CHARGE_GROUPS);
  if (arms.halves) arms.halves = arms.halves.map(capGroups);
  return arms;
}

/**
 * A clean copy of a coat of arms from untrusted data (a player's request,
 * or the window's own state): the arms normalised, the look checked against
 * what exists, the seed a whole number, and the blazon worked out afresh.
 * Anything else is dropped.
 * @param {object} payload
 * @returns {{ arms: object, seed: number|null, shape: string, damask: string, chargeStyle: string, blazon: string }}
 */
export function sanitiseArmsRequest(payload) {
  if (!payload || typeof payload !== "object" || !payload.arms || typeof payload.arms !== "object") throw new Error("no arms");
  const arms = capGroups(normaliseArms(payload.arms));
  // the seed names the picture's file, so nothing but a whole number gets through
  const seed = Number.isSafeInteger(payload.seed) ? payload.seed : null;
  return {
    arms,
    seed,
    shape: SHAPE_IDS.includes(payload.shape) ? payload.shape : "heater",
    damask: damaskPattern(payload.damask),
    chargeStyle: chargeStyle(payload.chargeStyle),
    blazon: blazon(arms),
  };
}

/** An editing state from clean request data. */
function stateOf(data) {
  return newState({ arms: data.arms, seed: data.seed, shape: data.shape, damask: data.damask, chargeStyle: data.chargeStyle });
}

/** A canvas as a PNG blob. */
async function canvasPng(canvas) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("the canvas could not be encoded");
  return blob;
}

/**
 * Draws a coat of arms, uploads the picture and writes it to the actor's
 * sheet (Coat of Arms and Heraldry) with the arms remembered on the actor.
 * Used by Save to Sheet and by a GM approving a player's request.
 * @param {Actor} actor
 * @param {object} data  The arms, as flagData() gives them (sanitised here)
 * @param {object} [deps]  For tests: { render(state) -> canvas, encode(canvas) -> Blob, storage, folder }
 * @returns {Promise<string>} The picture's path
 */
export async function applyArmsToActor(actor, data, deps = {}) {
  const clean = sanitiseArmsRequest(data);
  const state = stateOf(clean);
  const render = deps.render ?? (async (s) => {
    await ensureArt();
    return renderState(s);
  });
  const encode = deps.encode ?? canvasPng;
  const storage = deps.storage ?? globalThis.Tokenizer2?.lib?.StorageHelper?.StorageHelper;
  if (!storage) throw new Error("Tokenizer 2 is not ready");
  const folder = deps.folder ?? pluginSetting("folder", "tokenizer/coat-of-arms");
  const file = new File([await encode(await render(state))], pictureName(state), { type: "image/png" });
  const path = await storage.uploadDated(folder, file);
  await actor.update({
    "system.coatOfArms": path,
    "system.heraldry": clean.blazon,
    [`flags.${MODULE_ID}.${FLAG_ARMS}`]: clean,
  });
  return path;
}

/** The request type's definition for Tokenizer 2's player requests. */
export function armsRequestType() {
  const t = (key, data) => game.i18n.format(`TOKENIZER-2.COA.${key}`, data);
  return {
    label: (_record, actor) => t("RequestLabel", { name: actor?.name ?? "?" }),
    sanitize: sanitiseArmsRequest,
    describe: (record) => sanitiseArmsRequest(record.payload).blazon,
    preview: async (record) => {
      await ensureArt();
      return renderState(stateOf(sanitiseArmsRequest(record.payload)), 256);
    },
    apply: async (record, actor) => {
      await applyArmsToActor(actor, record.payload);
    },
    maxBytes: 16 * 1024,
  };
}

/** Registers the request type, when this Tokenizer 2 has player requests (API 1.3). */
export function registerArmsRequest(api) {
  api?.gmRequests?.register?.(ARMS_REQUEST, armsRequestType());
}
