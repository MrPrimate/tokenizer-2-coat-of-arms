/**
 * Tokenizer 2 - Coat of Arms (entry point).
 *
 * Registers the Coat of Arms tool with Tokenizer 2, the module's settings,
 * the click on a Pendragon sheet's coat of arms that opens the generator
 * window, and the module's API.
 */

import { CoatOfArmsTool } from "./CoatOfArmsTool.js";
import { renderPanel } from "./panel.js";
import { isArmsLayer, MODULE_ID } from "./layer.js";
import { generateArms } from "./lib/generate.js";
import { blazon } from "./lib/blazon.js";
import { normaliseArms } from "./lib/arms.js";
import { renderArms } from "./lib/render/render.js";
import { CHARGE_IDS } from "./lib/charges/catalogue.js";
import { TINCTURES } from "./lib/tinctures.js";
import { SHAPE_IDS } from "./lib/render/shapes.js";
import { CHARGE_STYLES, DEFAULT_CHARGE_STYLE } from "./lib/charges/sketch.js";
import { DAMASK_PATTERNS, DEFAULT_DAMASK, NO_DAMASK } from "./lib/render/damask.js";
import { ensureArt, moduleUrl } from "./art-loader.js";
import { registerArmsRequest } from "./gm-request.js";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "folder", {
    name: "TOKENIZER-2.COA.Settings.FolderName",
    hint: "TOKENIZER-2.COA.Settings.FolderHint",
    scope: "world",
    config: true,
    type: String,
    default: "tokenizer/coat-of-arms",
  });
  game.settings.register(MODULE_ID, "sheet-click", {
    name: "TOKENIZER-2.COA.Settings.SheetClickName",
    hint: "TOKENIZER-2.COA.Settings.SheetClickHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
  game.settings.register(MODULE_ID, "default-shape", {
    name: "TOKENIZER-2.COA.Settings.ShapeName",
    scope: "client",
    config: true,
    type: String,
    choices: {
      heater: "TOKENIZER-2.COA.ShapeHeater",
      round: "TOKENIZER-2.COA.ShapeRound",
      square: "TOKENIZER-2.COA.ShapeSquare",
      lozenge: "TOKENIZER-2.COA.ShapeLozenge",
    },
    default: "heater",
  });
  game.settings.register(MODULE_ID, "damask-pattern", {
    name: "TOKENIZER-2.COA.Settings.DamaskName",
    hint: "TOKENIZER-2.COA.Settings.DamaskHint",
    scope: "client",
    config: true,
    type: String,
    choices: Object.fromEntries([...DAMASK_PATTERNS, NO_DAMASK].map((d) => [d, `TOKENIZER-2.COA.Damask${d.charAt(0).toUpperCase()}${d.slice(1)}`])),
    default: DEFAULT_DAMASK,
  });
  game.settings.register(MODULE_ID, "charge-style", {
    name: "TOKENIZER-2.COA.Settings.ChargeStyleName",
    hint: "TOKENIZER-2.COA.Settings.ChargeStyleHint",
    scope: "client",
    config: true,
    type: String,
    choices: Object.fromEntries(CHARGE_STYLES.map((s) => [s, `TOKENIZER-2.COA.ChargeStyle${s.charAt(0).toUpperCase()}${s.slice(1)}`])),
    default: DEFAULT_CHARGE_STYLE,
  });
  game.settings.register(MODULE_ID, "export-size", {
    name: "TOKENIZER-2.COA.Settings.ExportSizeName",
    hint: "TOKENIZER-2.COA.Settings.ExportSizeHint",
    scope: "world",
    config: true,
    type: Number,
    choices: { 512: "512", 1024: "1024", 2048: "2048" },
    default: 1024,
  });
});

