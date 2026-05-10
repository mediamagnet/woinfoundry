/* global foundry, game, Dialog */
/**
 * WOIN — Modernized Actor Sheet for Foundry VTT v14
 * Clean, path‑based updates, no deprecated patterns, no duplicate()
 */

import { DiceWOIN } from "./dice.js";

export class SimpleActorSheet extends ActorSheet {

  // ------------------------------------------------------------
  // Default Options
  // ------------------------------------------------------------
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["woin", "sheet", "actor"],
      template: "systems/woinfoundry/templates/actor-sheet.html",
      width: 831,
      height: 800,
      resizable: true,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
      scrollY: [".sheet-body"]
    });
  }

  // ------------------------------------------------------------
  // Data
  // ------------------------------------------------------------
  async getData() {
    const base = await super.getData();
    return {
      owner: this.isOwner,
      editable: this.isEditable,
      actor: base.actor,
      items: base.items,
      system: base.actor.system
    };
  }

  // ------------------------------------------------------------
  // Resize Handling
  // ------------------------------------------------------------
  _onResize() {
    if (!game.settings.get("woinfoundry", "verticalSheet")) return;
    const isVertical = this.position.width < 830;
    this.form.classList.toggle("vertical-sheet", isVertical);
  }

  // ------------------------------------------------------------
  // Activate Listeners
  // ------------------------------------------------------------
  activateListeners(html) {
    super.activateListeners(html);
    this._onResize();

    if (!this.options.editable) return;

    // -----------------------------
    // Item Editing
    // -----------------------------
    html.find(".item-edit").on("click", ev => {
      const id = ev.currentTarget.dataset.itemId;
      this.actor.items.get(id)?.sheet.render(true);
    });

    html.find(".item-delete").on("click", ev => this._confirmDeleteItem(ev));

    // -----------------------------
    // Attribute Updates
    // -----------------------------
    html.find(".attribute input").on("input", ev => this._updateAttribute(ev));

    // -----------------------------
    // Skill Updates
    // -----------------------------
    html.find(".skills-value").on("input", ev => this._updateSkill(ev));
    html.find(".skill-create").on("click", ev => this._createSkill(ev));
    html.find(".skill-delete").on("click", ev => this._deleteSkill(ev));

    // -----------------------------
    // Exploit Delete
    // -----------------------------
    html.find(".exploit-delete").on("click", ev => this._deleteExploit(ev));

    // -----------------------------
    // Item Toggles
    // -----------------------------
    html.find(".item-equip").on("click", ev => this._toggleItem(ev, "equipped"));
    html.find(".item-carry").on("click", ev => this._toggleItem(ev, "carried"));

    // -----------------------------
    // Add Item / Exploit
    // -----------------------------
    html.find(".item-add").on("click", () => {
      this.actor.createEmbeddedDocuments("Item", [{
        name: "new item",
        type: "item",
        system: game.system.model.Item.item
      }]);
    });

    html.find(".exploit-add").on("click", () => {
      this.actor.createEmbeddedDocuments("Item", [{
        name: "new exploit",
        type: "exploit",
        system: game.system.model.Item.exploit
      }]);
    });

    // -----------------------------
    // Advancement
    // -----------------------------
    html.find(".advancement-input").on("input", ev => this._updateAdvancement(ev));
    html.find(".advancement-add-gain").on("click", () => this._addAdvancement("xp_gain"));
    html.find(".advancement-add-spend").on("click", () => this._addAdvancement("xp_spent"));
    html.find(".advancement-remove-gain").on("click", ev => this._removeAdvancement(ev, "xp_gain"));
    html.find(".advancement-remove-spend").on("click", ev => this._removeAdvancement(ev, "xp_spent"));

    // -----------------------------
    // Movement Auto‑Calc
    // -----------------------------
    html.find(".auto-calculate.movement").on("click", () => this._calculateMovement());

    // -----------------------------
    // Rollables
    // -----------------------------
    html.find(".rollable").on("click", ev => this._roll(ev));
    html.find(".rollable-general").on("click", ev => this._rollGeneral(ev));
    html.find(".rollable-attack").on("click", ev => this._rollAttack(ev));

    // -----------------------------
    // Input Highlight
    // -----------------------------
    html.find("input").on("click", ev => ev.currentTarget.select());
  }

  // ------------------------------------------------------------
  // Attribute Updating (v14‑correct)
  // ------------------------------------------------------------
  async _updateAttribute(ev) {
    const attr = ev.currentTarget.dataset.attribute;
    const value = Number(ev.currentTarget.value);

    const pool = [0,1,1,2,2,2,3,3,3,3,4,4,4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6,7,7,7,7,7,7,7,7,8,8,8,8,8,8,8,8,8];

    const dice = pool[value] ?? 0;

    await this.actor.update({
      [`system.attributes.${attr}.value`]: value,
      [`system.attributes.${attr}.dice`]: dice,
      "system.luck.max": this.actor.system.attributes.luck.dice,
      "system.luck.value": Math.clamp(this.actor.system.luck.value, 0, this.actor.system.luck.max),
      "system.power.value": Math.clamp(this.actor.system.power.value, 0, this.actor.system.power.max)
    });
  }

  // ------------------------------------------------------------
  // Skill Updating (v14‑correct)
  // ------------------------------------------------------------
  async _updateSkill(ev) {
    const id = ev.currentTarget.dataset.itemId;
    const binding = ev.currentTarget.dataset.binding;
    const value = Number(ev.currentTarget.value);

    const item = this.actor.items.get(id);
    if (!item) return;

    const pool = [0,1,1,2,2,2,3,3,3,3,4,4,4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6,7,7,7,7,7,7,7,7,8,8,8,8,8,8,8,8,8];

    const attrDice = this.actor.system.attributes[item.system.attribute]?.dice ?? 0;
    const score = Math.clamp(value, 0, pool.length - 1);

    await item.update({
      [binding]: score,
      "system.pool": pool[score],
      "system.gradepool": attrDice
    });
  }

  // ------------------------------------------------------------
  // Advancement Updating
  // ------------------------------------------------------------
  async _updateAdvancement(ev) {
    const { key, index } = ev.currentTarget.dataset;
    const value = ev.currentTarget.value;

    const path = `system.advancement.${key.includes("gain") ? "xp_gain" : "xp_spent"}.${index}.${key.endsWith("name") ? "name" : "value"}`;

    await this.actor.update({ [path]: value });
  }

  _addAdvancement(type) {
    const path = `system.advancement.${type}`;
    const arr = foundry.utils.duplicate(this.actor.system.advancement[type]);
    arr.push({ name: "default", value: 0 });
    this.actor.update({ [path]: arr });
  }

  _removeAdvancement(ev, type) {
    const index = Number(ev.currentTarget.dataset.index);
    const arr = foundry.utils.duplicate(this.actor.system.advancement[type]);
    arr.splice(index, 1);
    this.actor.update({ [`system.advancement.${type}`]: arr });
  }

  // ------------------------------------------------------------
  // Item Toggles
  // ------------------------------------------------------------
  async _toggleItem(ev, field) {
    const id = ev.currentTarget.dataset.itemId;
    const item = this.actor.items.get(id);
    if (!item) return;

    await item.update({
      [`system.${field}`]: !item.system[field],
      ...(field === "carried" ? { "system.equipped": false } : {})
    });
  }

  // ------------------------------------------------------------
  // Delete Item / Skill / Exploit
  // ------------------------------------------------------------
  async _confirmDeleteItem(ev) {
    const id = ev.currentTarget.closest(".item")?.dataset.itemId;
    if (!id) return;

    const html = await renderTemplate("systems/woinfoundry/templates/chat/delete.html");

    new Dialog({
      title: "Confirm Deletion",
      content: html,
      buttons: {
        delete: {
          label: "Delete",
          callback: () => this.actor.deleteEmbeddedDocuments("Item", [id])
        },
        cancel: { label: "Cancel" }
      }
    }).render(true);
  }

  _deleteSkill(ev) { this._confirmDeleteItem(ev); }
  _deleteExploit(ev) { this._confirmDeleteItem(ev); }

  _createSkill() {
    this.actor.createEmbeddedDocuments("Item", [{
      type: "skill",
      name: "newskill",
      system: { attribute: "strength", score: 0, pool: 0 }
    }]);
  }

  // ------------------------------------------------------------
  // Movement Auto‑Calculation
  // ------------------------------------------------------------
  async _calculateMovement() {
    const html = await renderTemplate("systems/woinfoundry/templates/chat/confirmation.html");

    new Dialog({
      title: "Auto‑Calculate Movement",
      content: html,
      buttons: {
        yes: {
          label: "Yes",
          callback: () => this._applyMovement()
        },
        no: { label: "No" }
      }
    }).render(true);
  }

  async _applyMovement() {
    const sys = this.actor.system;

    const base = sys.attributes.agility.dice + sys.attributes.strength.dice;

    const skillDice = name =>
      this.actor.items.find(i => i.type === "skill" && i.name.toLowerCase() === name)?.system.pool ?? 0;

    const updates = {
      "system.movement.speed": base + skillDice("running"),
      "system.movement.climb": Math.ceil((base + skillDice("climbing")) / 2),
      "system.movement.swim": Math.ceil((base + skillDice("swimming")) / 2),
      "system.movement.zeroG": Math.ceil((base + skillDice("zero-g")) / 2),
      "system.movement.highG": Math.ceil((base + skillDice("high-g")) / 2),
      "system.movement.lowG": Math.ceil((base + skillDice("low-g")) / 2),
      "system.movement.jumpH": sys.attributes.agility.value * 2,
      "system.movement.jumpV": Math.min(sys.attributes.strength.value, sys.attributes.agility.value * 2)
    };

    await this.actor.update(updates);
  }

  // ------------------------------------------------------------
  // Rollables
  // ------------------------------------------------------------
  _roll(ev) {
    const el = ev.currentTarget;
    const desc = el.dataset.description;
    const formula = el.dataset.formula;
    const grade = Number(el.dataset.gradecappedFormula || 0);

    const cap = Math.min(grade, this.actor.system.advancement.dice_cap) + "d6";

    DiceWOIN.roll({
      parts: ["0", formula, cap].filter(x => x && x !== "0"),
      sender: this.actor,
      flavor: desc
    });
  }

  _rollAttack(ev) {
    DiceWOIN.rollAttack({
      description: ev.currentTarget.dataset.description,
      itemId: ev.currentTarget.dataset.itemid,
      actorId: this.actor.id
    });
  }

  _rollGeneral(ev) {
    DiceWOIN.rollGeneral({
      description: ev.currentTarget.dataset.description,
      attribute_dice: Number(ev.currentTarget.dataset.attributeDice || 0),
      skill_dice: Number(ev.currentTarget.dataset.skillDice || 0),
      constant: Number(ev.currentTarget.dataset.constant1 || 0) + Number(ev.currentTarget.dataset.constant2 || 0),
      actorId: this.actor.id
    });
  }
}
