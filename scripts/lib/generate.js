/**
 * generate.js - rolls a coat of arms the way Appendix B of the Pendragon
 * rulebook does: a shield design, tinctures by the rule of tincture, then
 * charges. The result is plain data (see `arms.js`) and a log of the rolls.
 */

import { Dice } from "./rng.js";
import { chargeLabel, isGeometric } from "./charges/catalogue.js";
import { fitPose } from "./charges/art.js";
import { isFur, isMetal, PROPER } from "./tinctures.js";
import {
  ATTITUDES, CHARGE_SUBTABLES, CHARGE_TABLE, DIVISIONS, DIVISION_DESIGNS, FUR_TABLE, GYRONNY_SECTORS, lookup,
  SHIELD_DESIGN, SINGLE_SUBTABLES, TINCTURE_TABLE, VARIATIONS,
} from "./tables.js";

/** The optional rules of Appendix B, all on unless turned off. */
export const DEFAULT_OPTIONS = Object.freeze({
  /** Italicised beasts show only their head on a 5+. */
  heads: true,
  /** On a 6, one more charge is rolled. */
  extraCharge: true,
  /** Quadrupeds roll for their attitude. */
  attitudes: true,
  /** An ordinary on a variation or fur may swap paint with it on a 5+. */
  swap: true,
});

/** A blank shield: a plain field with nothing on it. */
export function emptyArms() {
  return {
    version: 1,
    field: { tincture: "argent", division: null, variation: null },
    ordinary: null,
    charges: [],
    halves: null,
  };
}

class Generator {
  constructor(dice, options) {
    this.dice = dice;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.log = [];
  }

  note(step, text) {
    this.log.push({ step, text });
  }

  d(sides, step, what) {
    const n = this.dice.d(sides);
    if (step) this.note(step, `${what ?? `1d${sides}`} = ${n}`);
    return n;
  }

  // ── Step 1: the shield design ────────────────────────────────

  /**
   * A whole shield. `nested` is a half of a divided shield, which may not
   * divide again (the book: a rerolled division means a solid design).
   */
  shield({ nested = false } = {}) {
    const arms = emptyArms();
    const n = this.dice.d(20);
    const row = lookup(SHIELD_DESIGN, n);
    this.note("design", `Shield design: 1d20 = ${n}, ${describeDesign(row)}`);
    if (row.design === "division" && !nested) return this.division(arms);
    if (row.design === "division" || row.design === "variation") {
      if (nested) {
        this.note("design", "A division or variation on a half: solid, no charges");
        arms.field.tincture = this.fieldTincture("field");
        return arms;
      }
      return this.variation(arms);
    }
    arms.field.tincture = this.fieldTincture("field");
    this.apply(arms, row, this.ground(arms));
    return arms;
  }

  /** Step 1, 19-20: a divided field. */
  division(arms) {
    const n = this.dice.d(20);
    const row = lookup(DIVISIONS, n);
    this.note("division", `Division: 1d20 = ${n}, per ${row.type.replace("-", " ")}${row.countercharged ? " countercharged" : ""}`);
    const mod = row.type === "quarterly" || row.type === "saltire" ? -2 : 2;
    let design;
    for (;;) {
      const roll = this.dice.d(20) + mod;
      design = lookup(DIVISION_DESIGNS, roll);
      this.note("division", `Division design: 1d20 ${mod > 0 ? "+" : "-"} 2 = ${roll}, ${design.reroll ? "no result, roll again" : design.design}`);
      if (!design.reroll) break;
    }
    const a = this.fieldTincture("division", "First tincture");
    let b = this.fieldTincture("division", "Second tincture");
    while (b === a) b = this.fieldTincture("division", "Same tincture, rerolled");
    arms.field.tincture = a;
    arms.field.division = { type: row.type, tinctures: [a, b], design: row.countercharged ? "countercharged" : design.design };
    if (arms.field.division.design === "solid") return arms;
    if (arms.field.division.design === "separate") {
      this.note("division", "Separate: each half is its own shield");
      arms.halves = [this.shield({ nested: true }), this.shield({ nested: true })];
      return arms;
    }
    const again = this.dice.d(20);
    const second = lookup(SHIELD_DESIGN, again);
    this.note("design", `Shield design on the division: 1d20 = ${again}, ${describeDesign(second)}`);
    if (second.design === "division" || second.design === "variation") {
      this.note("design", "Rerolled: solid, no charges");
      return arms;
    }
    this.apply(arms, second, this.ground(arms));
    return arms;
  }

