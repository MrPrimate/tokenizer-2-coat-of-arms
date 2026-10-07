/**
 * tables.js - the Pendragon 6th edition coat of arms generator's random
 * tables (Appendix B of the core rulebook) as data. Each table is a list of
 * ranges on 1d20 (or a column list indexed by 1d6), kept close to the page so
 * the generator reads like the book.
 */

/** Looks `n` up in a ranged table: [{ min, max, ...entry }]. */
export function lookup(table, n) {
  const row = table.find((r) => n >= r.min && n <= r.max);
  if (!row) throw new Error(`No row for ${n}`);
  return row;
}

/**
 * Table B.1 Shield Design (1d20). `design` is what goes on the field:
 * charge (groups of 1d3), minor (column 5, groups of 2d6), both (a single
 * charge and a minor group), peripheral, ordinary; with `charged` where the
 * design also carries a charge on the field ("field") or on the ordinary
 * ("ordinary"); variation and division send the generator to the sub-tables.
 */
export const SHIELD_DESIGN = Object.freeze([
  { min: 1, max: 6, design: "charge" },
  { min: 7, max: 7, design: "minor" },
  { min: 8, max: 9, design: "both" },
  { min: 10, max: 10, design: "peripheral" },
  { min: 11, max: 11, design: "peripheral", charged: "field" },
  { min: 12, max: 12, design: "peripheral", charged: "ordinary" },
  { min: 13, max: 13, design: "ordinary" },
  { min: 14, max: 14, design: "ordinary", charged: "field" },
  { min: 15, max: 15, design: "ordinary", charged: "ordinary" },
  { min: 16, max: 18, design: "variation" },
  { min: 19, max: 20, design: "division" },
]);

/** Sub-table B.1.1 Variations (1d20). */
export const VARIATIONS = Object.freeze([
  { min: 1, max: 4, type: "barry", count: 6 },
  { min: 5, max: 5, type: "barry", count: 8 },
  { min: 6, max: 6, type: "barry", count: 10 },
  { min: 7, max: 8, type: "bendy" },
  { min: 9, max: 9, type: "bendy-sinister" },
  { min: 10, max: 12, type: "chequy" },
  { min: 13, max: 13, type: "chevronny" },
  { min: 14, max: 14, type: "fretty" },
  { min: 15, max: 15, type: "gyronny" },
  { min: 16, max: 17, type: "lozengy" },
  { min: 18, max: 19, type: "paly" },
  { min: 20, max: 20, type: "seme" },
]);

/** Gyronny sectors: 1d6, 1-3 = 8, 4-5 = 12, 6 = 16. */
export const GYRONNY_SECTORS = Object.freeze([
  { min: 1, max: 3, count: 8 },
  { min: 4, max: 5, count: 12 },
  { min: 6, max: 6, count: 16 },
]);

/** Sub-table B.1.2 Divisions (1d20), the Division column. */
export const DIVISIONS = Object.freeze([
  { min: 1, max: 10, type: "quarterly" },
  { min: 11, max: 13, type: "pale" },
  { min: 14, max: 16, type: "fess" },
  { min: 17, max: 17, type: "bend", countercharged: true },
  { min: 18, max: 18, type: "bend-sinister" },
  { min: 19, max: 19, type: "saltire" },
  { min: 20, max: 20, type: "chevron" },
]);

/**
 * Sub-table B.1.2, the Design column (1d20, at -2 for quarterly or saltire
 * and +2 for the others): what the division carries. `reroll` rows roll again.
 */
export const DIVISION_DESIGNS = Object.freeze([
  { min: -Infinity, max: 10, design: "solid" },
  { min: 11, max: 13, design: "separate" },
  { min: 14, max: 16, design: "overall" },
  { min: 17, max: 17, design: "countercharged" },
  { min: 18, max: Infinity, reroll: true },
]);

