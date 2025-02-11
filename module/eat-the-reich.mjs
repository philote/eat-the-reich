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

Hooks.on("renderSettings", (app, html) => {
    const header = document.createElement("h2");
    header.innerText = game.i18n.localize('ETR.Settings.game.heading');

    const pbtaSettings = document.createElement("div");
    html.find("#settings-game")?.after(header, pbtaSettings);

    const buttons = [
        {
            action: (ev) => {
                ev.preventDefault();
                window.open("https://rowanrookanddecard.com", "_blank");
            },
            iconClasses: ["fa-solid", "fa-book"],
            label: game.i18n.localize('ETR.Settings.game.publisher.title')
        },
        {
            action: (ev) => {
                ev.preventDefault();
                window.open("https://github.com/philote/eat-the-reich", "_blank");
            },
            iconClasses: ["fab", "fa-github"],
            label: game.i18n.localize(`ETR.Settings.game.github.title`)
        },
        {
            action: (ev) => {
                ev.preventDefault();
                window.open("https://ko-fi.com/ephson", "_blank");
            },
            iconClasses: ["fa-solid", "fa-mug-hot"],
            label: game.i18n.localize("ETR.Settings.game.kofi.title")
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
