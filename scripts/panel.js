/**
 * panel.js - the editor's left panel for the Coat of Arms tool: a preview,
 * the blazon, and the buttons. The controls themselves are in the Coat of
 * Arms window, which the tool opens.
 */

import { drawPreview, stateBlazon, t } from "./ui/controls.js";
import { whenArtReady } from "./art-loader.js";

/**
 * @param {HTMLElement} container
 * @param {{ tool: import("./CoatOfArmsTool.js").CoatOfArmsTool, editor: object }} ctx
 */
export function renderPanel(container, { tool, editor }) {
  if (!tool?.state) return;
  const heading = document.createElement("h3");
  heading.className = "tie-panel__heading";
  heading.textContent = t("PluginName");
  container.appendChild(heading);

  const preview = document.createElement("canvas");
  preview.className = "tie-coa-preview";
  container.appendChild(preview);

  const blazonText = document.createElement("p");
  blazonText.className = "tie-coa-blazon";
  container.appendChild(blazonText);

  const refresh = () => {
    drawPreview(preview, tool.state, 512);
    blazonText.textContent = stateBlazon(tool.state);
  };
  whenArtReady(refresh);
  tool.refreshPanel = refresh;

  const layer = tool.layerId ? editor?.getLayer(tool.layerId) : null;
  if (layer) {
    const note = document.createElement("p");
    note.className = "tie-hint";
    note.textContent = t("Editing", { name: layer.name });
    container.appendChild(note);
  }

  const actions = document.createElement("div");
  actions.className = "tie-coa-actions";
  actions.appendChild(actionButton(t("OpenWindow"), "fa-solid fa-shield-halved", () => tool.openWindow(), true));
  if (layer) actions.appendChild(actionButton(t("ReplaceOnToken"), "fa-solid fa-rotate", () => tool.updateLayer(), false));
  actions.appendChild(actionButton(t("AddToToken"), "fa-solid fa-plus", () => tool.addToToken(), false));
  actions.appendChild(actionButton(t("CopyBlazon"), "fa-solid fa-copy", async () => {
    await navigator.clipboard?.writeText(stateBlazon(tool.state));
    ui.notifications.info(t("Copied"));
  }, false));
  container.appendChild(actions);

  const hint = document.createElement("p");
  hint.className = "tie-hint";
  hint.textContent = t("PanelHint");
  container.appendChild(hint);
}

function actionButton(label, icon, onClick, primary) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `tie-btn ${primary ? "tie-btn--primary" : "tie-btn--ghost"}`;
  btn.innerHTML = `<i class="${icon}"></i> ${label}`;
  btn.addEventListener("click", onClick);
  return btn;
}
