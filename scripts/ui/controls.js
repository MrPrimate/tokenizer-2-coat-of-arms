/**
 * controls.js - the Coat of Arms window's controls, in tabs: the roll, the
 * shield, the field, the ordinary and the charges, each chosen from a
 * gallery of pictures. The controls change the arms in place and tell the
 * host. `newState`, `rollInto`, `drawPreview` and `stateBlazon` are shared
 * with the editor's panel.
 */

import { CHARGE_TINCTURES, chargeAttitudes, chargeGroups, chargeHasHead, defaultAttitude, fieldPattern, fieldPatterns, newCharge, setFieldPattern, setFieldTincture, setOrdinary, ORDINARY_TYPES } from "../lib/arms.js";
import { chargeInfo } from "../lib/charges/catalogue.js";
import { DEFAULT_OPTIONS, generateArms } from "../lib/generate.js";
import { blazon } from "../lib/blazon.js";
import { renderArms } from "../lib/render/render.js";
import { CHARGE_STYLES, chargeStyle, DEFAULT_CHARGE_STYLE } from "../lib/charges/sketch.js";
import { SHAPES } from "../lib/render/shapes.js";
import { DAMASK_PATTERNS, damaskPattern, DEFAULT_DAMASK, NO_DAMASK } from "../lib/render/damask.js";
import { TINCTURES } from "../lib/tinctures.js";
import { VARIATIONS } from "../lib/tables.js";
import { drawArms, drawCharge, grid, select, swatches, tile } from "./gallery.js";
import { isPlaced, NUDGE_MAX, PLACE_IDS, PLACES, SCALE_MAX, SCALE_MIN } from "../lib/render/placement.js";

/** A localised string, or the key's last part outside Foundry. */
export function t(key, data) {
  const full = `TOKENIZER-2.COA.${key}`;
  if (globalThis.game?.i18n) return data ? game.i18n.format(full, data) : game.i18n.localize(full);
  return key;
}

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const KIND_LABELS = {
  beast: "Beasts", bird: "Birds", monster: "Monsters", creature: "Creatures", person: "People", object: "Objects",
  plant: "Plants", building: "Buildings", geometric: "Geometric", religious: "Religious",
};

const TABS = ["Roll", "Shield", "Field", "Ordinary", "Charges"];

/** The editing state the controls work on. */
export function newState(overrides = {}) {
  return {
    arms: null,
    seed: null,
    log: [],
    shape: "heater",
    /** The damask pattern over the paint (see DAMASK_PATTERNS), or "none". */
    damask: DEFAULT_DAMASK,
    /** How charges are drawn (see CHARGE_STYLES). */
    chargeStyle: DEFAULT_CHARGE_STYLE,
    rules: { ...DEFAULT_OPTIONS },
    /** What the window shows: the tab, and which charge's picker is open. */
    ui: { tab: "Field", picker: null, search: "" },
    ...overrides,
  };
}

/** Rolls new arms into the state (a given seed, or a fresh one). */
export function rollInto(state, seed) {
  const { arms, seed: used, log } = generateArms({ seed, rules: state.rules });
  state.arms = arms;
  state.seed = used;
  state.log = log;
  return state;
}

/**
 * The seed the Roll button rolls with: what is typed in the seed box (a
 * number when it is all digits), or none for new arms. The box starts with
 * the current seed, so left as it is it rolls new arms too.
 */
export function seedToRoll(typed, current) {
  const text = String(typed ?? "").trim();
  if (text === "" || text === String(current ?? "")) return undefined;
  return (/^\d+$/).test(text) ? Number(text) : text;
}

/** The render options a state asks for. */
export function renderOptions(state, extra = {}) {
  return { shape: state.shape, damask: state.damask, seed: state.seed ?? 7, chargeStyle: state.chargeStyle, ...extra };
}

/** How the state's charges are drawn, as chargeImage options. */
function lookOf(state) {
  return { style: state.chargeStyle };
}

/**
 * Takes the look of saved or imported data (a flag, a file) into a state,
 * keeping the state's own where the data has none.
 */
