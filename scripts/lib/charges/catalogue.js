/**
 * catalogue.js - every charge the tables can give: its name for a blazon,
 * its kind, and its natural colours when "proper". The pictures are drawn
 * in code for the geometric charges and come from files for the rest (see
 * index.js and art.js); `drawnAs` says which picture a charge without one
 * of its own borrows (an opinicus is drawn as a griffin).
 */

/** Natural colours for charges painted proper: the main paint and a second one for parts. */
const TAWNY = "#c58a3c";
const BROWN = "#7a4a22";
const GREY = "#8d8d88";
const SKIN = "#e8c39e";
const GREEN = "#5c9a3f";
const STEEL = "#b9bcc0";
const WHITE = "#f1e9d2";
const RED = "#c4372b";
const GOLD = "#e9b63a";
const BLUE = "#2d5e9c";

/** A catalogue entry: label, plural, kind and proper paint (`flat`: see isFlat). */
function entry(label, kind, proper, extra = {}) {
  return Object.freeze({ label, kind, proper: Object.freeze(proper), ...extra });
}

/** Kinds: beast, bird, monster, creature (insects, fish), person, object, plant, building, geometric, religious. */
export const CATALOGUE = Object.freeze({
  // beasts (column 1 and 2)
  lion: entry("lion", "beast", { fill: TAWNY, second: RED }, { plural: "lions", headLabel: "lion's head" }),
  leopard: entry("leopard", "beast", { fill: TAWNY, second: RED }, { drawnAs: "lion", attitude: "passant", headLabel: "leopard's head" }),
  dragon: entry("dragon", "monster", { fill: RED, second: GOLD }, { headLabel: "dragon's head" }),
  eagle: entry("eagle", "bird", { fill: BROWN, second: GOLD }, { headLabel: "eagle's head" }),
  stag: entry("stag", "beast", { fill: BROWN, second: TAWNY }, { headLabel: "stag's head" }),
  wolf: entry("wolf", "beast", { fill: GREY, second: RED }, { plural: "wolves", headLabel: "wolf's head", pluralHead: "wolves' heads" }),
  bear: entry("bear", "beast", { fill: BROWN, second: RED }, { headLabel: "bear's head" }),
  boar: entry("boar", "beast", { fill: "#4b3a30", second: WHITE }, { headLabel: "boar's head" }),
  fox: entry("fox", "beast", { fill: "#d2691e", second: WHITE }, { plural: "foxes", headLabel: "fox's head" }),
  talbot: entry("talbot", "beast", { fill: WHITE, second: RED }, { drawnAs: "hound", headLabel: "talbot's head" }),
  hound: entry("hound", "beast", { fill: WHITE, second: RED }, { headLabel: "hound's head" }),
  goat: entry("goat", "beast", { fill: GREY, second: BROWN }, { headLabel: "goat's head" }),
  ram: entry("ram", "beast", { fill: WHITE, second: BROWN }, { headLabel: "ram's head" }),
  sheep: entry("sheep", "beast", { fill: WHITE, second: BROWN }, { drawnAs: "ram", plain: true }),
  bull: entry("bull", "beast", { fill: "#4b3a30", second: WHITE }, { headLabel: "bull's head" }),
  horse: entry("horse", "beast", { fill: BROWN, second: "#3b3a38" }, { headLabel: "horse's head" }),
  warhorse: entry("warhorse", "beast", { fill: BROWN, second: RED }, { drawnAs: "horse", attitude: "rampant" }),
  camelopard: entry("camelopard", "beast", { fill: GOLD, second: BROWN }),
  yale: entry("yale", "monster", { fill: WHITE, second: GOLD }, { drawnAs: "goat", attitude: "rampant" }),
  enfield: entry("enfield", "monster", { fill: "#d2691e", second: GOLD }, { drawnAs: "fox", attitude: "rampant" }),
  // birds
  falcon: entry("falcon", "bird", { fill: BROWN, second: GOLD }),
  owl: entry("owl", "bird", { fill: BROWN, second: GOLD }),
  heron: entry("heron", "bird", { fill: GREY, second: GOLD }),
  crane: entry("crane", "bird", { fill: WHITE, second: GOLD }, { drawnAs: "heron" }),
  martlet: entry("martlet", "bird", { fill: "#3b3a38", second: GOLD }),
  cock: entry("cock", "bird", { fill: TAWNY, second: RED }),
  swan: entry("swan", "bird", { fill: WHITE, second: "#3b3a38" }),
  crow: entry("crow", "bird", { fill: "#3b3a38", second: GOLD }, { drawnAs: "raven" }),
  raven: entry("raven", "bird", { fill: "#3b3a38", second: GOLD }),
  dove: entry("dove", "bird", { fill: WHITE, second: GOLD }),
  bat: entry("bat", "creature", { fill: "#3b3a38", second: BROWN }),
  harpy: entry("harpy", "monster", { fill: BROWN, second: SKIN }, { drawnAs: "eagle" }),
  phoenix: entry("phoenix", "monster", { fill: RED, second: GOLD }),
  // small creatures and fish
  bee: entry("bee", "creature", { fill: GOLD, second: "#3b3a38" }),
  fish: entry("fish", "creature", { fill: STEEL, second: BLUE }, { plural: "fish" }),
  dolphin: entry("dolphin", "creature", { fill: BLUE, second: GREEN }),
  escallop: entry("escallop", "object", { fill: WHITE, second: TAWNY }),
  crab: entry("crab", "creature", { fill: RED, second: "#3b3a38" }),
  eel: entry("eel", "creature", { fill: GREY, second: BLUE }, { drawnAs: "serpent" }),
  serpent: entry("serpent", "creature", { fill: GREEN, second: GOLD }),
  spider: entry("spider", "creature", { fill: "#3b3a38", second: GREY }),
  fly: entry("fly", "creature", { fill: "#3b3a38", second: GREY }, { plural: "flies" }),
  scorpion: entry("scorpion", "creature", { fill: "#3b3a38", second: RED }),
  ant: entry("ant", "creature", { fill: "#3b3a38", second: RED }),
  salamander: entry("salamander", "monster", { fill: GREEN, second: RED }),
  // monsters
  "sea-horse": entry("sea-horse", "monster", { fill: GREEN, second: BLUE }),
  unicorn: entry("unicorn", "monster", { fill: WHITE, second: GOLD }, { headLabel: "unicorn's head" }),
  griffin: entry("griffin", "monster", { fill: TAWNY, second: BROWN }, { headLabel: "griffin's head" }),
  opinicus: entry("opinicus", "monster", { fill: TAWNY, second: BROWN }, { drawnAs: "griffin", plural: "opinici" }),
  hippogriff: entry("hippogriff", "monster", { fill: TAWNY, second: BROWN }, { drawnAs: "griffin" }),
  wyvern: entry("wyvern", "monster", { fill: GREEN, second: RED }),
  cockatrice: entry("cockatrice", "monster", { fill: GOLD, second: RED }, { drawnAs: "wyvern" }),
  wyrm: entry("wyrm", "monster", { fill: GREEN, second: RED }, { drawnAs: "serpent" }),
  manticore: entry("manticore", "monster", { fill: RED, second: SKIN }, { drawnAs: "lion" }),
  giant: entry("giant", "person", { fill: SKIN, second: BROWN }, { drawnAs: "wild-man" }),
  ogre: entry("ogre", "person", { fill: GREEN, second: BROWN }, { drawnAs: "wild-man" }),
  centaur: entry("centaur", "monster", { fill: BROWN, second: SKIN }),
  satyr: entry("satyr", "monster", { fill: SKIN, second: BROWN }, { drawnAs: "wild-man" }),
  pegasus: entry("pegasus", "monster", { fill: WHITE, second: GOLD }, { plural: "pegasi" }),
  "sea-dog": entry("sea-dog", "monster", { fill: GREEN, second: GOLD }, { drawnAs: "hound" }),
  mermaid: entry("mermaid", "monster", { fill: SKIN, second: GREEN }),
  merman: entry("merman", "monster", { fill: SKIN, second: GREEN }, { plural: "mermen", drawnAs: "mermaid" }),
  // people and religious
  knight: entry("knight", "person", { fill: STEEL, second: RED }),
  "wild-man": entry("wild man", "person", { fill: SKIN, second: GREEN }, { plural: "wild men", headLabel: "wild man's head" }),
  "woman-rider": entry("woman rider", "person", { fill: WHITE, second: BROWN }, { drawnAs: "knight" }),
  medusa: entry("Medusa's head", "person", { fill: SKIN, second: GREEN }, { plural: "Medusa's heads", head: true }),
  "horned-god": entry("horned god", "person", { fill: SKIN, second: BROWN }, { drawnAs: "wild-man", headLabel: "horned god's head" }),
  "mary-and-child": entry("Virgin and Child", "religious", { fill: BLUE, second: SKIN }, { drawnAs: "saint", single: true }),
  saint: entry("saint", "religious", { fill: WHITE, second: GOLD }, { single: true }),
  angel: entry("angel", "religious", { fill: WHITE, second: GOLD }, { single: true }),
  crucifixion: entry("crucifix", "religious", { fill: BROWN, second: SKIN }, { plural: "crucifixes", single: true }),
  "paschal-lamb": entry("paschal lamb", "religious", { fill: WHITE, second: RED }, { single: true }),
  "roman-god": entry("Roman god", "religious", { fill: SKIN, second: WHITE }, { drawnAs: "saint", single: true }),
  "celtic-god": entry("Celtic god", "religious", { fill: SKIN, second: BROWN }, { drawnAs: "wild-man", single: true }),
  "chi-rho": entry("Chi-Rho", "geometric", { fill: GOLD }, { plural: "Chi-Rhos" }),
  "palm-leaf": entry("palm leaf", "plant", { fill: GREEN, second: BROWN }, { plural: "palm leaves" }),
  "thorn-crown": entry("crown of thorns", "object", { fill: BROWN }, { plural: "crowns of thorns" }),
  caduceus: entry("caduceus", "object", { fill: GOLD, second: GREEN }, { plural: "caducei" }),
  thunderbolt: entry("thunderbolt", "object", { fill: GOLD, second: RED }),
  "shining-spear": entry("shining spear", "object", { fill: GOLD, second: BROWN }),
  // objects
  sword: entry("sword", "object", { fill: STEEL, second: GOLD }),
  lance: entry("lance", "object", { fill: BROWN, second: STEEL }),
  spear: entry("spear", "object", { fill: BROWN, second: STEEL }),
  arrow: entry("arrow", "object", { fill: BROWN, second: STEEL }),
  warhammer: entry("warhammer", "object", { fill: STEEL, second: BROWN }),
  hammer: entry("hammer", "object", { fill: STEEL, second: BROWN }),
  "battle-axe": entry("battle-axe", "object", { fill: STEEL, second: BROWN }),
  mace: entry("mace", "object", { fill: STEEL, second: BROWN }),
  flail: entry("flail", "object", { fill: STEEL, second: BROWN }),
  morningstar: entry("morningstar", "object", { fill: STEEL, second: BROWN }),
  anvil: entry("anvil", "object", { fill: "#3b3a38" }),
  "hunting-horn": entry("hunting horn", "object", { fill: WHITE, second: GOLD }),
  wheel: entry("wheel", "object", { fill: BROWN, second: GOLD }),
  horseshoe: entry("horseshoe", "object", { fill: "#3b3a38" }),
  sickle: entry("sickle", "object", { fill: STEEL, second: BROWN }),
  shovel: entry("shovel", "object", { fill: STEEL, second: BROWN }),
  fetterlock: entry("fetterlock", "object", { fill: "#3b3a38" }),
  key: entry("key", "object", { fill: GOLD }),
  buckle: entry("buckle", "object", { fill: GOLD }),
  scale: entry("pair of scales", "object", { fill: GOLD }, { plural: "pairs of scales" }),
  maunch: entry("maunch", "object", { fill: RED }, { plural: "maunches" }),
  harp: entry("harp", "object", { fill: GOLD, second: WHITE }),
  book: entry("book", "object", { fill: BROWN, second: WHITE }),
  spur: entry("spur", "object", { fill: GOLD }),
  helm: entry("helm", "object", { fill: STEEL, second: RED }),
  cup: entry("cup", "object", { fill: GOLD }),
  crown: entry("crown", "object", { fill: GOLD, second: RED }),
  gauntlet: entry("gauntlet", "object", { fill: STEEL }),
  hand: entry("hand", "object", { fill: SKIN }),
  arm: entry("arm", "object", { fill: SKIN, second: RED }),
  head: entry("man's head", "object", { fill: SKIN, second: BROWN }, { plural: "men's heads" }),
  skull: entry("skull", "object", { fill: WHITE }),
  anchor: entry("anchor", "object", { fill: "#3b3a38", second: BROWN }),
  lymphad: entry("lymphad", "object", { fill: BROWN, second: WHITE }),
  bell: entry("bell", "object", { fill: GOLD }),
  // plants and nature
  rose: entry("rose", "plant", { fill: RED, second: GREEN }),
  thistle: entry("thistle", "plant", { fill: "#7a3f8b", second: GREEN }),
  tree: entry("tree", "plant", { fill: GREEN, second: BROWN }),
  acorn: entry("acorn", "plant", { fill: BROWN, second: GREEN }),
  apple: entry("apple", "plant", { fill: RED, second: GREEN }),
  garb: entry("garb", "plant", { fill: GOLD, second: BROWN }),
  trefoil: entry("trefoil", "plant", { fill: GREEN }, { flat: true }),
  quatrefoil: entry("quatrefoil", "plant", { fill: GREEN }, { flat: true }),
  cinquefoil: entry("cinquefoil", "plant", { fill: GREEN }, { flat: true }),
  mountain: entry("mountain", "object", { fill: GREY, second: WHITE }),
  "shooting-star": entry("shooting star", "geometric", { fill: GOLD }, { flat: false }),
  fountain: entry("fountain", "geometric", { fill: WHITE, second: BLUE }),
  sun: entry("sun", "geometric", { fill: GOLD }, { flat: false }),
  moon: entry("moon", "geometric", { fill: WHITE }, { flat: false }),
  // buildings
  castle: entry("castle", "building", { fill: GREY, second: "#3b3a38" }),
  tower: entry("tower", "building", { fill: GREY, second: "#3b3a38" }),
  church: entry("church", "building", { fill: GREY, second: "#3b3a38" }, { plural: "churches" }),
  pavilion: entry("pavilion", "building", { fill: WHITE, second: RED }),
  walls: entry("wall", "building", { fill: GREY, second: "#3b3a38" }),
  bridge: entry("bridge", "building", { fill: GREY, second: BLUE }),
  gateworks: entry("gateway", "building", { fill: GREY, second: "#3b3a38" }),
  lighthouse: entry("lighthouse", "building", { fill: WHITE, second: GOLD }),
  // geometric
  cross: entry("cross", "geometric", { fill: GOLD }, { plural: "crosses" }),
  "cross-patee": entry("cross patée", "geometric", { fill: GOLD }, { plural: "crosses patée" }),
  "cross-maltese": entry("Maltese cross", "geometric", { fill: GOLD }, { plural: "Maltese crosses" }),
  "cross-moline": entry("cross moline", "geometric", { fill: GOLD }, { plural: "crosses moline" }),
  "cross-patonce": entry("cross patonce", "geometric", { fill: GOLD }, { plural: "crosses patonce" }),
  "cross-potent": entry("cross potent", "geometric", { fill: GOLD }, { plural: "crosses potent" }),
  "cross-flory": entry("cross flory", "geometric", { fill: GOLD }, { plural: "crosses flory" }),
  "cross-bottony": entry("cross bottony", "geometric", { fill: GOLD }, { plural: "crosses bottony" }),
  "cross-crosslet": entry("cross crosslet", "geometric", { fill: GOLD }, { plural: "crosses crosslet" }),
  crescent: entry("crescent", "geometric", { fill: GOLD }),
  increscent: entry("increscent", "geometric", { fill: GOLD }),
  decrescent: entry("decrescent", "geometric", { fill: GOLD }),
  estoile: entry("estoile", "geometric", { fill: GOLD }),
  mullet: entry("mullet", "geometric", { fill: GOLD }),
  "mullet-pierced": entry("mullet pierced", "geometric", { fill: GOLD }, { plural: "mullets pierced" }),
  "mullet-6": entry("mullet of six points", "geometric", { fill: GOLD }, { plural: "mullets of six points" }),
  "mullet-8": entry("mullet of eight points", "geometric", { fill: GOLD }, { plural: "mullets of eight points" }),
  lozenge: entry("lozenge", "geometric", { fill: GOLD }),
  rustre: entry("rustre", "geometric", { fill: GOLD }),
  mascle: entry("mascle", "geometric", { fill: GOLD }),
  roundel: entry("roundel", "geometric", { fill: GOLD }),
  annulet: entry("annulet", "geometric", { fill: GOLD }),
  "fleur-de-lis": entry("fleur-de-lis", "geometric", { fill: GOLD }, { plural: "fleurs-de-lis" }),
  heart: entry("heart", "geometric", { fill: RED }),
  billet: entry("billet", "geometric", { fill: GOLD }),
});