/** Table B.2 Tinctures (1d20): the field column, and the metal and colour charge columns. */
export const TINCTURE_TABLE = Object.freeze([
  { min: 1, max: 5, field: "argent", metal: "argent", colour: "azure" },
  { min: 6, max: 7, field: "or", metal: "argent", colour: "vert" },
  { min: 8, max: 9, field: "or", metal: "or", colour: "gules" },
  { min: 10, max: 10, field: "purpure", metal: "or", colour: "gules" },
  { min: 11, max: 13, field: "azure", metal: "or", colour: "gules" },
  { min: 14, max: 16, field: "gules", metal: "or", colour: "sable" },
  { min: 17, max: 17, field: "vert", metal: "or", colour: "purpure" },
  { min: 18, max: 19, field: "sable", metal: "proper", colour: "proper" },
  { min: 20, max: 20, field: "fur", metal: "proper", colour: "proper" },
]);

/** Fur: 1d6, 1-4 ermine, 5-6 vair. */
export const FUR_TABLE = Object.freeze([
  { min: 1, max: 4, fur: "ermine" },
  { min: 5, max: 6, fur: "vair" },
]);

/**
 * Table B.3 Charges: rows 1..20 by column 1..6 (three animate, two
 * inanimate, one of ordinaries). An entry is a charge id, `[a, b]` for a
 * choice (1d2), `{ sub }` for a roll on the sub-table, or `{ ordinary }`.
 * Italics in the book (`head: true` here) are beasts that may show their
 * head alone; `quadruped` marks those that roll for their attitude.
 */
export const CHARGE_TABLE = Object.freeze([
  // 1
  [{ id: "lion", attitude: "rampant", head: true }, "bee", "sea-horse", "sword", "cross", { ordinary: "chief" }],
  // 2
  [{ id: "lion", attitude: "rampant", head: true }, { id: "hound", head: true, quadruped: true }, { id: "unicorn", head: true, quadruped: true }, "church", "bell", { ordinary: "cross" }],
  // 3
  [{ id: "lion", attitude: "rampant", head: true }, { id: "goat", head: true, quadruped: true, herbivore: true }, { id: "griffin", head: true }, "lymphad", "cross-patee", { ordinary: "pale" }],
  // 4
  [{ id: "lion", attitude: "couchant", head: true }, [{ id: "ram", head: true, quadruped: true, herbivore: true }, { id: "sheep", quadruped: true, herbivore: true }], "hippogriff", ["castle", "tower"], { sub: "crosses" }, { ordinary: "bend" }],
  // 5
  [{ id: "lion", attitude: "statant", head: true }, { id: "bull", head: true, quadruped: true, herbivore: true }, "wyvern", ["sun", "moon"], "trefoil", { ordinary: "cross" }],
  // 6
  [{ id: "lion", attitude: "passant", head: true }, { id: "horse", head: true, quadruped: true, herbivore: true }, "dragon", ["head", "skull"], ["quatrefoil", "cinquefoil"], { ordinary: ["pile", "flaunches"] }],
  // 7
  [{ id: "lion", attitude: "passant", head: true }, "fish", "wyrm", ["hand", "arm"], "crescent", { ordinary: "fess" }],
  // 8
  [{ id: "lion", attitude: "rampant", head: true }, "fish", "cockatrice", "gauntlet", ["increscent", "decrescent"], { ordinary: "fess" }],
  // 9
  [{ id: "lion", attitude: "rampant", head: true }, "dolphin", "manticore", "anchor", ["estoile", "mullet"], { ordinary: "fess" }],
  // 10
  [{ id: "dragon", head: true }, "escallop", ["giant", "ogre"], "crown", "mullet", { ordinary: "fess" }],
  // 11
  [{ id: "dragon", head: true }, "crab", ["centaur", "satyr"], ["rose", "thistle"], "mullet-pierced", { ordinary: "bend-sinister" }],
  // 12
  [{ id: "eagle", head: true }, "eel", "pegasus", "tree", ["mullet-6", "mullet-8"], { ordinary: "bend" }],
  // 13
  [{ id: "eagle", head: true }, "serpent", "sea-dog", { sub: "weapons" }, "lozenge", { ordinary: "bend" }],
  // 14
  [{ id: "eagle", head: true }, "bat", ["mermaid", "merman"], { sub: "household" }, ["rustre", "mascle"], { ordinary: "bend" }],
  // 15
  [{ id: "stag", head: true, quadruped: true, herbivore: true }, ["spider", "fly"], "camelopard", { sub: "nature" }, "roundel", { ordinary: "chevron" }],
  // 16
  [{ id: "wolf", head: true, quadruped: true }, ["scorpion", "ant"], "harpy", { sub: "christian" }, "roundel", { ordinary: "chevron" }],
  // 17
  [{ id: "bear", head: true, quadruped: true }, "leopard", "phoenix", { sub: "pagan" }, "roundel", { ordinary: "cross" }],
  // 18
  [{ id: "boar", head: true, quadruped: true }, ["crow", "raven"], "opinicus", { sub: "tools" }, "annulet", { ordinary: "cross" }],
  // 19
  [{ id: "fox", head: true, quadruped: true }, { sub: "birds" }, "salamander", { sub: "chivalry" }, "fleur-de-lis", { ordinary: "saltire" }],
  // 20
  [{ id: "talbot", head: true, quadruped: true }, { sub: "religious" }, ["yale", "enfield"], { sub: "constructs" }, ["heart", "billet"], { ordinary: "pale" }],
]);

