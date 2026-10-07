/**
 * arms.js - the coat of arms data and the edits the panel makes to it. Arms
 * are plain JSON:
 *
 *   { version, field: { tincture, division, variation }, ordinary, charges, halves }
 *
 * `field.division` is `{ type, tinctures: [a, b], design }` (design: solid,
 * separate, overall, countercharged), `field.variation` is
 * `{ type, tinctures: [a, b], count, charge }`, `ordinary` is
 * `{ type, tincture, charges, variation }`, each charge group is
 * `{ type, tincture, count, head, attitude, minor }` and `halves` holds two
 * coats when the shield is divided into separate arms.
 */

import { CATALOGUE, CHARGE_IDS, chargeInfo } from "./charges/catalogue.js";
import { artAttitudes, artDefaultAttitude, artKnown, hasHeadArt } from "./charges/art.js";
import { DIVISIONS, ORDINARIES, VARIATIONS } from "./tables.js";
import { FURS, PROPER, TINCTURE_IDS } from "./tinctures.js";
import { NUDGE_MAX, PLACE_IDS, SCALE_MAX, SCALE_MIN } from "./render/placement.js";

/** The division types, in the book's order. */
export const DIVISION_TYPES = Object.freeze([...new Set(DIVISIONS.map((d) => d.type))]);
/** The variation types. */
export const VARIATION_TYPES = Object.freeze([...new Set(VARIATIONS.map((v) => v.type))]);
/** The ordinary types. */
export const ORDINARY_TYPES = ORDINARIES;
/** The attitudes a quadruped may take. */
export const ATTITUDE_IDS = Object.freeze(["rampant", "passant", "statant", "couchant"]);
/** The most stripes, bends or sectors a variation draws (the tables go to 16). */
export const MAX_PATTERN_COUNT = 24;

/** A variation's count: a whole number from 2 to MAX_PATTERN_COUNT, or null for the pattern's own. */
function patternCount(value) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? Math.max(2, Math.min(MAX_PATTERN_COUNT, n)) : null;
}

/** The kinds of charge that take an attitude, and those that have a head picture. */
export function chargeTakesAttitude(id) {
  const info = chargeInfo(id);
  return ["beast"].includes(info.kind) || ["griffin", "unicorn", "pegasus", "yale", "enfield", "opinicus", "hippogriff", "manticore", "talbot", "warhorse", "leopard"].includes(id);
}

/** Whether a charge may be shown as its head alone (there is a picture of it, once the art is known). */
export function chargeHasHead(id) {
  return Boolean(chargeInfo(id).headLabel) && (!artKnown(id) || hasHeadArt(id));
}

/** The attitudes a charge can be shown in: those it has pictures of, once the art is known. */
export function chargeAttitudes(id) {
  if (artKnown(id)) {
    const have = artAttitudes(id);
    return ATTITUDE_IDS.filter((a) => have.includes(a));
  }
  return chargeTakesAttitude(id) ? ATTITUDE_IDS : [];
}

/** The attitude a charge shows when none is chosen (its picture's), or null. */
export function defaultAttitude(id) {
  return chargeInfo(id).attitude ?? artDefaultAttitude(id);
}

/** Charge ids grouped by kind, for a menu. */
export function chargeGroups() {
  const groups = new Map();
  for (const id of CHARGE_IDS) {
    const kind = CATALOGUE[id].kind;
    if (!groups.has(kind)) groups.set(kind, []);
    groups.get(kind).push(id);
  }
  return [...groups.entries()].map(([kind, ids]) => ({ kind, ids: ids.sort((a, b) => chargeInfo(a).label.localeCompare(chargeInfo(b).label)) }));
}

/** The tinctures a charge may be, proper included. */
export const CHARGE_TINCTURES = Object.freeze([...TINCTURE_IDS.filter((t) => !FURS.includes(t)), PROPER]);

/** What a field is: plain, a fur, a division or a variation, as one id for a menu. */
export function fieldPattern(field) {
  if (field.division) return `division:${field.division.type}`;
  if (field.variation) return `variation:${field.variation.type}`;
  if (FURS.includes(field.tincture)) return `fur:${field.tincture}`;
  return "plain";
}

/** Every field pattern id with its group, for a menu. */
export function fieldPatterns() {
  return [
    { id: "plain", group: "plain" },
    ...DIVISION_TYPES.map((t) => ({ id: `division:${t}`, group: "division" })),
    ...VARIATION_TYPES.map((t) => ({ id: `variation:${t}`, group: "variation" })),
    ...FURS.map((t) => ({ id: `fur:${t}`, group: "fur" })),
  ];
}

/** The second tincture of a field, or a fresh one that differs from the first. */
function otherTincture(first) {
  return first === "or" ? "gules" : first === "argent" ? "azure" : "argent";
}

/** A plain copy of arms. */
export function cloneArms(arms) {
  return JSON.parse(JSON.stringify(arms));
}

/**
 * Changes what the field is, keeping the tinctures it had where it can.
 * @param {object} arms  Changed in place
 * @param {string} pattern  "plain", "division:<type>", "variation:<type>" or "fur:<id>"
 */
