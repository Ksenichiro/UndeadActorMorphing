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

function mergeSpecialSenseLines(currentText, additions) {
  const lines = (currentText ?? "")
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  for (const addition of additions) {
    const needle = addition.toLowerCase().split(":")[0];
    if (!lines.some(line => line.toLowerCase().includes(needle))) {
      lines.push(addition);
    }
  }

  return lines.join("\n");
}

function buildFeatureDescription(description, inlineRollFormula = "") {
  const descriptionParts = [
    description.includes("<p>") ? description : `<p>${description}</p>`
  ];

  if (inlineRollFormula) {
    descriptionParts.push(`<p><strong>Roll:</strong> [[/r ${inlineRollFormula}]]</p>`);
  }

  return descriptionParts.join("");
}

function buildUtilityActivity(name, options = {}) {
  if (!options.formula) return undefined;

  const activityId = foundry.utils.randomID();
  return {
    [activityId]: {
      _id: activityId,
      type: "utility",
      name: options.activityName ?? name,
      activation: {
        type: options.activationType ?? "special",
        value: 1,
        condition: ""
      },
      description: {
        chatFlavor: options.chatFlavor ?? ""
      },
      consumption: {
        targets: [],
        scaling: {
          allowed: false,
          max: ""
        }
      },
      uses: {
        spent: 0,
        max: "",
        recovery: []
      },
      roll: {
        formula: options.formula,
        prompt: false,
        visible: true
      }
    }
  };
}

