import EatTheReichActorSheet from "./base-actor-sheet.mjs";
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {EatTheReichActorSheet}
 */
export default class EatTheReichCharacterSheet extends EatTheReichActorSheet {
	/** @override */
	static DEFAULT_OPTIONS = {
		classes: ["character"],
		window: {
			icon: "fa-solid fa-skull",
		},
		actions: {
			roll: this._onRoll,
			onClockUpdate: this._onClockUpdate,
			onBloodUpdate: this._onBloodUpdate,
			onAdvanceSelected: this._onAdvanceSelected,
			onInjuryRoll: this._onInjuryRoll,
			onLastStandRoll: this._onLastStandRoll,
		},
	};

	/** @override */
	static PARTS = {
		character: {
			template: "systems/eat-the-reich/templates/actor/character-sheet.hbs",
			scrollable: [""],
		},
	};

	/** @override */
	_configureRenderOptions(options) {
		super._configureRenderOptions(options);
		// if (this.document.limited) return;
		options.parts = ["character"];
	}

	/* -------------------------------------------- */

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		// Offloading context prep to a helper function
		this._prepareItems(context);

		return context;
	}

	/** @override */
	async _preparePartContext(partId, context) {
		// Enrich Description info for display
		context.enrichedDescription = await TextEditor.enrichHTML(
			this.actor.system.description,
			{
				// Whether to show secret blocks in the finished html
				secrets: this.document.isOwner,
				// Data to fill in for inline rolls
				rollData: this.actor.getRollData(),
				// Relative UUID resolution
				relativeTo: this.actor,
			}
		);
		return context;
	}

	/**
	 * Organize and classify Items for Actor sheets.
	 *
	 * @param {object} context The context object to mutate
	 */
	_prepareItems(context) {
		// Initialize containers.
		// You can just use `this.document.itemTypes` instead
		// if you don't need to subdivide a given type like
		// this sheet does with spells
		const abilities = [];
		const advances = [];
		const equipment = [];
		const loot = [];

		for (let i of this.document.items) {
			// Append to abilities.
			if (i.type === "ability") {
				abilities.push(i);
			}
			// Append to advances.
			else if (i.type === "advance") {
				advances.push(i);
			}
			// Append to equipment.
			else if (i.type === "equipment") {
				equipment.push(i);
			}
			// Append to loot.
			else if (i.type === "loot") {
				loot.push(i);
			}
		}

		// Sort then assign
		context.abilities = abilities.sort((a, b) => (a.sort || 0) - (b.sort || 0));
		context.advances = advances.sort((a, b) => (a.sort || 0) - (b.sort || 0));
		context.equipment = equipment.sort((a, b) => (a.sort || 0) - (b.sort || 0));
		context.loot = loot.sort((a, b) => (a.sort || 0) - (b.sort || 0));
	}

	/**************
	 *
	 *   ACTIONS
	 *
	 **************/

	static async _onInjuryRoll(event, target) {
		event.preventDefault();
		const roll = await new Roll("1d6").evaluate();
		let category = "";
		switch (roll.total) {
			case 1:
			case 2:
				category = game.i18n.localize("ETR.Actor.Character.injuries.oneTwo");
				break;
			case 3:
			case 4:
				category = game.i18n.localize("ETR.Actor.Character.injuries.threeFour");
				break;
			case 5:
			case 6:
				category = game.i18n.localize("ETR.Actor.Character.injuries.fiveSix");
				break;
		}
		const message = game.i18n.format("ETR.Actor.Character.injuries.rollMessage", {
			category: game.i18n.localize("ETR.Actor.Character.injuries.oneTwo"),
		});

		ui.notifications.info(message);
		ChatMessage.create({
			speaker: ChatMessage.getSpeaker({ actor: this.actor }),
			rolls: [roll],
			flavor: game.i18n.localize("ETR.Actor.Character.injuries.label"),
			content: message,
		});
	}

	static async _onLastStandRoll(event, target) {
		event.preventDefault();
		const lastStandDice = this.actor.system.lastStand.dice;
		const lastStandName = this.actor.system.lastStand.name;
		// Chat Message
		const roll = await new Roll(`{${lastStandDice}d6}`).evaluate();
		const results = roll.dice[0].results;
		const chatData = {
			dice: results,
			stat: game.i18n.localize("ETR.Dice.lastStandRoll"),
			isAttack: false,
		};
		const template = "systems/eat-the-reich/templates/chat/die-pool-output.hbs";

		ChatMessage.create({
			speaker: ChatMessage.getSpeaker({ actor: this.actor }),
			rollMode: game.settings.get("core", "rollMode"),
			rolls: [roll],
			flavor: lastStandName,
			content: await renderTemplate(template, chatData),
		});
	}

	static async _onAdvanceSelected(event, target) {
		event.preventDefault();
		const { property } = target.dataset;
		const item = this._getEmbeddedDocument(target);
		if (!item) return;
		let prop = foundry.utils.deepClone(foundry.utils.getProperty(item, property));
		await item.update({ [property]: !prop });
	}

	static async _onBloodUpdate(event, target) {
		event.preventDefault();
		const { value, property } = target.dataset;
		let prop = foundry.utils.deepClone(
			foundry.utils.getProperty(this.actor, property)
		);
		let index = Number(value) + 1; // Adjust for 1-index
		// Handle clicking the same checkbox to unset its value.
		if (!event.target.checked && prop === index) {
			index--;
		}
		prop = index;
		await this.actor.update({ [property]: prop });
	}

	static async _onClockUpdate(event, target) {
		event.preventDefault();
		const { value, property } = target.dataset;
		const item = this._getEmbeddedDocument(target);
		if (!item) return;
		let clockProp = foundry.utils.deepClone(
			foundry.utils.getProperty(item, property)
		);
		let index = Number(value) + 1; // Adjust for 1-index
		// Handle clicking the same checkbox to unset its value.
		if (!event.target.checked && clockProp.value === index) {
			index--;
		}
		clockProp.value = index;
		await item.update({ [property]: clockProp });
	}

	/**
	 * Handle clickable rolls.
	 *
	 * @this EatTheReichCharacterSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @protected
	 */
	static async _onRoll(event, target) {
		event.preventDefault();
		const dataset = target.dataset;
		const stat = dataset.stat;
		switch (dataset.rollType) {
			case "stat": {
				const statLabel = dataset.label ? dataset.label : "";
				const statValue = dataset.stat ? parseInt(dataset.stat) : 0;
				const selectedSeriousInjuries = Object.fromEntries(
					Object.entries(this.actor.system.injuries).filter(
						([_, group]) => group.second?.selected
					)
				);
				const hasSeriousInjury = Object.keys(selectedSeriousInjuries).length > 0;

				const content = await renderTemplate(
					"systems/eat-the-reich/templates/dialog/stat-roll.hbs",
					{
						stat: statValue,
						label: statLabel,
						injuries: selectedSeriousInjuries,
						hasInjuries: hasSeriousInjury,
					}
				);

				// Dialog
				const dicePool = await foundry.applications.api.DialogV2.wait({
					window: { title: "ETR.Dice.title" },
					content,
					modal: true,
					buttons: [
						{
							label: "ETR.Dice.label",
							action: "roll",
							callback: (event, button, dialog) => new FormDataExtended(button.form),
						},
					],
					rejectClose: false,
				});

				if (dicePool) {
					// Chat Message
					const totalDice =
						dicePool.object.stat +
						dicePool.object.equipment +
						dicePool.object.abilities;
					const roll = await new Roll(`{${totalDice}d6}`).evaluate();
					const chatData = {
						dice: roll.dice[0].results,
						stat: statLabel,
						isAttack: false,
					};
					const template =
						"systems/eat-the-reich/templates/chat/die-pool-output.hbs";

					ChatMessage.create({
						speaker: ChatMessage.getSpeaker({ actor: this.actor }),
						rolls: [roll],
						rollMode: game.settings.get("core", "rollMode"),
						content: await renderTemplate(template, chatData),
					});
				}
			}
		}
	}
}