export function setFieldPattern(arms, pattern) {
  const field = arms.field;
  const pair = field.division?.tinctures ?? field.variation?.tinctures ?? [FURS.includes(field.tincture) ? "argent" : field.tincture, otherTincture(field.tincture)];
  const [kind, type] = pattern.split(":");
  field.division = null;
  field.variation = null;
  arms.halves = null;
  if (kind === "division") {
    field.division = { type, tinctures: [pair[0], pair[1]], design: "overall" };
    field.tincture = pair[0];
  } else if (kind === "variation") {
    const row = VARIATIONS.find((v) => v.type === type);
    field.variation = { type, tinctures: [pair[0], pair[1]], count: row?.count ?? (type === "gyronny" ? 8 : null), charge: type === "seme" ? "cross" : null };
    field.tincture = pair[0];
  } else if (kind === "fur") {
    field.tincture = type;
  } else if (FURS.includes(field.tincture)) {
    field.tincture = pair[0];
  }
}

/** Sets a field's first or second tincture, whatever the field is. */
export function setFieldTincture(arms, index, tincture) {
  const field = arms.field;
  const pattern = field.division ?? field.variation;
  if (pattern) {
    pattern.tinctures[index] = tincture;
    if (index === 0) field.tincture = tincture;
  } else if (index === 0) {
    field.tincture = tincture;
  }
}

/** Sets the ordinary, or removes it; a new one keeps the old one's charges. */
export function setOrdinary(arms, type) {
  if (!type) {
    arms.ordinary = null;
    return;
  }
  if (arms.ordinary) {
    arms.ordinary.type = type;
    return;
  }
  arms.ordinary = { type, tincture: otherTincture(arms.field.tincture), charges: [], variation: null };
}

/** A new charge group. */
export function newCharge(type = "mullet", tincture = "or") {
  const info = chargeInfo(type);
  return { type, tincture, count: 1, head: false, attitude: info.attitude ?? null, minor: false };
}

/**
 * Arms data from anywhere (a flag, a file), made whole: every part present,
 * unknown charges kept (they draw as a roundel) and bad values dropped.
 * @param {object} data
 * @returns {object}
 */
export function normaliseArms(data) {
  const src = data && typeof data === "object" ? data : {};
  const tincture = (t, fallback) => (TINCTURE_IDS.includes(t) || t === PROPER ? t : fallback);
  const field = src.field && typeof src.field === "object" ? src.field : {};
  const group = (g) => {
    const out = {
      type: typeof g?.type === "string" ? g.type : "roundel",
      tincture: tincture(g?.tincture, "or"),
      count: Math.max(0, Math.min(20, Math.round(Number(g?.count) || 1))),
      head: Boolean(g?.head),
      attitude: ATTITUDE_IDS.includes(g?.attitude) ? g.attitude : null,
      minor: Boolean(g?.minor),
    };
    // a chosen position, size and nudge, kept only when set
    if (PLACE_IDS.includes(g?.place)) out.place = g.place;
    const scale = Number(g?.scale);
    if (Number.isFinite(scale) && scale !== 1) out.scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale));
    const nudge = (v) => Math.min(NUDGE_MAX, Math.max(-NUDGE_MAX, Number(v) || 0));
    if (g?.offset && (nudge(g.offset.x) || nudge(g.offset.y))) out.offset = { x: nudge(g.offset.x), y: nudge(g.offset.y) };
    return out;
  };
  const pair = (p, first) => [tincture(p?.[0], first), tincture(p?.[1], otherTincture(first))];
  const out = {
    version: 1,
    field: { tincture: tincture(field.tincture, "argent"), division: null, variation: null },
    ordinary: null,
    charges: Array.isArray(src.charges) ? src.charges.map(group) : [],
    halves: null,
  };
  if (field.division && DIVISION_TYPES.includes(field.division.type)) {
    out.field.division = {
      type: field.division.type,
      tinctures: pair(field.division.tinctures, out.field.tincture),
      design: ["solid", "separate", "overall", "countercharged"].includes(field.division.design) ? field.division.design : "overall",
    };
  }
  const variation = (v) => (v && (VARIATION_TYPES.includes(v.type) || v.type === "fur")
    ? { type: v.type, tinctures: v.type === "fur" ? [tincture(v.tinctures?.[0], "ermine")] : pair(v.tinctures, out.field.tincture), count: patternCount(v.count), charge: typeof v.charge === "string" ? v.charge : null }
    : null);
  if (!out.field.division) out.field.variation = variation(field.variation);
  if (src.ordinary && ORDINARY_TYPES.includes(src.ordinary.type)) {
    out.ordinary = {
      type: src.ordinary.type,
      tincture: tincture(src.ordinary.tincture, "or"),
      charges: Array.isArray(src.ordinary.charges) ? src.ordinary.charges.map(group) : [],
      variation: variation(src.ordinary.variation),
    };
  }
  if (out.field.division?.design === "separate" && Array.isArray(src.halves) && src.halves.length === 2) {
    out.halves = src.halves.map((h) => {
      const half = normaliseArms(h);
      half.halves = null;
      return half;
    });
  } else if (out.field.division?.design === "separate") {
    out.field.division.design = "overall";
  }
  return out;
}