function buildMorphedName(name, suffix) {
  const escapedSuffixes = Object.values(MORPH_CONFIG)
    .map(config => config.nameSuffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const suffixPattern = new RegExp(`\\s+(?:${escapedSuffixes.join("|")})$`, "i");
  return `${name.replace(suffixPattern, "")} ${suffix}`;
}

async function ensureFeature(actor, name, description, options = {}) {
  const descriptionHtml = buildFeatureDescription(description, options.inlineRollFormula);

  const itemData = {
    name,
    type: "feat",
    system: {
      description: {
        value: descriptionHtml
      }
    }
  };

  const activities = buildUtilityActivity(name, options);
  if (activities) {
    itemData.system.activities = activities;
  }

  if (options.activationType) {
    itemData.system.activation = {
      type: options.activationType,
      cost: 1
    };
  }

  if (options.actionType) {
    itemData.system.actionType = options.actionType;
  }

  if (options.formula) {
    itemData.system.formula = options.formula;
  }

  const existing = actor.items.find(item => item.type === "feat" && item.name === name);
  if (existing) {
    await existing.update(itemData);
    return existing;
  }

  const [created] = await actor.createEmbeddedDocuments("Item", [itemData]);

  return created;
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
  const undeadNatureText = "Undead Nature: The creature no longer requires air, food, drink, or sleep.";
  updates["system.attributes.senses.special"] = mergeSpecialSenseLines(currentSpecialSenses, [bonesenseText]);

  await actor.update(updates);
  await ensureFeature(actor, "Undead Nature", undeadNatureText);
}

async function zombifyActor(actor) {
  const updates = {};

  updates["system.details.type.value"] = "undead";
  updates["system.details.alignment"] = "neutral evil";
  updates["system.abilities.int.value"] = 3;
  updates["system.abilities.wis.value"] = 6;
  updates["system.abilities.cha.value"] = 3;

  const currentDI = foundry.utils.getProperty(actor, "system.traits.di.value") ?? [];
  updates["system.traits.di.value"] = mergeArray(currentDI, ["poison"]);

  const currentCI = foundry.utils.getProperty(actor, "system.traits.ci.value") ?? [];
  updates["system.traits.ci.value"] = mergeArray(currentCI, ["exhaustion", "poisoned"]);

  const currentDarkvision = foundry.utils.getProperty(actor, "system.attributes.senses.darkvision") ?? 0;
  updates["system.attributes.senses.darkvision"] = Math.max(currentDarkvision, 60);

  const currentSpecialSenses = foundry.utils.getProperty(actor, "system.attributes.senses.special") ?? "";
  const bonesenseText = "Bonesense: The zombie can pinpoint, by scent, the location of any creature with bones within 20 feet of it.";
  const undeadFortitudeText = "Undead Fortitude. When the zombie is reduced to 0 Hit Points by a source other than Radiant damage or a Critical Hit, roll a d6.</p><p>On a 3+, the zombie regains 1 Hit Point at the start of its next turn, unless it takes any other damage before then.";
  updates["system.attributes.senses.special"] = mergeSpecialSenseLines(currentSpecialSenses, [bonesenseText]);

  if (foundry.utils.hasProperty(actor, "system.traits.languages.value")) {
    updates["system.traits.languages.value"] = [];
  }

  if (foundry.utils.hasProperty(actor, "system.traits.languages.custom")) {
    updates["system.traits.languages.custom"] = "";
  }

  if (foundry.utils.hasProperty(actor, "system.attributes.spellcasting")) {
    updates["system.attributes.spellcasting"] = "";
  }

  await actor.update(updates);
  await ensureFeature(actor, "Undead Fortitude", undeadFortitudeText, {
    activationType: "special",
    actionType: "util",
    formula: "1d6",
    inlineRollFormula: "1d6"
  });
}

function isActorFolder(folder) {
  return folder?.type === "Actor";
}

function findActorFolder(name, parentFolder = null) {
  return game.folders.find(folder => {
    if (!isActorFolder(folder)) return false;
    if (folder.name !== name) return false;

    const folderParentId = folder.folder?.id ?? folder.folder ?? null;
    const targetParentId = parentFolder?.id ?? null;
    return folderParentId === targetParentId;
  });
}

async function ensureActorFolder(name, parentFolder = null) {
  const existing = findActorFolder(name, parentFolder);
  if (existing) return existing;

  return Folder.create({
    name,
    type: "Actor",
    folder: parentFolder?.id ?? null
  });
}

async function createMorphedActor(sourceActor, config) {
  const targetFolder = await ensureActorFolder(config.folderName);
  const actorData = sourceActor.toObject();

  delete actorData._id;
  actorData.folder = targetFolder.id;
  actorData.name = buildMorphedName(sourceActor.name, config.nameSuffix);

  if (actorData.prototypeToken) {
    actorData.prototypeToken.name = actorData.name;
  }

  const createdActor = await Actor.create(actorData);
  await config.handler(createdActor);
  return createdActor;
}

const MORPH_CONFIG = {
  skeletify: {
    folderName: "Skeletons",
    nameSuffix: "Skeleton",
    handler: skeletifyActor,
    successLabel: "Skeletified"
  },
  zombify: {
    folderName: "Zombies",
    nameSuffix: "Zombie",
    handler: zombifyActor,
    successLabel: "Zombified"
  }
};

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

async function applyMorph(config, createActors) {
  if (!confirmedIds.length) {
    return ui.notifications.warn("Select at least one token first.");
  }

  const processedActors = new Set();
  let morphedCount = 0;
  let createdCount = 0;

  for (const tokenId of confirmedIds) {
    const token = canvas.tokens.get(tokenId);
    const actor = token?.actor;
    if (!actor) continue;

    if (createActors) {
      try {
        await createMorphedActor(actor, config);
        createdCount++;
      } catch (err) {
        console.error(`Failed to create ${config.successLabel.toLowerCase()} copy for ${actor.name}`, err);
        ui.notifications.error(`Failed to create ${config.successLabel.toLowerCase()} copy for ${actor.name}. Check console.`);
      }
    }

    if (processedActors.has(actor.uuid)) continue;
    processedActors.add(actor.uuid);

    const morphedName = buildMorphedName(actor.name, config.nameSuffix);

    try {
      await actor.update({ name: morphedName });
    } catch (err) {
      console.error(`Failed to rename actor ${actor.name}`, err);
      ui.notifications.error(`Failed to rename actor ${actor.name}. Check console.`);
    }

    try {
      await token.document.update({ name: morphedName });
    } catch (err) {
      console.error(`Failed to rename token ${token.name}`, err);
      ui.notifications.error(`Failed to rename token ${token.name}. Check console.`);
    }

    try {
      await config.handler(actor);
      morphedCount++;
    } catch (err) {
      console.error(`Failed to ${config.successLabel.toLowerCase()} ${actor.name}`, err);
      ui.notifications.error(`Failed to ${config.successLabel.toLowerCase()} ${actor.name}. Check console.`);
    }
  }

  const summary = createActors
    ? `${config.successLabel} ${morphedCount} actor(s) and created ${createdCount} morphed actor copy/copies.`
    : `${config.successLabel} ${morphedCount} actor(s).`;
  ui.notifications.info(summary);
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
    <label style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
      <input type="checkbox" data-role="create-actors" />
      <span>Create Actors</span>
    </label>

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
      const createActors = html[0].querySelector("[data-role='create-actors']")?.checked ?? false;
      await applyMorph(MORPH_CONFIG.skeletify, createActors);
    });

    html[0].querySelector("[data-template-action='zombify']")?.addEventListener("click", async () => {
      const createActors = html[0].querySelector("[data-role='create-actors']")?.checked ?? false;
      await applyMorph(MORPH_CONFIG.zombify, createActors);
    });

    refresh(html);
  },
  default: "close"
}).render(true);