/** Sub-table B.3.1 Charge Types (1d6 along a row). */
export const CHARGE_SUBTABLES = Object.freeze({
  chivalry: ["knight", "spur", "helm", "warhorse", ["lance", "spear"], "cup"],
  weapons: ["warhammer", "battle-axe", "arrow", ["mace", "flail"], "morningstar", "spear"],
  tools: ["hammer", "anvil", "hunting-horn", "wheel", "horseshoe", ["sickle", "shovel"]],
  household: ["fetterlock", "key", "buckle", "scale", "maunch", ["harp", "book"]],
  birds: ["falcon", "owl", ["heron", "crane"], "martlet", "cock", "swan"],
  peripherals: [["bordure", "orle"], "bordure", "chief", "chief", "chief", ["quarter", "canton"]],
  religious: ["mary-and-child", ["saint", "angel"], "crucifixion", "paschal-lamb", "roman-god", "celtic-god"],
  christian: ["chi-rho", "chi-rho", "chi-rho", "dove", "palm-leaf", "thorn-crown"],
  crosses: ["cross-maltese", "cross-moline", "cross-patonce", "cross-potent", "cross-flory", "cross-bottony"],
  pagan: ["caduceus", "thunderbolt", { id: "medusa", head: true }, { id: "horned-god", head: true }, "shining-spear", "woman-rider"],
  nature: ["mountain", "shooting-star", "fountain", ["acorn", "apple"], { id: "wild-man", head: true }, "garb"],
  constructs: ["pavilion", "walls", "bridge", "gateworks", "church", "lighthouse"],
});

/** Religious charges are always single. */
export const SINGLE_SUBTABLES = Object.freeze(["religious"]);

/**
 * Optional rule 3: a quadruped's attitude, 1d6 (+1 for herbivores) on column
 * 1 of Table B.3: rearing, resting, standing or walking.
 */
export const ATTITUDES = Object.freeze([
  { min: 1, max: 3, attitude: "rampant" },
  { min: 4, max: 4, attitude: "couchant" },
  { min: 5, max: 5, attitude: "statant" },
  { min: 6, max: 7, attitude: "passant" },
]);

/** The peripheral ordinaries, which sit at the edge of the field. */
export const PERIPHERALS = Object.freeze(["bordure", "orle", "chief", "quarter", "canton"]);

/** Every ordinary the tables can give, in the book's names. */
export const ORDINARIES = Object.freeze([
  "chief", "pale", "fess", "bend", "bend-sinister", "chevron", "cross", "saltire", "pile", "flaunches",
  "bordure", "orle", "quarter", "canton",
]);
