// Import document classes.
import { EatTheReichActor } from "./documents/actor.mjs";
import { EatTheReichItem } from "./documents/item.mjs";
// Import sheet classes.
import * as applications from "./sheets/_module.mjs";
// Import helper/utility classes and constants.
import { ETR } from "./helpers/config.mjs";
// Import DataModel classes
import * as models from "./data/_module.mjs";
import * as utils from "./helpers/utils.mjs";
// Import dice allocation system
import { DiceAllocation } from "./dice/allocation.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

// Add key classes to the global scope so they can be more easily used
// by downstream developers
globalThis.eat_the_reich = {
	documents: {
		EatTheReichActor,
		EatTheReichItem,
	},
	applications,
	models,
	dice: {
		DiceAllocation,
	},
};

Hooks.on("renderChatMessage", (chatMessage, html, data) => {
	// Apply styles and potentially other listeners for individual messages
	DiceAllocation.onRenderChatMessage(chatMessage, html, data);
});

Hooks.on("renderChatLog", (chatLog, html, data) => {
	// Apply styles to all messages on initial log render AND attach the single click listener
	DiceAllocation.chatListeners(html); // Attach the main click listener to the log container
	DiceAllocation.onRenderChatLog(chatLog, html, data); // Apply initial styles
});

Hooks.once("init", function () {
	// Add custom constants for configuration.
	CONFIG.ETR = ETR;
	// CONFIG.debug.hooks = true;

	// Define custom Document and DataModel classes
	CONFIG.Actor.documentClass = EatTheReichActor;

	// Note that you don't need to declare a DataModel
	// for the base actor/item classes - they are included
	// with the Character/NPC as part of super.defineSchema()
	CONFIG.Actor.dataModels = {
		character: models.EatTheReichCharacter,
		npc: models.EatTheReichNPC,
		location: models.EatTheReichLocation,
	};
	CONFIG.Item.documentClass = EatTheReichItem;
	CONFIG.Item.dataModels = {
		ability: models.EatTheReichAbility,
		advance: models.EatTheReichAdvance,
		equipment: models.EatTheReichEquipment,
		loot: models.EatTheReichLoot,
		objective: models.EatTheReichObjective,
		extraInfo: models.EatTheReichExtraInfo,
	};

	// Register sheet application classes
	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("eat-the-reich", applications.EatTheReichCharacterSheet, {
		types: ["character"],
		makeDefault: true,
		label: "ETR.SheetLabels.Actor",
	});
	Actors.registerSheet("eat-the-reich", applications.EatTheReichNPCSheet, {
		types: ["npc"],
		makeDefault: true,
		label: "ETR.SheetLabels.NPC",
	});
	Actors.registerSheet("eat-the-reich", applications.EatTheReichLocationSheet, {
		types: ["location"],
		makeDefault: true,
		label: "ETR.SheetLabels.Location",
	});
	Items.unregisterSheet("core", ItemSheet);
	Items.registerSheet("eat-the-reich", applications.EatTheReichItemSheet, {
		makeDefault: true,
		label: "ETR.SheetLabels.Item",
	});

	utils.registerHandlebarsHelpers();

	// NOTE: DiceAllocation initialization moved to the "ready" hook
});

// Hook once the game is ready
// Hooks.once('ready', function() {
// 	// Initialize dice allocation system
// 	DiceAllocation.initialize();
// });

Hooks.on("renderSettings", (app, html) => {
	if (foundry.utils.isNewerVersion(game.version, "13.0.0")) return;
	// TODO add v13 version for this later

	const header = document.createElement("h2");
	header.innerText = game.i18n.localize("ETR.Settings.game.heading");

	const pbtaSettings = document.createElement("div");

	html[0].querySelector("#settings-game")?.after(header, pbtaSettings);

	const buttons = [
		{
			action: (ev) => {
				ev.preventDefault();
				window.open("https://rowanrookanddecard.com", "_blank");
			},
			iconClasses: ["fa-solid", "fa-book"],
			label: game.i18n.localize("ETR.Settings.game.publisher.title"),
		},
		{
			action: (ev) => {
				ev.preventDefault();
				window.open("https://github.com/philote/eat-the-reich", "_blank");
			},
			iconClasses: ["fab", "fa-github"],
			label: game.i18n.localize(`ETR.Settings.game.github.title`),
		},
		{
			action: (ev) => {
				ev.preventDefault();
				window.open("https://ko-fi.com/ephson", "_blank");
			},
			iconClasses: ["fa-solid", "fa-mug-hot"],
			label: game.i18n.localize("ETR.Settings.game.kofi.title"),
		},
	].map(({ action, iconClasses, label }) => {
		const button = document.createElement("button");
		button.type = "button";

		const icon = document.createElement("i");
		icon.classList.add(...iconClasses);

		button.append(icon, game.i18n.localize(label));

		button.addEventListener("click", action);

		return button;
	});

	pbtaSettings.append(...buttons);
});