export function readLook(state, data) {
  state.shape = data?.shape ?? state.shape;
  state.damask = damaskPattern(data?.damask ?? state.damask);
  state.chargeStyle = chargeStyle(data?.chargeStyle ?? state.chargeStyle);
  return state;
}

/** Draws the state's arms into a preview canvas, at its own pixel size. */
export function drawPreview(canvas, state, size = 512) {
  if (!state.arms) return;
  canvas.width = size;
  canvas.height = size;
  const img = renderArms(state.arms, renderOptions(state, { size }));
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0);
}

/** The blazon of the state's arms. */
export function stateBlazon(state) {
  return state.arms ? blazon(state.arms) : "";
}

// ── DOM helpers ──────────────────────────────────────────────

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function number(value, min, max, onChange) {
  const node = el("input");
  node.type = "number";
  node.min = String(min);
  node.max = String(max);
  node.value = String(value);
  node.addEventListener("change", () => onChange(Math.max(min, Math.min(max, Math.round(Number(node.value) || min)))));
  return node;
}

function checkbox(label, checked, onChange) {
  const wrap = el("label", "tie-control__label tie-control__label--inline");
  const input = el("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  wrap.appendChild(input);
  wrap.appendChild(document.createTextNode(` ${label}`));
  return wrap;
}

function button(label, onClick, { primary = false, icon = null } = {}) {
  const node = el("button", `tie-btn ${primary ? "tie-btn--primary" : "tie-btn--ghost"}`);
  node.type = "button";
  if (icon) node.innerHTML = `<i class="${icon}"></i> `;
  node.appendChild(document.createTextNode(label));
  node.addEventListener("click", onClick);
  return node;
}

function row(label, ...controls) {
  const wrap = el("div", "tie-coa-row");
  if (label) wrap.appendChild(el("label", null, label));
  controls.forEach((c) => wrap.appendChild(c));
  return wrap;
}

function heading(text) {
  return el("label", "tie-control__label", text);
}

const FIELD_TINCTURES = Object.keys(TINCTURES).filter((id) => TINCTURES[id].kind !== "fur");

/** A plain copy of arms with the field alone, for pattern tiles. */
function fieldOnly(arms) {
  return { version: 1, field: JSON.parse(JSON.stringify(arms.field)), ordinary: null, charges: [], halves: null };
}

/**
 * Keeps a pattern tile readable: two metals or two colours together blur
 * at tile size, so the second tincture becomes a contrasting one.
 */
function contrastTile(sample) {
  const pattern = sample.field.division ?? sample.field.variation;
  if (!pattern) return;
  const [a, b] = pattern.tinctures;
  if (TINCTURES[a]?.kind !== TINCTURES[b]?.kind) return;
  pattern.tinctures[1] = TINCTURES[a]?.kind === "metal" ? "azure" : "argent";
}

function patternLabel(id) {
  const [kind, type] = id.split(":");
  if (kind === "plain") return t("Plain");
  if (kind === "fur") return TINCTURES[type].name;
  if (kind === "division") return type === "quarterly" ? "Quarterly" : `Per ${type.replace("-", " ")}`;
  return capitalise(type.replace("-", " "));
}

// ── Field ────────────────────────────────────────────────────

/** A label and a row of tincture swatches on one line. */
function tinctureRow(label, ids, value, onPick) {
  const wrap = el("div", "tie-coa-tincture-row");
  wrap.appendChild(el("label", null, label));
  wrap.appendChild(swatches(ids, value, onPick));
  return wrap;
}

/**
 * The field: its tinctures and options in `pinned` (kept in view), and the
 * gallery of patterns in `container`.
 */
function fieldSection(container, arms, state, host, pinned = container) {
  const { onChange } = host;
  const current = fieldPattern(arms.field);
  const pattern = arms.field.division ?? arms.field.variation;
  // the tinctures and options first, so they sit above the gallery
  if (pattern) {
    pinned.appendChild(tinctureRow(t("Tincture"), FIELD_TINCTURES, pattern.tinctures[0], (id) => {
      setFieldTincture(arms, 0, id);
      onChange({ rebuild: true });
    }));
    pinned.appendChild(tinctureRow(t("Tincture2"), FIELD_TINCTURES, pattern.tinctures[1], (id) => {
      setFieldTincture(arms, 1, id);
      onChange({ rebuild: true });
    }));
    const v = arms.field.variation;
    if (v && (VARIATIONS.find((r) => r.type === v.type)?.count || v.type === "gyronny")) {
      pinned.appendChild(row(t("Count"), number(v.count ?? 6, 2, 16, (n) => {
        v.count = n;
        onChange({});
      })));
    }
    if (arms.field.division) {
      const d = arms.field.division;
      pinned.appendChild(row(null, checkbox(t("Counterchanged"), d.design === "countercharged", (on) => {
        d.design = on ? "countercharged" : "overall";
        onChange({});
      })));
    }
  } else if (TINCTURES[arms.field.tincture]?.kind !== "fur") {
    pinned.appendChild(tinctureRow(t("Tincture"), FIELD_TINCTURES, arms.field.tincture, (id) => {
      setFieldTincture(arms, 0, id);
      onChange({ rebuild: true });
    }));
  } else {
    pinned.appendChild(el("p", "tie-hint", t("FurHint")));
  }
  const groups = [["plain", t("Plain")], ["fur", t("Furs")], ["division", t("Divisions")], ["variation", t("Variations")]];
  for (const [group, label] of groups) {
    const patterns = fieldPatterns().filter((p) => p.group === group);
    container.appendChild(heading(label));
    container.appendChild(grid(patterns.map((p) => {
      const sample = fieldOnly(arms);
      setFieldPattern(sample, p.id);
      contrastTile(sample);
      return tile({
        label: patternLabel(p.id),
        selected: p.id === current,
        size: 96,
        draw: drawArms(sample, state.shape),
        onPick: () => {
          setFieldPattern(arms, p.id);
          onChange({ rebuild: true });
        },
      });
    }), "tie-coa-grid--fields"));
  }
  // a semé's charge: a whole gallery, so it stays with the patterns
  if (arms.field.variation?.type === "seme") {
    const v = arms.field.variation;
    container.appendChild(heading(t("SemeCharge")));
    container.appendChild(chargePicker(v.charge ?? "cross", v.tinctures[1], state, (id) => {
      v.charge = id;
      onChange({ rebuild: true });
    }, { key: "seme" }));
  }
}

// ── Charges ──────────────────────────────────────────────────

/**
 * A gallery of every charge, by kind, with a search box. Opened under a
 * charge group (keyed so a rebuild keeps it open) or always shown.
 */
function chargePicker(value, tincture, state, onPick, { key }) {
  const box = el("div", "tie-coa-picker");
  const search = el("input", "tie-coa-search");
  search.type = "search";
  search.placeholder = t("SearchCharges");
  search.value = state.ui.search ?? "";
  box.appendChild(search);
  const list = el("div", "tie-coa-picker__list");
  box.appendChild(list);
  const groups = chargeGroups();
  const sections = groups.map(({ kind, ids }) => {
    const section = el("div", "tie-coa-kind");
    section.appendChild(el("div", "tie-coa-kind__heading", KIND_LABELS[kind] ?? capitalise(kind)));
    const tiles = ids.map((id) => tile({
      label: capitalise(chargeInfo(id).label),
      selected: id === value,
      size: 56,
      draw: drawCharge(id, tincture, lookOf(state)),
      onPick: () => {
        state.ui.picker = null;
        onPick(id);
      },
    }));
    tiles.forEach((tl, i) => {
      tl.dataset.id = ids[i];
    });
    section.appendChild(grid(tiles, "tie-coa-grid--charges"));
    list.appendChild(section);
    return section;
  });
  const filter = () => {
    const q = search.value.trim().toLowerCase();
    state.ui.search = search.value;
    for (const section of sections) {
      let shown = 0;
      for (const tl of section.querySelectorAll(".tie-coa-tile")) {
        const hit = !q || tl.textContent.toLowerCase().includes(q) || tl.dataset.id.includes(q);
        tl.hidden = !hit;
        if (hit) shown++;
      }
      section.hidden = shown === 0;
    }
  };
  search.addEventListener("input", filter);
  if (search.value) filter();
  box.dataset.key = key;
  return box;
}

/** One charge group: its picture and name, count, tincture, attitude, head. */
function chargeBlock(group, list, index, state, host, key) {
  const { onChange } = host;
  const block = el("div", "tie-coa-group");
  const head = el("div", "tie-coa-group__head");
  const open = state.ui.picker === key;
  const pick = tile({
    label: null,
    selected: open,
    size: 48,
    title: capitalise(chargeInfo(group.type).label),
    draw: drawCharge(group.type, group.tincture, { head: group.head, attitude: group.attitude, ...lookOf(state) }),
    onPick: () => {
      state.ui.picker = open ? null : key;
      state.ui.search = "";
      onChange({ rebuild: true });
    },
  });
  head.appendChild(pick);
  const name = el("button", "tie-btn tie-btn--ghost tie-coa-group__name");
  name.type = "button";
  name.innerHTML = `${capitalise(chargeInfo(group.type).label)} <i class="fa-solid fa-caret-${open ? "up" : "down"}"></i>`;
  name.addEventListener("click", () => pick.click());
  head.appendChild(name);
  head.appendChild(number(group.count, 1, 20, (n) => {
    group.count = n;
    onChange({});
  }));
  const remove = button("", () => {
    list.splice(index, 1);
    state.ui.picker = null;
    onChange({ rebuild: true });
  }, { icon: "fa-solid fa-xmark" });
  remove.title = t("Remove");
  head.appendChild(remove);
  block.appendChild(head);
  if (open) {
    block.appendChild(chargePicker(group.type, group.tincture, state, (id) => {
      group.type = id;
      group.attitude = defaultAttitude(id);
      if (!chargeHasHead(id)) group.head = false;
      onChange({ rebuild: true });
    }, { key }));
  }
  block.appendChild(swatches(CHARGE_TINCTURES, group.tincture, (id) => {
    group.tincture = id;
    onChange({ rebuild: true });
  }));
  const shown = chargeAttitudes(group.type);
  if (shown.length > 1 && !group.head) {
    const attitudes = grid(shown.map((a) => tile({
      label: t(`Attitude${capitalise(a)}`),
      selected: (group.attitude ?? defaultAttitude(group.type)) === a,
      size: 48,
      draw: drawCharge(group.type, group.tincture, { attitude: a, ...lookOf(state) }),
      onPick: (b) => {
        group.attitude = a;
        select(attitudes, b);
        onChange({});
      },
    })), "tie-coa-grid--attitudes");
    block.appendChild(attitudes);
  }
  if (chargeHasHead(group.type)) {
    block.appendChild(row(null, checkbox(t("HeadOnly"), group.head, (on) => {
      group.head = on;
      onChange({ rebuild: true });
    })));
  }
  // charges on an ordinary keep to it: size and nudge only
  block.appendChild(placementSection(group, state, host, key, { allowPlace: !(/(^|:)ordinary:/).test(key) }));
  return block;
}

/** A range slider with its value shown, `format` turning the value into text. */
function slider(label, value, { min, max, step, format }, onInput) {
  const wrap = el("div", "tie-coa-slider");
  const text = el("label", null, label);
  const shown = el("span", "tie-coa-slider__value", format(value));
  const input = el("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener("input", () => {
    const v = Number(input.value);
    shown.textContent = format(v);
    onInput(v);
  });
  wrap.appendChild(text);
  wrap.appendChild(input);
  wrap.appendChild(shown);
  return wrap;
}

