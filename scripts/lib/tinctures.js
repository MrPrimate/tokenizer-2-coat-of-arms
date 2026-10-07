/**
 * tinctures.js - the heraldic colours: two metals, five colours and the furs,
 * with the paint each gets (the flat, slightly aged tones of the Pendragon
 * rulebook's heraldry plates).
 */

/** The tinctures: id, name, kind (metal, colour or fur) and paint. */
export const TINCTURES = Object.freeze({
  argent: Object.freeze({ id: "argent", name: "Argent", plain: "silver", kind: "metal", fill: "#f1e9d2" }),
  or: Object.freeze({ id: "or", name: "Or", plain: "gold", kind: "metal", fill: "#e9b63a" }),
  gules: Object.freeze({ id: "gules", name: "Gules", plain: "red", kind: "colour", fill: "#c4372b" }),
  azure: Object.freeze({ id: "azure", name: "Azure", plain: "blue", kind: "colour", fill: "#2d5e9c" }),
  vert: Object.freeze({ id: "vert", name: "Vert", plain: "green", kind: "colour", fill: "#5c9a3f" }),
  purpure: Object.freeze({ id: "purpure", name: "Purpure", plain: "purple", kind: "colour", fill: "#7a3f8b" }),
  sable: Object.freeze({ id: "sable", name: "Sable", plain: "black", kind: "colour", fill: "#3b3a38" }),
  ermine: Object.freeze({ id: "ermine", name: "Ermine", plain: "ermine", kind: "fur", fill: "#f1e9d2", spots: "#3b3a38" }),
  ermines: Object.freeze({ id: "ermines", name: "Ermines", plain: "ermines", kind: "fur", fill: "#3b3a38", spots: "#f1e9d2" }),
  erminois: Object.freeze({ id: "erminois", name: "Erminois", plain: "erminois", kind: "fur", fill: "#e9b63a", spots: "#3b3a38" }),
  vair: Object.freeze({ id: "vair", name: "Vair", plain: "vair", kind: "fur", fill: "#f1e9d2", bells: "#2d5e9c" }),
});

/** The metals, the colours and the furs, in the rulebook's order. */
export const METALS = Object.freeze(["argent", "or"]);
export const COLOURS = Object.freeze(["gules", "azure", "vert", "purpure", "sable"]);
export const FURS = Object.freeze(["ermine", "ermines", "erminois", "vair"]);
/** Every tincture id a field or charge may have. */
export const TINCTURE_IDS = Object.freeze([...METALS, ...COLOURS, ...FURS]);

/** "proper" is not a tincture: the charge is painted in its natural colours. */
export const PROPER = "proper";

/** The paint of the outlines and detail lines: a warm, dark brown. */
export const OUTLINE = "#43291a";

export function isMetal(id) {
  return TINCTURES[id]?.kind === "metal";
}

export function isColour(id) {
  return TINCTURES[id]?.kind === "colour";
}

export function isFur(id) {
  return TINCTURES[id]?.kind === "fur";
}

/** The flat paint of a tincture (a fur's ground colour), or the given fallback. */
export function tinctureFill(id, fallback = "#888888") {
  return TINCTURES[id]?.fill ?? fallback;
}

/** The tincture's name for a blazon ("argent", "gules"), lower case. */
export function tinctureName(id) {
  if (id === PROPER) return "proper";
  return TINCTURES[id]?.name.toLowerCase() ?? String(id);
}

/** A metal and a colour keep the rule of tincture; furs and proper go with anything. */
export function keepsRule(ground, charge) {
  if (isFur(ground) || charge === PROPER || isFur(charge)) return true;
  if (isMetal(ground)) return isColour(charge);
  if (isColour(ground)) return isMetal(charge);
  return true;
}