/** Every charge id. */
export const CHARGE_IDS = Object.freeze(Object.keys(CATALOGUE));

/** The catalogue entry, or a plain one for an unknown id. */
export function chargeInfo(id) {
  return CATALOGUE[id] ?? Object.freeze({ label: String(id).replace(/-/g, " "), kind: "object", proper: Object.freeze({ fill: GOLD }) });
}

/** The charge whose picture `id` is drawn with (itself when it has its own). */
export function drawnAs(id) {
  return CATALOGUE[id]?.drawnAs ?? id;
}

/** Whether proper for this charge means plain or/gules (geometric charges and ordinaries). */
export function isGeometric(id) {
  return chargeInfo(id).kind === "geometric";
}

/**
 * Whether a charge is a plain shape (a mullet, a cross, a trefoil), drawn
 * with no edge in the painted style as the rulebook does; geometric charges
 * are, unless their entry says `flat: false`.
 */
export function isFlat(id) {
  const info = chargeInfo(id);
  return info.flat ?? info.kind === "geometric";
}

/** A charge name, plural when `count` > 1, and the head alone when `head`. */
export function chargeLabel(id, { count = 1, head = false } = {}) {
  const info = chargeInfo(id);
  if (head && info.headLabel) {
    if (count > 1) return info.pluralHead ?? info.headLabel.replace(/'s head$/, "s' heads");
    return info.headLabel;
  }
  if (count > 1) return info.plural ?? `${info.label}s`;
  return info.label;
}
