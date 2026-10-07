/**
 * CoatOfArmsApp - the Coat of Arms window: a big preview and the blazon on
 * the left, the controls on the right. Opened from a Pendragon sheet's coat
 * of arms (or the API) it can save the picture and blazon to the sheet,
 * open the token editor with the arms added, or download the picture.
 */

import { normaliseArms } from "../lib/arms.js";
import { hashString } from "../lib/rng.js";
import { addArmsLayer, FLAG_ARMS, flagData, MODULE_ID, pictureName, renderState, settingsState } from "../layer.js";
import { applyArmsToActor, ARMS_REQUEST } from "../gm-request.js";
import { buildControls, drawPreview, readLook, rollInto, stateBlazon, t } from "../ui/controls.js";
import { ensureArt } from "../art-loader.js";
import { shareAlikeCredits } from "../lib/charges/credits.js";

const { ApplicationV2 } = foundry.applications.api;

/** Whether an actor's sheet has a coat of arms of its own (Pendragon characters and NPCs). */
export function sheetHasArms(actor) {
  return typeof actor?.system?.coatOfArms === "string";
}

function escapeText(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);
}

/** A link opening in a new tab, or the text alone when there is no address. */
function link(text, href) {
  const safe = escapeText(text);
  return href ? `<a href="${escapeText(href)}" target="_blank" rel="noopener">${safe}</a>` : safe;
}

/**
 * Fills `box` with a note naming the share-alike pictures the arms are drawn
 * with: a picture made with one is shared under the same licence. Empty (and
 * hidden) when the arms use none.
 */
export function shareAlikeNotice(box, arms) {
  const credits = shareAlikeCredits(arms);
  box.hidden = credits.length === 0;
  if (!credits.length) {
    box.innerHTML = "";
    return;
  }
  const items = credits.map((c) => `<li>${game.i18n.format("TOKENIZER-2.COA.ShareAlikeItem", {
    charge: link(c.charges.join(", "), c.source),
    author: escapeText(c.author),
    licence: link(c.licence, c.licenceUrl),
  })}</li>`).join("");
  box.innerHTML = `<p><i class="fa-brands fa-creative-commons-sa"></i> ${escapeText(t("ShareAlikeNotice"))}</p><ul>${items}</ul>`;
}