/** A group's size, position (one of the shield's nine points, or as rolled) and nudge. */
function placementSection(group, state, host, key, { allowPlace }) {
  const { onChange } = host;
  state.ui.placeOpen ??= {};
  const details = el("details", "tie-coa-placement");
  details.open = state.ui.placeOpen[key] ?? isPlaced(group);
  details.addEventListener("toggle", () => {
    state.ui.placeOpen[key] = details.open;
  });
  details.appendChild(el("summary", null, t(allowPlace ? "SizeAndPosition" : "SizeAndNudge")));
  if (allowPlace) {
    const line = el("div", "tie-coa-place-line");
    line.appendChild(el("label", null, t("Position")));
    const points = el("div", "tie-coa-places");
    for (const id of PLACE_IDS) {
      const b = el("button", `tie-coa-place${group.place === id ? " is-selected" : ""}`);
      b.type = "button";
      b.title = t(`Place.${id}`);
      b.setAttribute("aria-label", b.title);
      b.addEventListener("click", () => {
        group.place = id;
        onChange({ rebuild: true });
      });
      points.appendChild(b);
    }
    line.appendChild(points);
    const rolled = button(t("AsRolled"), () => {
      delete group.place;
      onChange({ rebuild: true });
    });
    if (!group.place) rolled.classList.add("is-selected");
    line.appendChild(rolled);
    details.appendChild(line);
    if (group.place) details.appendChild(el("p", "tie-hint", PLACES[group.place].words));
  }
  details.appendChild(slider(t("Size"), group.scale ?? 1, { min: SCALE_MIN, max: SCALE_MAX, step: 0.05, format: (v) => `${Math.round(v * 100)}%` }, (v) => {
    if (v === 1) delete group.scale;
    else group.scale = v;
    onChange({});
  }));
  const nudge = (axis) => (v) => {
    group.offset = { x: group.offset?.x ?? 0, y: group.offset?.y ?? 0, [axis]: v };
    if (!group.offset.x && !group.offset.y) delete group.offset;
    onChange({});
  };
  const signed = (v) => (v > 0 ? `+${v}` : String(v));
  details.appendChild(slider(t("NudgeAcross"), group.offset?.x ?? 0, { min: -NUDGE_MAX, max: NUDGE_MAX, step: 1, format: signed }, nudge("x")));
  details.appendChild(slider(t("NudgeDown"), group.offset?.y ?? 0, { min: -NUDGE_MAX, max: NUDGE_MAX, step: 1, format: signed }, nudge("y")));
  details.appendChild(button(t("ResetPlacement"), () => {
    delete group.place;
    delete group.scale;
    delete group.offset;
    onChange({ rebuild: true });
  }, { icon: "fa-solid fa-rotate-left" }));
  return details;
}

