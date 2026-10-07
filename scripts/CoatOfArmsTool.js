/**
 * CoatOfArmsTool - the editor tool: opens the Coat of Arms window (the
 * sidebar is too narrow for the controls), shows the arms in its panel, and
 * adds them to the token as an image layer that remembers its arms (so the
 * tool can edit the layer again later, from the layer's right-click menu).
 * Picking another layer while it is open leaves the window on its arms.
 */

import { normaliseArms } from "./lib/arms.js";
import { addArmsLayer, FLAG_ARMS, isArmsLayer, MODULE_ID, settingsState, updateArmsLayer } from "./layer.js";
import { readLook, rollInto } from "./ui/controls.js";
import { ensureArt } from "./art-loader.js";

/** The last arms rolled in this session, so switching tools keeps them. */
let lastState = null;

export class CoatOfArmsTool {
  constructor() {
    /** @type {import("../../../scripts/api/EditorContext.js").EditorContext|null} */
    this.editor = null;
    this.state = null;
    /** The coat of arms layer being edited, if the tool was opened on one. */
    this.layerId = null;
    this._destroyed = false;
    /** The open Coat of Arms window, while the tool is active. */
    this.window = null;
    /** Set by the panel: redraws its preview and blazon. */
    this.refreshPanel = null;
  }

  async activate(_overlay, _app, context = {}) {
    this.editor = context.editor;
    this._destroyed = false;
    // rolls keep to the poses there are pictures of, so the art comes first
    await ensureArt();
    if (this._destroyed) return;
    // the layer menu's Edit Coat of Arms names its layer; from the toolbar, the active layer
    const target = this.editor?.getLayer(context.layerId) ?? this.editor?.getActiveLayer();
    if (isArmsLayer(this.editor, target)) {
      this.loadLayer(target);
      if (this.editor.getActiveLayer()?.id !== target.id) this.editor.setActiveLayer(target.id);
    } else {
      this.layerId = null;
      this.state = lastState ?? settingsState();
      if (!this.state.arms) rollInto(this.state);
    }
    lastState = this.state;
    await this.openWindow();
  }

  deactivate() {
    this._destroyed = true;
    this.editor = null;
    this.refreshPanel = null;
    const window = this.window;
    this.window = null;
    window?.close();
  }

  /** Opens (or refreshes) the Coat of Arms window on the tool's arms. */
  async openWindow() {
    if (!this.editor || this._destroyed) return null;
    const { CoatOfArmsApp } = await import("./app/CoatOfArmsApp.js");
    if (this._destroyed) return null;
    const layer = this.layerId ? this.editor.getLayer(this.layerId) : null;
    this.window = CoatOfArmsApp.open({
      actor: this.editor.actor,
      state: this.state,
      host: {
        layerName: layer?.name ?? null,
        onAdd: () => this.addToToken(),
        onUpdate: () => this.updateLayer(),
        onChange: () => this.refreshPanel?.(),
        onClose: () => {
          this.window = null;
        },
      },
    });
    return this.window;
  }

  /** Takes a coat of arms layer's remembered arms into the panel. */
  loadLayer(layer) {
    const saved = this.editor.getFlag(layer, MODULE_ID, FLAG_ARMS) ?? {};
    this.layerId = layer.id;
    this.state = readLook(settingsState({ arms: normaliseArms(saved.arms), seed: saved.seed ?? null, log: [] }), saved);
    lastState = this.state;
  }

  /** Adds the arms as a new layer above the active one. */
  async addToToken() {
    if (!this.editor || !this.state?.arms) return;
    const layer = await addArmsLayer(this.editor, this.state);
    if (!layer || this._destroyed) return;
    this.layerId = layer.id;
    this.editor.refresh();
    ui.notifications.info(game.i18n.localize("TOKENIZER-2.COA.LayerAdded"));
  }

  /** Redraws the layer the tool is editing. */
  async updateLayer() {
    const layer = this.editor?.getLayer(this.layerId);
    if (!layer) {
      await this.addToToken();
      return;
    }
    const updated = await updateArmsLayer(this.editor, layer, this.state);
    if (!updated || this._destroyed) return;
    this.editor.refresh();
    ui.notifications.info(game.i18n.localize("TOKENIZER-2.COA.LayerUpdated"));
  }
}
