/**
 * crosses.js - the crosses: plain, patée, crosslet, and the "more
 * crosses" of Sub-table B.3.1 (Maltese, moline, patonce, potent, flory,
 * bottony). Plain shapes: their outline is the whole drawing.
 */

import { bezier } from "./sketch.js";

const C = 50;

/** A plain cross with arms `w` wide reaching `r` from the centre. */
function plain(s, w = 20, r = 48) {
  s.rect(C - (w / 2), C - r, w, r * 2);
  s.rect(C - r, C - (w / 2), r * 2, w);
}

/** Draws `arm(s)` four times, turned about the centre (the arm is drawn pointing up). */
function fourfold(s, arm) {
  for (let k = 0; k < 4; k++) s.at(C, C, 1, k * 90, arm);
}

/** One end of a cross flory: a pointed tip between two leaves curling back. */
function floryEnd(t) {
  t.part("M45 26 L 45 13 C 45.5 9 48 5 50 1 C 52 5 54.5 9 55 13 L 55 26 Z");
  for (const flip of [false, true]) {
    const draw = (u) => u.part("M48 26 C 41 26 34 25 29.5 21 C 25 17 24.5 10 28.5 6.5 C 32.5 3 39.5 4.5 40 9.5 C 40.5 13 37 15 34.5 13 C 35 16 38.5 18.5 43 18.5 C 45 18.5 47 18 48 17.5 Z");
    if (flip) t.mirrored(draw);
    else draw(t);
  }
}

export const CROSSES = Object.freeze({
  cross: (s) => plain(s, 22, 48),
  "cross-patee": (s) => {
    // arms narrow at the centre, flaring on curved sides to broad ends
    s.rect(42, 42, 16, 16);
    fourfold(s, (t) => t.part("M42 44 C 44 30 38 16 24 3 L 76 3 C 62 16 56 30 58 44 Z"));
  },
  "cross-crosslet": (s) => {
    // a slender cross, each arm crossed near its end
    plain(s, 12, 48);
    fourfold(s, (t) => t.rect(36, 13, 28, 12));
  },
  "cross-maltese": (s) => {
    // four arrowheads meeting at their points, each end notched deep
    fourfold(s, (t) => t.poly([[50, 50], [45, 44], [24, 3], [50, 15], [76, 3], [55, 44]]));
  },
  "cross-moline": (s) => {
    // each arm splits into two hooks curling outward and back, like a millrind
    plain(s, 15, 34);
    fourfold(s, (t) => {
      for (const flip of [false, true]) {
        const hook = (u) => u.taper(bezier([50, 22], [47, 6], [33, 1], [27, 10], 14), [12, 9.5, 7.5, 6.5], 6.5);
        if (flip) t.mirrored(hook);
        else hook(t);
      }
    });
  },
  "cross-patonce": (s) => {
    // arms flaring on curved sides into ends of three points
    s.rect(43, 43, 14, 14);
    fourfold(s, (t) => t.part("M44 46 C 46 34 42 24 32 18 C 28 16 25 13 22 8 C 31 9 38 11 42 14 C 44 10 47 6 50 1 C 53 6 56 10 58 14 C 62 11 69 9 78 8 C 75 13 72 16 68 18 C 58 24 54 34 56 46 Z"));
  },
  "cross-potent": (s) => {
    plain(s, 16, 44);
    fourfold(s, (t) => t.rect(28, 4, 44, 14));
  },
  "cross-flory": (s) => {
    // a slender cross whose ends flower into a point and two curling leaves
    plain(s, 11, 36);
    // the end is drawn smaller, keeping its point at the top of the box
    fourfold(s, (t) => t.at(50, 1 + (0.72 * 49), 0.72, 0, floryEnd));
  },
  "cross-bottony": (s) => {
    // each arm ends in three round buds, like a trefoil
    plain(s, 14, 40);
    fourfold(s, (t) => {
      t.circle(50, 10, 8.5);
      t.circle(40.5, 19, 7.5);
      t.circle(59.5, 19, 7.5);
    });
  },
});