function chargesSection(container, list, label, state, host, prefix) {
  if (label) container.appendChild(heading(label));
  list.forEach((group, i) => container.appendChild(chargeBlock(group, list, i, state, host, `${prefix}:${i}`)));
  container.appendChild(button(t("AddCharge"), () => {
    list.push(newCharge("mullet", list[0]?.tincture ?? "or"));
    state.ui.picker = `${prefix}:${list.length - 1}`;
    state.ui.search = "";
    host.onChange({ rebuild: true });
  }, { icon: "fa-solid fa-plus" }));
}

// ── Ordinary ─────────────────────────────────────────────────

function ordinarySection(container, arms, state, host, prefix) {
  const { onChange } = host;
  const current = arms.ordinary?.type ?? "";
  const sample = (type) => {
    const copy = fieldOnly(arms);
    if (type) copy.ordinary = { type, tincture: arms.ordinary?.tincture ?? (TINCTURES[arms.field.tincture]?.kind === "metal" ? "gules" : "or"), charges: [], variation: null };
    return copy;
  };
  container.appendChild(heading(t("Ordinary")));
  container.appendChild(grid([
    tile({ label: t("None"), selected: current === "", size: 80, draw: drawArms(sample(""), state.shape), onPick: () => {
      setOrdinary(arms, null);
      onChange({ rebuild: true });
    } }),
    ...ORDINARY_TYPES.map((type) => tile({
      label: capitalise(type.replace("-", " ")),
      selected: current === type,
      size: 80,
      draw: drawArms(sample(type), state.shape),
      onPick: () => {
        setOrdinary(arms, type);
        onChange({ rebuild: true });
      },
    })),
  ]));
  if (!arms.ordinary) return;
  const ordinary = arms.ordinary;
  if (ordinary.variation) {
    container.appendChild(row(null, button(t("PlainTincture"), () => {
      ordinary.variation = null;
      onChange({ rebuild: true });
    })));
  } else {
    container.appendChild(heading(t("Tincture")));
    container.appendChild(swatches(FIELD_TINCTURES, ordinary.tincture, (id) => {
      ordinary.tincture = id;
      onChange({ rebuild: true });
    }));
  }
  chargesSection(container, ordinary.charges, t("ChargesOnOrdinary"), state, host, `${prefix}ordinary`);
}