  /** Step 1, 16-18: a patterned field. */
  variation(arms) {
    const n = this.dice.d(20);
    const row = lookup(VARIATIONS, n);
    this.note("variation", `Variation: 1d20 = ${n}, ${row.type}`);
    const variation = { type: row.type, tinctures: [], count: row.count ?? null, charge: null };
    if (row.type === "gyronny") {
      const g = this.dice.d(6);
      variation.count = lookup(GYRONNY_SECTORS, g).count;
      this.note("variation", `Gyronny sectors: 1d6 = ${g}, ${variation.count}`);
    }
    if (row.type === "seme") {
      const charge = this.rollCharge({ columns: [5] });
      variation.charge = charge.id;
      this.note("variation", `Semé of ${charge.id}`);
    }
    let a = this.fieldTincture("variation", "Field tincture");
    while (isFur(a)) a = this.fieldTincture("variation", "Fur, rerolled");
    const b = this.chargeTincture({ ground: a, step: "variation", what: "Pattern tincture", geometric: true });
    variation.tinctures = [a, b];
    arms.field.tincture = a;
    arms.field.variation = variation;
    const again = this.dice.d(20);
    const second = lookup(SHIELD_DESIGN, again);
    this.note("design", `Shield design on the variation: 1d20 = ${again}, ${describeDesign(second)}`);
    if (second.design === "division" || second.design === "variation") {
      this.note("design", "Rerolled: a solid variation, no charges");
      return arms;
    }
    this.apply(arms, second, this.ground(arms));
    return arms;
  }

  /** What charges on this field are rolled against: a plain tincture, or "mixed" (fur, division, variation: 1d2 for the column). */
  ground(arms) {
    if (arms.field.division || arms.field.variation || isFur(arms.field.tincture)) return "mixed";
    return arms.field.tincture;
  }

  /** Puts a design row's contents on the shield. */
  apply(arms, row, ground) {
    switch (row.design) {
      case "charge":
        this.addCharge(arms, this.rollCharge({ columns: [1, 2, 3, 4, 5, 6] }), ground);
        break;
      case "minor":
        this.addCharge(arms, this.rollCharge({ columns: [5] }), ground, { minor: true });
        break;
      case "both":
        this.addCharge(arms, this.rollCharge({ columns: [1, 2, 3, 4, 5, 6] }), ground, { single: true });
        this.addCharge(arms, this.rollCharge({ columns: [5] }), ground, { minor: true });
        break;
      case "peripheral":
      case "ordinary": {
        const type = row.design === "peripheral" ? this.rollPeripheral() : this.rollOrdinary();
        this.addOrdinary(arms, type, ground);
        if (row.charged === "field") this.addCharge(arms, this.rollCharge({ columns: [1, 2, 3, 4, 5] }), ground);
        if (row.charged === "ordinary") this.chargeOrdinary(arms);
        break;
      }
      default:
        break;
    }
    if (this.options.extraCharge) {
      const n = this.dice.d(6);
      this.note("extra", `More charges? 1d6 = ${n}${n === 6 ? ", another charge" : ""}`);
      if (n === 6) this.addCharge(arms, this.rollCharge({ columns: [1, 2, 3, 4, 5] }), ground);
    }
  }

  // ── Step 2: tinctures ────────────────────────────────────────

  /** A field tincture from Table B.2, furs resolved. */
  fieldTincture(step, what = "Field tincture") {
    const n = this.dice.d(20);
    let tincture = lookup(TINCTURE_TABLE, n).field;
    if (tincture === "fur") {
      const f = this.dice.d(6);
      tincture = lookup(FUR_TABLE, f).fur;
      this.note(step, `${what}: 1d20 = ${n}, fur; 1d6 = ${f}, ${tincture}`);
    } else {
      this.note(step, `${what}: 1d20 = ${n}, ${tincture}`);
    }
    return tincture;
  }

  /**
   * A charge's tincture: the colour column on a metal ground, the metal
   * column on a colour, and 1d2 for the column on a fur or mixed ground.
   * Proper on a geometric charge or an ordinary reads as or (metal) or gules.
   */
  chargeTincture({ ground, step = "tincture", what = "Charge tincture", geometric = false }) {
    let column;
    let how;
    if (ground === "mixed" || isFur(ground)) {
      const c = this.dice.d(2);
      column = c === 1 ? "metal" : "colour";
      how = `1d2 = ${c}, ${column}`;
    } else if (isMetal(ground)) {
      column = "colour";
      how = "colour, on a metal";
    } else {
      column = "metal";
      how = "metal, on a colour";
    }
    const n = this.dice.d(20);
    let tincture = lookup(TINCTURE_TABLE, n)[column];
    let text = `${what}: ${how}; 1d20 = ${n}, ${tincture}`;
    if (tincture === PROPER && geometric) {
      tincture = column === "metal" ? "or" : "gules";
      text += ` (${tincture})`;
    }
    this.note(step, text);
    return tincture;
  }

