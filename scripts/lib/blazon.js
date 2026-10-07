/**
 * blazon.js - a coat of arms in words, from the bottom up as heralds do:
 * the field (its division or pattern), the ordinary and what lies on it,
 * then the charges. "Vert, on a chief argent a wolf sable."
 */

import { chargeLabel } from "./charges/catalogue.js";
import { tinctureName } from "./tinctures.js";
import { PLACES } from "./render/placement.js";

const NUMBERS = ["", "a", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen"];
const WORDS_OF = { 6: "six", 8: "eight", 10: "ten", 12: "twelve", 16: "sixteen" };

const ORDINARY_NAMES = {
  chief: "chief", pale: "pale", fess: "fess", bend: "bend", "bend-sinister": "bend sinister", chevron: "chevron",
  cross: "cross", saltire: "saltire", pile: "pile", flaunches: "flaunches", bordure: "bordure", orle: "orle",
  quarter: "quarter", canton: "canton",
};

const DIVISION_NAMES = {
  quarterly: "Quarterly", pale: "Per pale", fess: "Per fess", bend: "Per bend", "bend-sinister": "Per bend sinister",
  saltire: "Per saltire", chevron: "Per chevron",
};

const ATTITUDE_NAMES = { rampant: "rampant", couchant: "couchant", statant: "statant", passant: "passant" };

/** "a" or "an" before a word ("a unicorn": the u sounds as "you"). */
function article(word) {
  return (/^[aeiou]/i).test(word) && !(/^u(ni|se|su)/i).test(word) ? "an" : "a";
}

function countWord(n, word) {
  if (n === 1) return `${article(word)} ${word}`;
  return `${NUMBERS[n] ?? n} ${word}`;
}

/** "barry of six", "gyronny of eight", "chequy", "semé of crosses". */
function variationText(variation) {
  const of = (n) => (n ? ` of ${WORDS_OF[n] ?? n}` : "");
  switch (variation.type) {
    case "barry":
    case "paly":
    case "bendy":
      return `${variation.type}${of(variation.count)}`;
    case "bendy-sinister":
      return `bendy sinister${of(variation.count)}`;
    case "gyronny":
      return `gyronny${of(variation.count)}`;
    case "seme":
      return `semé of ${chargeLabel(variation.charge, { count: 2 })}`;
    case "fur":
      return tinctureName(variation.tinctures[0]);
    default:
      return variation.type;
  }
}

/** The pair of tinctures a pattern is drawn in. */
function pairText(tinctures) {
  return `${tinctureName(tinctures[0])} and ${tinctureName(tinctures[1])}`;
}

/** A group of charges: "three mullets of eight argent", "a lion rampant or". */
function groupText(group, { tincture = true } = {}) {
  let words = chargeLabel(group.type, { count: group.count, head: group.head });
  if (group.attitude && !group.head && ATTITUDE_NAMES[group.attitude]) words += ` ${ATTITUDE_NAMES[group.attitude]}`;
  let text = countWord(group.count, words);
  if (tincture) text += ` ${tinctureName(group.tincture)}${placeText(group)}`;
  return text;
}

/** " in dexter chief" when a group was put at one of the shield's points. */
function placeText(group) {
  const words = PLACES[group?.place]?.words;
  return words ? ` ${words}` : "";
}

/** The field: "Vert", "Per pale azure and or", "Barry of six argent and gules", "Azure semé of crosses or". */
function fieldText(arms) {
  const { field } = arms;
  if (field.division) {
    const name = DIVISION_NAMES[field.division.type] ?? `Per ${field.division.type}`;
    return `${name} ${pairText(field.division.tinctures)}`;
  }
  if (field.variation) {
    const v = field.variation;
    if (v.type === "seme") return `${capitalise(tinctureName(v.tinctures[0]))} semé of ${chargeLabel(v.charge, { count: 2 })} ${tinctureName(v.tinctures[1])}`;
    return `${capitalise(variationText(v))} ${pairText(v.tinctures)}`;
  }
  return capitalise(tinctureName(field.tincture));
}

/** The ordinary's paint: "argent", or a pattern, "chequy or and azure". */
function ordinaryTincture(ordinary) {
  if (ordinary.variation) {
    if (ordinary.variation.type === "fur") return tinctureName(ordinary.variation.tinctures[0]);
    if (ordinary.variation.type === "seme") return `${tinctureName(ordinary.variation.tinctures[0])} semé of ${chargeLabel(ordinary.variation.charge, { count: 2 })} ${tinctureName(ordinary.variation.tinctures[1])}`;
    return `${variationText(ordinary.variation)} ${pairText(ordinary.variation.tinctures)}`;
  }
  return tinctureName(ordinary.tincture);
}

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The blazon of a coat of arms.
 * @param {object} arms
 * @returns {string}
 */
export function blazon(arms) {
  if (!arms) return "";
  const parts = [];
  const countercharged = arms.field.division?.design === "countercharged";
  if (arms.halves) {
    const sides = arms.field.division.type === "quarterly"
      ? ["first and fourth", "second and third"]
      : arms.field.division.type === "fess" || arms.field.division.type === "chevron"
        ? ["in chief", "in base"]
        : ["dexter", "sinister"];
    const name = DIVISION_NAMES[arms.field.division.type] ?? `Per ${arms.field.division.type}`;
    return `${name}: ${sides[0]}, ${blazon(arms.halves[0])} ${sides[1]}, ${blazon(arms.halves[1])}`;
  }
  parts.push(fieldText(arms));
  const ordinary = arms.ordinary;
  const onField = arms.charges.filter((g) => g.count > 0);
  const charged = ordinary?.charges?.filter((g) => g.count > 0) ?? [];
  const tincture = (group) => (countercharged ? "counterchanged" : tinctureName(group.tincture));
  const chargesText = onField.map((g) => `${groupText(g, { tincture: false })} ${tincture(g)}${placeText(g)}`);
  if (!ordinary) {
    parts.push(...chargesText);
    return `${parts.join(", ")}.`;
  }
  const name = ORDINARY_NAMES[ordinary.type] ?? ordinary.type;
  const plural = ordinary.type === "flaunches";
  const paint = countercharged ? "counterchanged" : ordinaryTincture(ordinary);
  const named = plural ? name : `${article(name)} ${name}`;
  const onIt = charged.length ? ` ${charged.map((g) => `${groupText(g, { tincture: false })} ${tincture(g)}`).join(" and ")}` : "";
  const ordinaryText = `${charged.length ? "on " : ""}${named} ${paint}${onIt}`;
  if (ordinary.type === "bordure" || ordinary.type === "orle") {
    // "a lion or within a bordure gules"
    parts.push(chargesText.length ? `${chargesText.join(", ")} within ${ordinaryText}` : ordinaryText);
  } else if (["chief", "quarter", "canton"].includes(ordinary.type)) {
    // the charges first, the chief last
    parts.push(...chargesText, ordinaryText);
  } else if (chargesText.length) {
    // "a bend between two mullets argent" when they share a tincture, else each named
    const shared = onField.every((g) => g.tincture === ordinary.tincture) && !ordinary.variation && !countercharged;
    const between = onField.map((g) => `${groupText(g, { tincture: !shared })}${shared ? placeText(g) : ""}`).join(" and ");
    const head = `${charged.length ? "on " : ""}${named}`;
    parts.push(shared ? `${head} between ${between} ${paint}${onIt}` : `${head} ${paint} between ${between}${onIt}`);
  } else {
    parts.push(ordinaryText);
  }
  return `${parts.join(", ")}.`;
}