// ── Tabs ─────────────────────────────────────────────────────

function rollTab(container, state, host) {
  const { onChange } = host;
  const seedInput = el("input");
  seedInput.type = "text";
  seedInput.placeholder = t("SeedHint");
  seedInput.value = state.seed ?? "";
  const roll = button(t("Roll"), () => {
    rollInto(state, seedToRoll(seedInput.value, state.seed));
    state.ui.picker = null;
    onChange({ rebuild: true });
  }, { primary: true, icon: "fa-solid fa-dice" });
  container.appendChild(row(t("Seed"), seedInput, roll));
  container.appendChild(el("p", "tie-hint", t("SeedHint")));
  container.appendChild(heading(t("OptionalRules")));
  for (const [key, label] of [["heads", "RuleHeads"], ["extraCharge", "RuleExtra"], ["attitudes", "RuleAttitudes"], ["swap", "RuleSwap"]]) {
    container.appendChild(row(null, checkbox(t(label), state.rules[key], (on) => {
      state.rules[key] = on;
    })));
  }
  if (state.log?.length) {
    container.appendChild(heading(t("Rolls")));
    const list = el("ol", "tie-coa-rolls");
    state.log.forEach((entry) => list.appendChild(el("li", null, entry.text)));
    container.appendChild(list);
  }
}

