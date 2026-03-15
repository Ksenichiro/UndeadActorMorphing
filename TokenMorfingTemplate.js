// Target Pool + Template Macro
// Select one or more tokens on the canvas, then run the macro.
// Step 1: choose which selected tokens belong to the working pool.
// Step 2: apply a template to the current pool.

const selected = canvas.tokens.controlled;

if (!selected.length) {
  return ui.notifications.warn("Select at least one token first.");
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function mergeArray(existing, additions) {
  return uniq([...(existing ?? []), ...additions]);
}

async function skeletifyActor(actor) {
  const updates = {};

  updates["system.details.type.value"] = "undead";
  updates["system.details.alignment"] = "lawful evil";
  updates["system.abilities.int.value"] = 6;
  updates["system.abilities.wis.value"] = 8;
  updates["system.abilities.cha.value"] = 5;

  const currentDV = foundry.utils.getProperty(actor, "system.traits.dv.value") ?? [];
  updates["system.traits.dv.value"] = mergeArray(currentDV, ["bludgeoning"]);

  const currentDI = foundry.utils.getProperty(actor, "system.traits.di.value") ?? [];
  updates["system.traits.di.value"] = mergeArray(currentDI, ["poison"]);

  const currentCI = foundry.utils.getProperty(actor, "system.traits.ci.value") ?? [];
  updates["system.traits.ci.value"] = mergeArray(currentCI, ["exhaustion", "poisoned"]);

  const currentDarkvision = foundry.utils.getProperty(actor, "system.attributes.senses.darkvision") ?? 0;
  updates["system.attributes.senses.darkvision"] = Math.max(currentDarkvision, 60);

  const currentSpecialSenses = foundry.utils.getProperty(actor, "system.attributes.senses.special") ?? "";
  const bonesenseText = "Bonesense: The skeleton can pinpoint, by scent, the location of any creature with bones within 20 feet of it.";
  const undeadNeedsText = "Undead Nature: The creature no longer requires air, food, drink, or sleep.";

  const specialLines = currentSpecialSenses
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  if (!specialLines.some(s => s.toLowerCase().includes("bonesense"))) {
    specialLines.push(bonesenseText);
  }

  if (!specialLines.some(s => s.toLowerCase().includes("no longer requires air"))) {
    specialLines.push(undeadNeedsText);
  }

  updates["system.attributes.senses.special"] = specialLines.join("\n");

  await actor.update(updates);
}

const initiallyTargeted = new Set(game.user.targets.map(t => t.id));
const state = new Map(selected.map(t => [t.id, initiallyTargeted.has(t.id)]));

let confirmedIds = [];

function getChosenIds() {
  return [...state.entries()]
    .filter(([_, enabled]) => enabled)
    .map(([id]) => id);
}

function refresh(html) {
  confirmedIds = getChosenIds();
  const isTemplateUnlocked = confirmedIds.length > 0;

  for (const el of html[0].querySelectorAll(".target-pool-btn")) {
    const id = el.dataset.tokenId;
    const active = state.get(id);

    el.classList.toggle("active", active);
  }

  const templateButtons = html[0].querySelectorAll("[data-template-action]");
  for (const btn of templateButtons) {
    if (isTemplateUnlocked) {
      btn.removeAttribute("disabled");
    } else {
      btn.setAttribute("disabled", "disabled");
    }
  }

  const templateStage = html[0].querySelector("[data-role='template-stage']");
  if (templateStage) {
    templateStage.dataset.ready = isTemplateUnlocked ? "true" : "false";
  }

  const stageEl = html[0].querySelector("[data-role='stage-status']");
  if (stageEl) {
    stageEl.textContent = isTemplateUnlocked
      ? `Ready: ${confirmedIds.length} token(s) in the pool.`
      : "Select at least one token to unlock template actions.";
  }
}

async function applyToConfirmedTokens(handler, successLabel) {
  if (!confirmedIds.length) {
    return ui.notifications.warn("Select at least one token first.");
  }

  const updatedActors = new Set();
  let count = 0;

  for (const tokenId of confirmedIds) {
    const token = canvas.tokens.get(tokenId);
    const actor = token?.actor;
    if (!actor) continue;

    if (updatedActors.has(actor.uuid)) continue;
    updatedActors.add(actor.uuid);

    try {
      await handler(actor);
      count++;
    } catch (err) {
      console.error(`Failed to ${successLabel.toLowerCase()} ${actor.name}`, err);
      ui.notifications.error(`Failed to ${successLabel.toLowerCase()} ${actor.name}. Check console.`);
    }
  }

  ui.notifications.info(`${successLabel} ${count} actor(s).`);
}

const content = `
<style>
  .target-pool-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .target-pool-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.5rem;
  }

  .target-pool-btn {
    border: 1px solid #666;
    border-radius: 6px;
    padding: 0.6rem 0.75rem;
    cursor: pointer;
    text-align: left;
    transition: 0.15s ease;
    user-select: none;
  }

  .target-pool-btn.active {
    outline: 2px solid #888;
    box-shadow: inset 0 0 0 9999px rgba(80, 160, 255, 0.18);
  }

  .target-pool-name {
    font-weight: 600;
    display: block;
  }

  .target-pool-state {
    font-size: 0.9em;
    opacity: 0.8;
  }

  .target-pool-actions,
  .template-actions {
    display: flex;
    gap: 0.5rem;
  }

  .target-pool-actions button,
  .template-actions button {
    flex: 1;
  }

  .template-actions {
    margin-top: 0.35rem;
  }

  .template-actions button {
    padding: 0.55rem 0.9rem;
    border-radius: 8px;
  }

  .template-stage {
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    padding-top: 0.75rem;
    opacity: 0.6;
    transition: opacity 0.15s ease;
  }

  .template-stage[data-ready="true"] {
    opacity: 1;
  }

  .template-actions button[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .template-summary {
    font-size: 0.95em;
    opacity: 0.9;
    margin: 0;
  }

  .dialog-buttons {
    margin-top: 0.85rem;
  }
</style>

<div class="target-pool-wrap">
  <p>Step 1: choose which selected tokens should be in the working pool.</p>

  <div class="target-pool-grid">
    ${selected.map(t => `
      <div
        class="target-pool-btn ${state.get(t.id) ? "active" : ""}"
        data-token-id="${t.id}"
      >
        <span class="target-pool-name">${t.name}</span>
      </div>
    `).join("")}
  </div>

  <div class="template-stage" data-role="template-stage" data-ready="false">

    <div class="template-actions">
      <button type="button" data-template-action="skeletify">Skeletify</button>
      <button type="button" data-template-action="zombify">Zombify</button>
    </div>
  </div>
</div>
`;

new Dialog({
  title: "Token Morphing Template",
  content,
  buttons: {
    close: {
      label: "Close"
    }
  },
  render: (html) => {
    html[0].querySelectorAll(".target-pool-btn").forEach(el => {
      el.addEventListener("click", () => {
        const id = el.dataset.tokenId;
        state.set(id, !state.get(id));
        refresh(html);
      });
    });

    html[0].querySelector("[data-template-action='skeletify']")?.addEventListener("click", async () => {
      await applyToConfirmedTokens(skeletifyActor, "Skeletified");
    });

    html[0].querySelector("[data-template-action='zombify']")?.addEventListener("click", async () => {
      ui.notifications.info("Zombify is not implemented yet.");
    });

    refresh(html);
  },
  default: "close"
}).render(true);
