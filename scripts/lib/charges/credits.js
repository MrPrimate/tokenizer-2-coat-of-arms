/**
 * credits.js - which share-alike pictures a coat of arms is drawn with, so
 * the window can say that a picture made from it is shared under the same
 * licence. Follows the renderer: the charges on the field and the ordinary,
 * a semé's charge, and both coats of a divided shield, each in the pose it
 * is drawn in (the head alone, an attitude).
 */

import { chargeInfo, chargeLabel } from "./catalogue.js";
import { codePicture } from "./index.js";
import { artEntry, artFiles } from "./art.js";

/** The art pack whose licence carries over to pictures made with it. */
export const SHARE_ALIKE_PACK = "charges-by-sa";

/** Every charge drawn in a coat (and its halves): { type, head, attitude }. */
function drawnCharges(arms) {
  if (!arms) return [];
  const out = [];
  const groups = [...(arms.charges ?? []), ...(arms.ordinary?.charges ?? [])];
  for (const g of groups) out.push({ type: g.type, head: Boolean(g.head), attitude: g.attitude ?? null });
  for (const variation of [arms.field?.variation, arms.ordinary?.variation]) {
    if (variation?.charge) out.push({ type: variation.charge, head: false, attitude: null });
  }
  for (const half of arms.halves ?? []) out.push(...drawnCharges(half));
  return out;
}

/**
 * The share-alike pictures a coat is drawn with, one per file:
 * { file, charges: [labels], title, author, licence, licenceUrl, source }.
 * Empty when it uses none (or the share-alike folder is not there).
 * @param {object} arms
 * @returns {object[]}
 */
export function shareAlikeCredits(arms) {
  const files = artFiles(SHARE_ALIKE_PACK);
  const found = new Map();
  for (const { type, head, attitude } of drawnCharges(arms)) {
    // the geometric charges are drawn in code
    if (!type || codePicture(type)) continue;
    const entry = artEntry(type, { head, attitude: attitude ?? chargeInfo(type).attitude ?? null });
    if (entry?.pack !== SHARE_ALIKE_PACK) continue;
    const credit = files[entry.file] ?? {};
    const item = found.get(entry.file) ?? { file: entry.file, charges: [], ...credit };
    const label = chargeLabel(type, { head });
    if (!item.charges.includes(label)) item.charges.push(label);
    found.set(entry.file, item);
  }
  return [...found.values()];
}
