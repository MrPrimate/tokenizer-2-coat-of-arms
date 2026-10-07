/**
 * tint.js - recolouring a charge picture from its file. The pictures are
 * drawn as light paint with dark lines (a white or coloured body and black
 * outlines), so each pixel's brightness says how much of it is paint and
 * how much is line. The brightness is measured against the picture's main
 * paint, then mapped between the ink and the charge's tincture, which keeps
 * the lines, their anti-aliasing and any shading.
 *
 * Pure functions over RGBA pixel arrays (ImageData.data), so they run the
 * same in the browser and in tests.
 */

/** Relative luminance (0 to 1) of an sRGB colour given as bytes. */
export function luminance(r, g, b) {
  return ((0.2126 * r) + (0.7152 * g) + (0.0722 * b)) / 255;
}

/** "#rrggbb" as [r, g, b] bytes. */
export function hexBytes(hex) {
  const m = (/^#?([0-9a-f]{6})$/i).exec(String(hex ?? ""));
  if (!m) return [0, 0, 0];
  return [0, 2, 4].map((k) => parseInt(m[1].slice(k, k + 2), 16));
}

const BINS = 32;
/** Below this the picture is a dark silhouette rather than paint and lines. */
const SILHOUETTE = 0.18;

/** Whether a picture with this paint brightness (see paintLevel) is a dark silhouette. */
export function isSilhouette(level) {
  return level < SILHOUETTE;
}

/**
 * The brightness of a picture's main paint: the commonest brightness among
 * its solid pixels, leaving out the dark lines. A picture that is almost all
 * dark (a black silhouette) gives 0.
 * @param {Uint8ClampedArray} data  RGBA
 * @returns {number}
 */
export function paintLevel(data) {
  const counts = new Array(BINS).fill(0);
  const sums = new Array(BINS).fill(0);
  let solid = 0;
  let dark = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    solid++;
    const l = luminance(data[i], data[i + 1], data[i + 2]);
    if (l < 0.25) {
      dark++;
      continue;
    }
    const bin = Math.min(BINS - 1, Math.floor(l * BINS));
    counts[bin]++;
    sums[bin] += l;
  }
  if (!solid || (solid - dark) < solid * 0.08) return 0;
  let best = 0;
  for (let b = 1; b < BINS; b++) if (counts[b] > counts[best]) best = b;
  return counts[best] ? sums[best] / counts[best] : 0;
}

/**
 * Recolours a picture's pixels in place.
 * - painted: lines in `ink`, paint in `paint`, the shades between mixed
 * - silhouette: everything solid in `paint`
 * - line: the lines in `paint`, the paint cut away (the field shows through)
 * A dark silhouette picture (no paint of its own) is filled with `paint`
 * whatever the style, except line, which draws its edge only.
 * @param {Uint8ClampedArray} data  RGBA
 * @param {object} options
 * @param {number[]} options.paint  [r, g, b]
 * @param {number[]} options.ink  [r, g, b]
 * @param {string} [options.style]  painted | outlined | silhouette | line
 * @param {number} [options.level]  The paint's brightness (see paintLevel), worked out when absent
 * @returns {Uint8ClampedArray}
 */
export function tintPixels(data, { paint, ink, style = "painted", level }) {
  const ref = level ?? paintLevel(data);
  const silhouette = ref < SILHOUETTE;
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    const t = silhouette ? 1 : Math.min(1, luminance(data[i], data[i + 1], data[i + 2]) / ref);
    if (style === "silhouette" || (silhouette && style !== "line")) {
      data[i] = paint[0];
      data[i + 1] = paint[1];
      data[i + 2] = paint[2];
    } else if (style === "line") {
      data[i] = paint[0];
      data[i + 1] = paint[1];
      data[i + 2] = paint[2];
      // a silhouette keeps its alpha as the shape; lines are where the picture is dark
      if (!silhouette) data[i + 3] = Math.round(data[i + 3] * (1 - t));
    } else {
      data[i] = ink[0] + ((paint[0] - ink[0]) * t);
      data[i + 1] = ink[1] + ((paint[1] - ink[1]) * t);
      data[i + 2] = ink[2] + ((paint[2] - ink[2]) * t);
    }
  }
  return data;
}

/**
 * The bounding box of a picture's solid pixels, as fractions of its size:
 * [left, top, right, bottom]; the whole picture when nothing is solid.
 * @param {Uint8ClampedArray} data  RGBA
 * @param {number} width
 * @param {number} height
 */
export function solidBox(data, width, height) {
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(((y * width) + x) * 4) + 3] < 16) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return [0, 0, 1, 1];
  return [x0 / width, y0 / height, (x1 + 1) / width, (y1 + 1) / height];
}
