/**
 * index.js - where a charge's picture comes from. The plain geometric
 * charges (roundels, mullets, crosses, foils...) are drawn in code: a
 * picture is `(s, pose) => void`, drawing on a Sketch in a 100 x 100 box.
 * Every other charge is drawn from a file picture (art.js); until those
 * are loaded, or for a charge with none, the roundel stands in.
 */

import { drawnAs } from "./catalogue.js";
import { GEOMETRIC } from "./geometric.js";
import { CROSSES } from "./crosses.js";
import { hasArt } from "./art.js";

/** The code-drawn pictures by charge id. */
export const PICTURES = Object.freeze({ ...GEOMETRIC, ...CROSSES });

/** A charge with no picture of its own shows as a roundel. */
export const FALLBACK = "roundel";

/** The code-drawn picture of a charge (its own or one it borrows), or null. */
export function codePicture(id) {
  return PICTURES[id] ?? PICTURES[drawnAs(id)] ?? null;
}

/** The code-drawn picture a charge is drawn with: its own, the one it borrows, or the stand-in. */
export function picture(id) {
  return codePicture(id) ?? PICTURES[FALLBACK];
}

/** Whether a charge has a picture: drawn in code, or from a file (its own or borrowed). */
export function hasPicture(id) {
  return Boolean(codePicture(id)) || hasArt(id);
}
