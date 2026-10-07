/* eslint-disable no-bitwise -- a hash and a PRNG are bit twiddling by nature */
/**
 * rng.js - seeded dice for the generator, so a seed always gives the same
 * arms. `mulberry32` is a tiny, well-distributed 32-bit generator; seeds may
 * be numbers or strings (hashed).
 */

/** A 32-bit hash of a string (FNV-1a). */
export function hashString(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A seed as a 32-bit number: numbers as they are, anything else hashed. */
export function normaliseSeed(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) return seed >>> 0;
  if (seed === undefined || seed === null || seed === "") return (Math.random() * 0x100000000) >>> 0;
  return hashString(String(seed));
}

/**
 * Dice seeded from `seed`. `random()` is 0 <= x < 1, `d(n)` is 1..n, `roll(spec)`
 * takes "2d6+5", and `pick(list)` an element.
 * @param {number|string} [seed]
 */
export class Dice {
  constructor(seed) {
    this.seed = normaliseSeed(seed);
    this._state = this.seed;
  }

  random() {
    this._state = (this._state + 0x6d2b79f5) >>> 0;
    let t = this._state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** 1..sides. */
  d(sides) {
    return 1 + Math.floor(this.random() * sides);
  }

  /** "1d20", "2d6+5", "1d6-1". */
  roll(spec) {
    const m = (/^(\d+)d(\d+)([+-]\d+)?$/i).exec(String(spec).replace(/\s+/g, ""));
    if (!m) throw new Error(`Bad dice spec: ${spec}`);
    let total = Number(m[3] ?? 0);
    for (let i = 0; i < Number(m[1]); i++) total += this.d(Number(m[2]));
    return total;
  }

  pick(list) {
    return list[Math.floor(this.random() * list.length)];
  }
}

/**
 * Dice that give back a scripted list of results (for tests, and for
 * replaying the book's worked examples), then fall back to a seed.
 */
export class ScriptedDice extends Dice {
  constructor(results, seed = 1) {
    super(seed);
    this._script = [...results];
  }

  d(sides) {
    if (this._script.length) return Math.min(sides, this._script.shift());
    return super.d(sides);
  }
}