  // ── Step 3: charges ──────────────────────────────────────────

  /**
   * A roll on Table B.3: 1d20 for the row and 1d6 (limited to `columns`,
   * rerolling others) for the column, then the sub-table or choice.
   * @returns {{ kind: "charge", id, head, attitude, quadruped, herbivore, single } | { kind: "ordinary", type }}
   */
  rollCharge({ columns }) {
    const row = this.dice.d(20);
    let col = this.dice.d(6);
    while (!columns.includes(col)) col = this.dice.d(6);
    const cell = CHARGE_TABLE[row - 1][col - 1];
    this.note("charge", `Charge: column 1d6 = ${col}, row 1d20 = ${row}`);
    return this.resolveCell(cell);
  }

  /** A cell of Table B.3 or a sub-table: a choice (1d2), a sub-table (1d6), an ordinary, or a charge. */
  resolveCell(cell, single = false) {
    if (Array.isArray(cell)) {
      const c = this.dice.d(2);
      this.note("charge", `Either: 1d2 = ${c}`);
      return this.resolveCell(cell[c - 1], single);
    }
    if (typeof cell === "string") return this.finishCharge({ id: cell }, single);
    if (cell.sub) {
      const s = this.dice.d(6);
      const sub = CHARGE_SUBTABLES[cell.sub];
      this.note("charge", `${cell.sub}: 1d6 = ${s}`);
      return this.resolveCell(sub[s - 1], single || SINGLE_SUBTABLES.includes(cell.sub));
    }
    if (cell.ordinary) {
      const type = Array.isArray(cell.ordinary) ? this.pickEither(cell.ordinary) : cell.ordinary;
      return { kind: "ordinary", type };
    }
    return this.finishCharge(cell, single);
  }

  pickEither(choices) {
    const c = this.dice.d(2);
    this.note("charge", `Either: 1d2 = ${c}, ${choices[c - 1]}`);
    return choices[c - 1];
  }

  /** The optional rules for a beast: head only, and a quadruped's attitude. */
  finishCharge(cell, single) {
    const charge = { kind: "charge", id: cell.id, head: false, attitude: cell.attitude ?? null, single };
    if (cell.head && this.options.heads) {
      const n = this.dice.d(6);
      charge.head = n >= 5;
      this.note("charge", `Head only? 1d6 = ${n}, ${charge.head ? "the head alone" : "the whole beast"}`);
    }
    if (cell.quadruped && this.options.attitudes && !charge.head) {
      const n = this.dice.d(6) + (cell.herbivore ? 1 : 0);
      charge.attitude = lookup(ATTITUDES, n).attitude;
      this.note("charge", `Attitude: 1d6${cell.herbivore ? " + 1" : ""} = ${n}, ${charge.attitude}`);
    }
    // keep to the poses there are pictures of
    const fitted = fitPose(charge.id, charge);
    if (fitted.changed === "head") this.note("charge", `There is no picture of the ${chargeLabel(charge.id)}'s head alone, so the whole beast is shown`);
    if (fitted.changed && fitted.attitude !== charge.attitude && !fitted.head) {
      this.note("charge", `There is no picture of the ${chargeLabel(charge.id)} ${charge.attitude ?? ""}, so it is shown ${fitted.attitude ?? "as drawn"}`.replace(/ {2,}/g, " "));
    }
    charge.head = fitted.head;
    charge.attitude = fitted.attitude;
    return charge;
  }

  /** The "Peripherals" row of Sub-table B.3.1. */
  rollPeripheral() {
    const n = this.dice.d(6);
    const cell = CHARGE_SUBTABLES.peripherals[n - 1];
    this.note("ordinary", `Peripheral ordinary: 1d6 = ${n}`);
    return Array.isArray(cell) ? this.pickEither(cell) : cell;
  }

  /** Column 6 of Table B.3. */
  rollOrdinary() {
    const row = this.dice.d(20);
    this.note("ordinary", `Ordinary: 1d20 = ${row}`);
    const cell = CHARGE_TABLE[row - 1][5];
    return Array.isArray(cell.ordinary) ? this.pickEither(cell.ordinary) : cell.ordinary;
  }