export class CoatOfArmsApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "tokenizer-2-coat-of-arms-{id}",
    classes: ["tie-coa-app"],
    window: { title: "TOKENIZER-2.COA.WindowTitle", icon: "fa-solid fa-shield-halved", resizable: true },
    position: { width: 880, height: 640 },
  };

  /**
   * @param {object} [options]
   * @param {Actor} [options.actor]  Whose arms these are: seeds the first roll, and is where Save to Sheet writes
   * @param {object} [options.state]  Arms to start with
   * @param {object} [options.host]  The token editor's tool, when opened from it: { onAdd, onUpdate, onChange, layerName }
   */
  constructor({ actor = null, state = null, host = null, ...options } = {}) {
    super(options);
    this.actor = actor;
    this.coat = state ?? CoatOfArmsApp.initialState(actor);
    this.host = host;
  }

  /** The window for an actor (one at a time per actor), rendered. Load the pictures first (ensureArt), so the first roll keeps to them. */
  static open(options = {}) {
    const key = options.actor?.uuid ?? "none";
    CoatOfArmsApp.openWindows ??= new Map();
    let app = CoatOfArmsApp.openWindows.get(key);
    if (!app) {
      app = new CoatOfArmsApp(options);
      CoatOfArmsApp.openWindows.set(key, app);
    } else {
      if (options.state) app.coat = options.state;
      if ("host" in options) app.host = options.host;
    }
    app.render({ force: true });
    return app;
  }

  /**
   * An actor's saved arms, opening on the Field tab, or a roll seeded by the
   * actor so it always starts the same, opening on the Roll tab.
   */
  static initialState(actor) {
    const state = settingsState();
    const saved = actor?.getFlag?.(MODULE_ID, FLAG_ARMS);
    if (saved?.arms) {
      state.arms = normaliseArms(saved.arms);
      state.seed = saved.seed ?? null;
      return readLook(state, saved);
    }
    state.ui.tab = "Roll";
    return rollInto(state, actor ? hashString(actor.uuid ?? actor.id ?? actor.name) : undefined);
  }

  get title() {
    const base = game.i18n.localize("TOKENIZER-2.COA.WindowTitle");
    return this.actor ? `${base}: ${this.actor.name}` : base;
  }

  async _renderHTML() {
    // open() callers load the pictures first; this covers any that did not
    await ensureArt();
    const root = document.createElement("div");
    root.className = "tie-coa-app__body";
    root.style.display = "contents";

    const left = document.createElement("div");
    left.className = "tie-coa-app__preview";
    const preview = document.createElement("canvas");
    preview.className = "tie-coa-preview";
    left.appendChild(preview);
    const blazonText = document.createElement("p");
    blazonText.className = "tie-coa-blazon";
    left.appendChild(blazonText);
    const actions = document.createElement("div");
    actions.className = "tie-coa-actions";
    left.appendChild(actions);
    const licence = document.createElement("div");
    licence.className = "tie-coa-licence";
    left.appendChild(licence);
    root.appendChild(left);

    const right = document.createElement("div");
    right.className = "tie-coa-app__controls";
    root.appendChild(right);

    const refresh = () => {
      drawPreview(preview, this.coat, 720);
      blazonText.textContent = stateBlazon(this.coat);
      shareAlikeNotice(licence, this.coat.arms);
    };
    const build = () => {
      right.innerHTML = "";
      buildControls(right, this.coat, {
        onChange: ({ rebuild } = {}) => {
          refresh();
          if (rebuild) build();
          this.host?.onChange?.();
        },
      });
    };
    refresh();
    build();

    if (this.host) {
      // opened from the token editor: the arms go on the token
      if (this.host.layerName) {
        actions.appendChild(this.button(t("ReplaceOnToken"), "fa-solid fa-rotate", async () => {
          await this.host.onUpdate?.();
          this.close();
        }, true));
      }
      actions.appendChild(this.button(t("AddToToken"), "fa-solid fa-plus", async () => {
        await this.host.onAdd?.();
        this.close();
      }, !this.host.layerName));
    }
    if (sheetHasArms(this.actor) && this.actor.isOwner) {
      const requests = globalThis.Tokenizer2?.gmRequests;
      if (game.user.isGM || !requests) {
        const save = this.button(t("SaveToSheet"), "fa-solid fa-floppy-disk", () => this.saveToSheet(), true);
        save.title = t("SaveToSheetHint");
        actions.appendChild(save);
      } else {
        // a player's arms go to the GM, who approves and saves them
        const send = this.button(t("SendToGM"), "fa-solid fa-paper-plane", () => this.sendToGM(), true);
        send.title = t("SendToGMHint");
        actions.appendChild(send);
        const [waiting] = requests.pending({ actor: this.actor, type: ARMS_REQUEST });
        if (waiting) {
          const note = document.createElement("p");
          note.className = "tie-coa-waiting";
          note.textContent = t("Waiting", { time: new Date(waiting.record.createdAt).toLocaleString() });
          actions.appendChild(note);
          actions.appendChild(this.button(t("Withdraw"), "fa-solid fa-rotate-left", () => this.withdraw()));
        }
      }
    }
    // the editor saves by uploading, which a plain player cannot do
    if (this.actor && !this.host && globalThis.Tokenizer2?.openEditor && (game.user.isGM || game.user.can("FILES_UPLOAD"))) {
      actions.appendChild(this.button(t("OpenTokenizer"), "fa-solid fa-image-portrait", () => this.openInTokenizer(), !sheetHasArms(this.actor)));
    }
    actions.appendChild(this.button(t("Download"), "fa-solid fa-download", () => this.download()));
    actions.appendChild(this.button(t("CopyBlazon"), "fa-solid fa-copy", async () => {
      await navigator.clipboard?.writeText(stateBlazon(this.coat));
      ui.notifications.info(t("Copied"));
    }));
    actions.appendChild(this.button(t("Export"), "fa-solid fa-file-export", () => this.exportJson()));
    actions.appendChild(this.button(t("Import"), "fa-solid fa-file-import", () => this.importJson()));
    return root;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  // eslint-disable-next-line class-methods-use-this
  button(label, icon, onClick, primary = false) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `tie-btn ${primary ? "tie-btn--primary" : "tie-btn--ghost"}`;
    btn.innerHTML = `<i class="${icon}"></i> ${label}`;
    btn.addEventListener("click", onClick);
    return btn;
  }

  /** The picture as a PNG blob. */
  async png() {
    const canvas = renderState(this.coat);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("the canvas could not be encoded");
    return blob;
  }

  /** Writes the picture to the sheet's coat of arms and the blazon to its heraldry. */
  async saveToSheet() {
    const actor = this.actor;
    if (!sheetHasArms(actor)) return;
    try {
      await applyArmsToActor(actor, flagData(this.coat));
      ui.notifications.info(t("SavedToSheet", { name: actor.name }));
    } catch (err) {
      console.error("Tokenizer 2 Coat of Arms | save failed", err);
      ui.notifications.error(`${t("SaveFailed")} ${err.message ?? ""}`);
    }
  }

  /** Sends the arms to the GM for approval (a player). */
  async sendToGM() {
    const requests = globalThis.Tokenizer2?.gmRequests;
    if (!requests || !this.actor) return;
    try {
      const { replaced } = await requests.send(ARMS_REQUEST, flagData(this.coat), { actor: this.actor });
      ui.notifications.info(t(replaced ? "SentToGMReplaced" : "SentToGM"));
      this.render();
    } catch (err) {
      if (err?.code) ui.notifications.warn(err.message);
      else {
        // eslint-disable-next-line no-console -- the plugin has no logger of its own
        console.error("Tokenizer 2 Coat of Arms | sending to the GM failed", err);
        ui.notifications.error(err?.message ?? String(err));
      }
    }
  }

  /** Takes back a request that is still waiting. */
  async withdraw() {
    const requests = globalThis.Tokenizer2?.gmRequests;
    if (!requests || !this.actor) return;
    await requests.withdraw(this.actor, ARMS_REQUEST);
    ui.notifications.info(t("Withdrawn"));
    this.render();
  }

  /** Opens the token editor on the actor and adds the arms as a layer once it is up. */
  async openInTokenizer() {
    const actor = this.actor;
    const state = this.coat;
    const hook = Hooks.on("tokenizer-2.editorOpen", async ({ context, actor: opened }) => {
      if (opened?.id !== actor.id) return;
      Hooks.off("tokenizer-2.editorOpen", hook);
      const layer = await addArmsLayer(context, state);
      if (layer) context.refresh();
    });
    await globalThis.Tokenizer2.openEditor(actor);
  }

  async download() {
    const blob = await this.png();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pictureName(this.coat);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  exportJson() {
    const data = JSON.stringify(flagData(this.coat), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pictureName(this.coat, "json");
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  importJson() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!data?.arms) throw new Error("no arms");
        this.coat.arms = normaliseArms(data.arms);
        this.coat.seed = data.seed ?? null;
        readLook(this.coat, data);
        this.coat.log = [];
        this.render({ force: true });
      } catch {
        ui.notifications.warn(t("ImportFailed"));
      }
    });
    input.click();
  }

  async close(options) {
    CoatOfArmsApp.openWindows?.delete(this.actor?.uuid ?? "none");
    const host = this.host;
    this.host = null;
    host?.onClose?.();
    return super.close(options);
  }
}
