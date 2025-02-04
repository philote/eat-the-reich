// Import document classes.
import { EatTheReichActor } from "./documents/actor.mjs";
import { EatTheReichItem } from "./documents/item.mjs";
// Import sheet classes.
import { EatTheReichActorSheet } from "./sheets/actor-sheet.mjs";
import { EatTheReichItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { ETR } from "./helpers/config.mjs";
// Import DataModel classes
import * as models from "./data/_module.mjs";
import * as utils from "./helpers/utils.mjs";

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
	applications: {
		EatTheReichActorSheet,
		EatTheReichItemSheet,
	},
	utils: {
		rollItemMacro,
	},
	models,
};

Hooks.once("init", function () {
	// Add custom constants for configuration.
	CONFIG.ETR = ETR;

	// Define custom Document and DataModel classes
	CONFIG.Actor.documentClass = EatTheReichActor;

	// Note that you don't need to declare a DataModel
	// for the base actor/item classes - they are included
	// with the Character/NPC as part of super.defineSchema()
	CONFIG.Actor.dataModels = {
		character: models.EatTheReichCharacter,
		npc: models.EatTheReichNPC,
	};
	CONFIG.Item.documentClass = EatTheReichItem;
	CONFIG.Item.dataModels = {
		ability: models.EatTheReichAbility,
		advance: models.EatTheReichAdvance,
		equipment: models.EatTheReichEquipment,
		loot: models.EatTheReichLoot,
	};

	// Register sheet application classes
	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("eat-the-reich", EatTheReichActorSheet, {
		makeDefault: true,
		label: "ETR.SheetLabels.Actor",
	});
	Items.unregisterSheet("core", ItemSheet);
	Items.registerSheet("eat-the-reich", EatTheReichItemSheet, {
		makeDefault: true,
		label: "ETR.SheetLabels.Item",
	});
	
	utils.registerHandlebarsHelpers();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", function () {
	// Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
	Hooks.on("hotbarDrop", (bar, data, slot) => createDocMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createDocMacro(data, slot) {
	// First, determine if this is a valid owned item.
	if (data.type !== "Item") return;
	if (!data.uuid.includes("Actor.") && !data.uuid.includes("Token.")) {
		return ui.notifications.warn(
			"You can only create macro buttons for owned Items"
		);
	}
	// If it is, retrieve it based on the uuid.
	const item = await Item.fromDropData(data);

	// Create the macro command using the uuid.
	const command = `game.eatthereich.rollItemMacro("${data.uuid}");`;
	let macro = game.macros.find(
		(m) => m.name === item.name && m.command === command
	);
	if (!macro) {
		macro = await Macro.create({
			name: item.name,
			type: "script",
			img: item.img,
			command: command,
			flags: { "eat-the-reich.itemMacro": true },
		});
	}
	game.user.assignHotbarMacro(macro, slot);
	return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
	// Reconstruct the drop data so that we can load the item.
	const dropData = {
		type: "Item",
		uuid: itemUuid,
	};
	// Load the item from the uuid.
	Item.fromDropData(dropData).then((item) => {
		// Determine if the item loaded and if it's an owned item.
		if (!item || !item.parent) {
			const itemName = item?.name ?? itemUuid;
			return ui.notifications.warn(
				`Could not find item ${itemName}. You may need to delete and recreate this macro.`
			);
		}

		// Trigger the item roll
		item.roll();
	});
}