/** A plain shield, for the damask tiles. */
const DAMASK_SAMPLE = Object.freeze({ version: 1, field: { tincture: "azure", division: null, variation: null }, ordinary: null, charges: [], halves: null });

/**
 * A damask tile: a close look at the middle of a plain field, the pattern
 * drawn stronger than on a shield, so the faint lines can be told apart at
 * tile size.
 */
function drawDamask(id, seed) {
  const ZOOM = 4;
  return (ctx, size) => {
    const big = renderArms(DAMASK_SAMPLE, { size: size * ZOOM, shape: "square", damask: id, damaskStrength: 3, shade: false, outline: false, seed });
    const from = (size * (ZOOM - 1)) / 2;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(big, from, from, size, size, 0, 0, size, size);
  };
}

function shieldTab(container, state, host) {
  const { onChange } = host;
  container.appendChild(heading(t("Shape")));
  const shapes = grid(Object.values(SHAPES).map((s) => tile({
    label: t(`Shape${capitalise(s.id)}`),
    selected: s.id === state.shape,
    size: 72,
    draw: drawArms(state.arms, s.id),
    onPick: (b) => {
      state.shape = s.id;
      select(shapes, b);
      onChange({});
    },
  })));
  container.appendChild(shapes);
  container.appendChild(heading(t("Damask")));
  const current = damaskPattern(state.damask);
  const patterns = grid([...DAMASK_PATTERNS, NO_DAMASK].map((id) => tile({
    label: t(`Damask${capitalise(id)}`),
    selected: id === current,
    size: 72,
    draw: drawDamask(id, state.seed ?? 7),
    onPick: (b) => {
      state.damask = id;
      select(patterns, b);
      onChange({});
    },
  })));
  container.appendChild(patterns);
}


/** A lion on a plain field, for the charge style tiles. */
const LOOK_SAMPLE = Object.freeze({
  version: 1, field: { tincture: "azure", division: null, variation: null }, ordinary: null, halves: null,
  charges: [{ type: "lion", tincture: "or", count: 1, head: false, attitude: "rampant", minor: false }],
});