  /**
   * Adds a rolled charge (or the ordinary a charge roll turned up) to the
   * field. Charges come in groups of 1d3; minor charges in groups of 2d6.
   */
  addCharge(arms, rolled, ground, { minor = false, single = false } = {}) {
    if (rolled.kind === "ordinary") {
      if (arms.ordinary) {
        this.note("charge", `A second ordinary (${rolled.type}) is left out`);
        return;
      }
      this.addOrdinary(arms, rolled.type, ground);
      return;
    }
    const tincture = this.chargeTincture({ ground, geometric: isGeometric(rolled.id) });
    let count = 1;
    if (minor) {
      count = this.dice.roll("2d6");
      this.note("charge", `A group of 2d6 = ${count}`);
    } else if (!single && !rolled.single) {
      count = this.dice.d(3);
      this.note("charge", `How many? 1d3 = ${count}`);
    }
    arms.charges.push(group(rolled, tincture, count, minor));
  }

  /** An ordinary in a tincture rolled against the field (and the optional swap with a patterned field). */
  addOrdinary(arms, type, ground) {
    const tincture = this.chargeTincture({ ground, step: "ordinary", what: "Ordinary tincture", geometric: true });
    arms.ordinary = { type, tincture, charges: [], variation: null };
    const patterned = arms.field.variation || isFur(arms.field.tincture);
    if (patterned && this.options.swap && !arms.field.division) {
      const n = this.dice.d(6);
      this.note("ordinary", `Swap the pattern and the ordinary's tincture? 1d6 = ${n}${n >= 5 ? ", swapped" : ""}`);
      if (n >= 5) {
        if (arms.field.variation) {
          arms.ordinary.variation = arms.field.variation;
          arms.field.variation = null;
        } else {
          arms.ordinary.variation = { type: "fur", tinctures: [arms.field.tincture], count: null, charge: null };
        }
        arms.field.tincture = tincture;
        arms.ordinary.tincture = arms.ordinary.variation.tinctures[0];
      }
    }
  }

  /** A charge on the ordinary: columns 1-5, in a tincture rolled against the ordinary; 2d6+5 of them round a bordure. */
  chargeOrdinary(arms) {
    const ordinary = arms.ordinary;
    if (!ordinary) return;
    const bordure = ordinary.type === "bordure" || ordinary.type === "orle";
    const rolled = this.rollCharge({ columns: bordure ? [5] : [1, 2, 3, 4, 5] });
    if (rolled.kind !== "charge") return;
    const ground = ordinary.variation ? "mixed" : ordinary.tincture;
    const tincture = this.chargeTincture({ ground, what: "Charge on the ordinary", geometric: isGeometric(rolled.id) });
    let count = 1;
    if (bordure) {
      count = this.dice.roll("2d6+5");
      this.note("charge", `Round the bordure: 2d6 + 5 = ${count}`);
    } else if (!rolled.single) {
      count = this.dice.d(3);
      this.note("charge", `How many? 1d3 = ${count}`);
    }
    ordinary.charges.push(group(rolled, tincture, count, bordure));
  }
}

function group(rolled, tincture, count, minor) {
  return { type: rolled.id, tincture, count, head: rolled.head, attitude: rolled.attitude, minor };
}

function describeDesign(row) {
  const names = {
    charge: "a charge",
    minor: "a group of minor charges",
    both: "a charge and a group of minor charges",
    peripheral: "a peripheral ordinary",
    ordinary: "an ordinary",
    variation: "a variation",
    division: "a division",
  };
  let text = names[row.design];
  if (row.charged === "field") text += " and a charge on the field";
  if (row.charged === "ordinary") text += " with a charge on it";
  return text;
}

/**
 * Rolls a coat of arms.
 * @param {object} [options]
 * @param {number|string} [options.seed]  The same seed gives the same arms
 * @param {Dice} [options.dice]  Dice to roll with instead (tests, the book's examples)
 * @param {Partial<typeof DEFAULT_OPTIONS>} [options.rules]  The optional rules
 * @returns {{ arms: object, seed: number, log: {step: string, text: string}[] }}
 */
export function generateArms({ seed, dice, rules } = {}) {
  const d = dice ?? new Dice(seed);
  const generator = new Generator(d, rules);
  const arms = generator.shield();
  return { arms, seed: d.seed, log: generator.log };
}
