/**
 * WOIN System — Modernized for Foundry VTT v14
 */

import { SimpleActorSheet } from "./actor-sheet.js";
import { SimpleItemSheet } from "./item-sheet.js";
import { SimpleExploitSheet } from "./exploit-sheet.js";
// import { WOINActor } from "./actorclass.js"; // enable when ready

Hooks.once("init", () => {
  console.log("WOIN | simple.js initialized (v14)");

  // ------------------------------------------------------------
  // Initiative Formula
  // ------------------------------------------------------------
  CONFIG.Combat.initiative = {
    formula: "(@initiative.value)d6",
    decimals: 2
  };

  // ------------------------------------------------------------
  // Custom Actor Class (optional)
  // ------------------------------------------------------------
  // CONFIG.Actor.documentClass = WOINActor;

  // ------------------------------------------------------------
  // Unregister Core Sheets (v14‑correct)
  // ------------------------------------------------------------
  Actors.unregisterSheet("core", Actors.Sheet);
  Items.unregisterSheet("core", Items.Sheet);

  // ------------------------------------------------------------
  // Register Actor Sheet
  // ------------------------------------------------------------
  Actors.registerSheet("woinfoundry", SimpleActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "WOIN Actor Sheet"
  });

  // ------------------------------------------------------------
  // Register Item Sheets
  // ------------------------------------------------------------
  Items.registerSheet("woinfoundry", SimpleItemSheet, {
    types: ["item"],
    makeDefault: true
  });

  Items.registerSheet("woinfoundry", SimpleExploitSheet, {
    types: ["exploit", "skill", "language"],
    makeDefault: true
  });

  // ------------------------------------------------------------
  // System Settings
  // ------------------------------------------------------------
  game.settings.register("woinfoundry", "macroShorthand", {
    name: "Shortened Macro Syntax",
    hint: "Enable @str instead of @attributes.str.value",
    scope: "world",
    type: Boolean,
    default: true,
    config: true
  });

  game.settings.register("woinfoundry", "verticalSheet", {
    name: "Allow Vertical Sheet",
    hint: "Use vertical layout when sheet is narrow",
    scope: "client",
    type: Boolean,
    default: true,
    config: true
  });

  game.settings.register("woinfoundry", "PrimaryColour", {
    name: "Primary Colour",
    scope: "client",
    type: String,
    default: "#00ffff",
    config: true
  });

  game.settings.register("woinfoundry", "InvertedPrimaryColour", {
    name: "Inverted Colour",
    scope: "client",
    type: String,
    default: "#ff0000",
    config: true
  });

  // ------------------------------------------------------------
  // Dynamic CSS Updates
  // ------------------------------------------------------------
  const root = document.documentElement;

  const applyColors = () => {
    root.style.setProperty("--cyan", game.settings.get("woinfoundry", "PrimaryColour"));
    root.style.setProperty("--invertcyan", game.settings.get("woinfoundry", "InvertedPrimaryColour"));
  };

  applyColors();

  Hooks.on("closeSettingsConfig", applyColors);
});
