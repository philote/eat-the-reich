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
	DiceAllocation.chatListeners(html); 
	DiceAllocation.onRenderChatLog(chatLog, html, data); 
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
});

Hooks.on("renderSettings", (app, html) => {
	// --- Button Creation Logic (Common for both versions) ---
	const buttonsData = [
		{
			action: (ev) => {
				ev.preventDefault();
				window.open("https://rowanrookanddecard.com", "_blank");
			},
			iconClasses: ["fa-solid", "fa-book"],
			labelKey: "ETR.Settings.game.publisher.title",
		},
		{
			action: (ev) => {
				ev.preventDefault();
				window.open("https://github.com/philote/eat-the-reich", "_blank");
			},
			iconClasses: ["fab", "fa-github"],
			labelKey: "ETR.Settings.game.github.title",
		},
		{
			action: (ev) => {
				ev.preventDefault();
				window.open("https://ko-fi.com/ephson", "_blank");
			},
			iconClasses: ["fa-solid", "fa-mug-hot"],
			labelKey: "ETR.Settings.game.kofi.title",
		},
	];

	const buttons = buttonsData.map(({ action, iconClasses, labelKey }) => {
		const button = document.createElement("button");
		button.type = "button";

		const icon = document.createElement("i");
		icon.classList.add(...iconClasses);

		button.append(icon, document.createTextNode(` ${game.i18n.localize(labelKey)}`));

		button.addEventListener("click", action);
		return button;
	});

	// --- Version Specific Logic ---
	if (game.release.generation >= 13) {
		// V13+ Logic: Append to the "Documentation" section
		const documentationSection = html.querySelector("section.documentation");
		if (documentationSection) {
			const divider = document.createElement("h4");
			divider.classList.add("divider");
			// Using a more specific key might be better, but reusing for now
			divider.textContent = game.i18n.localize("ETR.Settings.game.heading");

			// Append divider and then the buttons
			documentationSection.append(divider, ...buttons);
		} else {
			console.warn("Eat the Reich | Could not find 'section.documentation' in V13 settings panel.");
		}
	} else {
		// V12 Logic: Insert after the "Game Settings" section
		const gameSettingsSection = html.querySelector("#settings-game");
		if (gameSettingsSection) {
			const header = document.createElement("h2");
			header.innerText = game.i18n.localize("ETR.Settings.game.heading");

			const etrSettingsDiv = document.createElement("div");
			etrSettingsDiv.append(...buttons);

			// Insert the header and the div containing buttons after the game settings section
			gameSettingsSection.after(header, etrSettingsDiv);
		} else {
			console.warn("Eat the Reich | Could not find '#settings-game' section in V12 settings panel.");
		}
	}
});