/** The charge style tiles. */
function chargeLookSection(container, state, host) {
  const { onChange } = host;
  const sample = (style) => (ctx, size) => {
    const img = renderArms(LOOK_SAMPLE, { size, shape: state.shape, damask: false, shade: false, chargeStyle: style });
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0);
  };
  container.appendChild(heading(t("ChargeStyle")));
  const styles = grid(CHARGE_STYLES.map((style) => tile({
    label: t(`ChargeStyle${capitalise(style)}`),
    title: t(`ChargeStyle${capitalise(style)}Hint`),
    selected: chargeStyle(state.chargeStyle) === style,
    size: 88,
    draw: sample(style),
    onPick: () => {
      state.chargeStyle = style;
      onChange({ rebuild: true });
    },
  })));
  container.appendChild(styles);
}

/** A whole coat's field, ordinary and charges stacked (for the halves of a divided shield). */
function coatStack(container, arms, state, host, prefix) {
  fieldSection(container, arms, state, host);
  ordinarySection(container, arms, state, host, prefix);
  chargesSection(container, arms.charges, t("Charges"), state, host, `${prefix}field`);
}

function halvesNote(container, arms, state, host, build) {
  container.appendChild(el("p", "tie-hint", t("DividedHalves")));
  arms.halves.forEach((half, i) => {
    const details = el("details");
    details.open = true;
    details.appendChild(el("summary", null, t(i ? "SecondHalf" : "FirstHalf")));
    build(details, half, state, host, `half${i}:`);
    container.appendChild(details);
  });
}

/**
 * Builds the controls into `container`: a tab bar and the active tab's pane.
 * @param {HTMLElement} container
 * @param {object} state  From {@link newState}
 * @param {object} host
 * @param {(change: { rebuild?: boolean }) => void} host.onChange  After any edit
 */
export function buildControls(container, state, host) {
  if (!state.arms) rollInto(state);
  state.ui ??= { tab: "Field", picker: null, search: "" };
  const { onChange } = host;
  const tabs = el("nav", "tie-coa-tabs");
  for (const name of TABS) {
    const b = el("button", `tie-coa-tabs__tab${state.ui.tab === name ? " is-active" : ""}`, t(`Tab${name}`));
    b.type = "button";
    b.addEventListener("click", () => {
      state.ui.tab = name;
      state.ui.picker = null;
      onChange({ rebuild: true });
    });
    tabs.appendChild(b);
  }
  container.appendChild(tabs);
  const pane = el("div", "tie-coa-pane");
  container.appendChild(pane);
  const arms = state.arms;
  // the element that scrolls: the gallery when the tab pins its options
  let scroller = pane;
  switch (state.ui.tab) {
    case "Roll":
      rollTab(pane, state, host);
      break;
    case "Shield":
      shieldTab(pane, state, host);
      break;
    case "Field": {
      // the tinctures stay in view above the gallery of patterns
      pane.classList.add("tie-coa-pane--split");
      const pinned = el("div", "tie-coa-pinned");
      scroller = el("div", "tie-coa-scroll");
      pane.appendChild(pinned);
      pane.appendChild(scroller);
      fieldSection(scroller, arms, state, host, pinned);
      if (arms.halves) halvesNote(scroller, arms, state, host, coatStack);
      break;
    }
    case "Ordinary":
      if (arms.halves) halvesNote(pane, arms, state, host, (c, half, s, h, p) => ordinarySection(c, half, s, h, p));
      else ordinarySection(pane, arms, state, host, "");
      break;
    case "Charges":
      if (arms.halves) halvesNote(pane, arms, state, host, (c, half, s, h, p) => chargesSection(c, half.charges, t("Charges"), s, h, `${p}field`));
      else chargesSection(pane, arms.charges, t("Charges"), state, host, "field");
      // how every charge is drawn
      chargeLookSection(pane, state, host);
      break;
    default:
      break;
  }
  // keep each tab's place in its list when the controls are rebuilt
  state.ui.scroll ??= {};
  const tab = state.ui.tab;
  scroller.addEventListener("scroll", () => {
    state.ui.scroll[tab] = scroller.scrollTop;
  }, { passive: true });
  const top = state.ui.scroll[tab] ?? 0;
  if (top) {
    scroller.scrollTop = top;
    globalThis.requestAnimationFrame?.(() => {
      scroller.scrollTop = top;
    });
  }
}