Hooks.once("tokenizer-2.registerPlugins", (registry) => {
  registry.register({
    id: "coat-of-arms",
    moduleId: MODULE_ID,
    name: "Coat of Arms",
    description: "Rolls coats of arms the way the Pendragon rulebook does, and puts them on tokens.",
    version: "1.0.0",
    author: "MrPrimate",
    // 1.2: a list of licence entries, layer menu entries
    requires: "1.2",
    license: [
      {
        name: "Coat of Arms: charge pictures",
        text: "Heraldic drawings from Wikimedia Commons, recoloured when drawn: public domain plates from A. C. Fox-Davies' A Complete Guide to Heraldry (1909), J. Vinycomb's Fictitious and Symbolic Creatures in Art (1906) and older armorials, and public domain, CC0 and CC BY drawings by Commons contributors. Each file's author, licence and source is listed in the credits.",
        url: moduleUrl("art/charges/CREDITS.md"),
      },
      {
        name: "Coat of Arms: charge pictures (CC BY-SA)",
        text: "Heraldic drawings from Wikimedia Commons under CC BY-SA licences, kept in their own folder and recoloured when drawn. A coat of arms drawn with one of them is an adaptation of it and is shared under the same licence. Each file's author, licence and source is listed in the credits.",
        url: moduleUrl("art/charges-by-sa/CREDITS.md"),
      },
      {
        name: "Coat of Arms: damask patterns",
        text: "The faint patterns over a shield's paint, each one repeat of a drawing from Wikimedia Commons: two heraldic diapers by Bibar (CC0) and a Byzantine brocade from the Encyclopaedia Britannica (1911, public domain).",
        url: moduleUrl("art/damask/CREDITS.md"),
      },
    ],
    tools: [{
      id: "coat-of-arms",
      icon: "fa-solid fa-shield-halved",
      tooltip: "TOKENIZER-2.COA.ToolTooltip",
      toolClass: CoatOfArmsTool,
      panel: renderPanel,
    }],
    // a coat of arms layer reopens in the window from its right-click menu
    layerMenu: [{
      id: "edit-coat-of-arms",
      label: "TOKENIZER-2.COA.EditLayer",
      icon: "fa-solid fa-shield-halved",
      visible: (layer, editor) => isArmsLayer(editor, layer),
      onClick: (layer, editor) => editor.activateTool("coat-of-arms", { layerId: layer.id }),
    }],
    hooks: {},
  });
});

/** Opens the generator from the coat of arms on a Pendragon sheet (Shift+click keeps the file picker). */
function onRenderSheet(app, html) {
  const actor = app?.actor ?? app?.document;
  if (!actor || typeof actor.system?.coatOfArms !== "string") return;
  if (!game.settings.get(MODULE_ID, "sheet-click")) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const image = root?.querySelector?.('[data-edit="system.coatOfArms"]');
  if (!image || image.dataset.coaBound) return;
  image.dataset.coaBound = "1";
  image.title = game.i18n.localize("TOKENIZER-2.COA.SheetTooltip");
  image.addEventListener("click", async (event) => {
    if (event.shiftKey || !actor.isOwner) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const { CoatOfArmsApp } = await import("./app/CoatOfArmsApp.js");
    await ensureArt();
    CoatOfArmsApp.open({ actor });
  }, true);
}

Hooks.on("renderActorSheetV2", onRenderSheet);
Hooks.on("renderActorSheet", onRenderSheet);

// a player's arms go to the GM for approval (Tokenizer 2's player requests, API 1.3); on every client, so players can send
Hooks.once("tokenizer-2.ready", registerArmsRequest);

// the open window shows whether a request is waiting: redraw it when a request is sent, decided or withdrawn
Hooks.on("updateActor", async (actor, changes) => {
  if (!foundry.utils.hasProperty(changes, "flags.tokenizer-2.requests")) return;
  const { CoatOfArmsApp } = await import("./app/CoatOfArmsApp.js");
  const app = CoatOfArmsApp.openWindows?.get(actor.uuid);
  if (app?.rendered) app.render();
});

Hooks.once("ready", () => {
  const module = game.modules.get(MODULE_ID);
  if (!module) return;
  module.api = {
    /** Loads the charge pictures; generate and render wait for it themselves. */
    ready: ensureArt,
    /** Roll arms: await generate({ seed, rules }) -> { arms, seed, log }. */
    generate: async (options) => {
      await ensureArt();
      return generateArms(options);
    },
    /** The blazon of arms. */
    blazon,
    /** Arms data from anywhere, made whole. */
    normaliseArms,
    /** Draw arms to a canvas: await render(arms, { size, shape, damask, shade, outline, seed, chargeStyle }); damask is a pattern id or "none". */
    render: async (arms, options) => {
      await ensureArt();
      return renderArms(arms, options);
    },
    /** Open the Coat of Arms window: open({ actor, state }). */
    open: async (options) => {
      const { CoatOfArmsApp } = await import("./app/CoatOfArmsApp.js");
      await ensureArt();
      return CoatOfArmsApp.open(options);
    },
    /** Every charge id, the tinctures, the shield shapes and the ways charges can be drawn. */
    charges: CHARGE_IDS,
    tinctures: TINCTURES,
    shapes: SHAPE_IDS,
    chargeStyles: CHARGE_STYLES,
    damaskPatterns: [...DAMASK_PATTERNS, NO_DAMASK],
  };
});
