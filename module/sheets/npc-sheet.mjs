import EatTheReichActorSheet from "./base-actor-sheet.mjs";
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {EatTheReichActorSheet}
 */
export default class EatTheReichNPCSheet extends EatTheReichActorSheet {
	/** @override */
	static DEFAULT_OPTIONS = {
		classes: ["npc"],
		position: {
			width: 500,
			height: 700,
		},
		window: {
			icon: "fa-solid fa-person-military-rifle",
		},
		actions: {
			roll: this._onRoll,
			onClockUpdate: this._onClockUpdate,
			reinforcements: this._onReinforcements,
			attack: this._onAttack,
		},
	};

	/** @override */
	static PARTS = {
		npc: {
			template: "systems/eat-the-reich/templates/actor/npc-sheet.hbs",
			scrollable: [""],
		},
	};

	/** @override */
	_configureRenderOptions(options) {
		super._configureRenderOptions(options);
		// if (this.document.limited) return;
		options.parts = ["npc"];
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
			this.actor.system.description.value,
			{
				secrets: this.document.isOwner,
				rollData: this.actor.getRollData(),
				relativeTo: this.actor
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
		const extraInfo = [];
		for (let i of this.document.items) {
			// Append to extra Info.
			if (i.type === "extraInfo") {
				extraInfo.push(i);
			}
		}
		context.extraInfo = extraInfo.sort((a, b) => (a.sort || 0) - (b.sort || 0));
	}

	/**************
	 *
	 *   ACTIONS
	 *
	 **************/

	static async _onAttack(event, target) {
		event.preventDefault();
		const attackValue = this.actor.system.attack.value;

		const content = await renderTemplate("systems/eat-the-reich/templates/dialog/threat-roll.hbs", {
			attack: attackValue,
		});

		// Dialog
		const dicePool = await foundry.applications.api.DialogV2.wait({
			window: { title: "ETR.Dice.title" },
			content,
			modal: true,
			buttons: [
				{
					label: "ETR.Dice.label",
					action: "roll",
					callback: (event, button, dialog) => new FormDataExtended(button.form)
				}
			],
			rejectClose: false
		});
		
		if(dicePool) {
			// Chat Message
			const roll = await new Roll(`{${dicePool.object.attack}d6}`).evaluate();
			const results = roll.dice[0].results;
			const chatData = {
				dice: results,
				stat: game.i18n.localize("ETR.Dice.gmRoll"),
				isAttack: true,
			}
			const template = "systems/eat-the-reich/templates/chat/die-pool-output.hbs";

			ChatMessage.create({
				speaker: ChatMessage.getSpeaker({ actor: this.actor }),
				rollMode: game.settings.get("core", "rollMode"),
				content: await renderTemplate(template, chatData),
			});
			
			// If the GM rolls zero successes on their Attack dice, increase the Threat’s Attack by 1
			const successes = results.filter(r => r.result >= 4);
			if(successes.length === 0) {
				const newAttack = this.actor.system.attack.value + 1;
				await this.actor.update({
					"system.attack.value": newAttack
				});
			}
		}
	}

	static async _onReinforcements(event, target) {
		event.preventDefault();
		const newThreatMax = await new Roll("1d6").evaluate();
		const newAttack = this.actor.system.attack.value - 1;
		
		await this.actor.update({
			"system.threatRating.value": 0,
			"system.threatRating.max": newThreatMax.total,
			"system.attack.value": newAttack
		});

		ChatMessage.create({
			speaker: ChatMessage.getSpeaker({ actor: this.actor }),
			content: game.i18n.localize("ETR.Actor.NPC.reinforcementsArrival"),
		});
	}

	static async _onClockUpdate(event, target) {
		event.preventDefault();
		let { actionType, value, property } = target.dataset;
		let clockProp = foundry.utils.deepClone(
			foundry.utils.getProperty(this.actor, property)
		);
		const clockMin = 1;

		switch (actionType) {
			case "valueUpdate": {
				let index = Number(value) + 1; // Adjust for 1-index
				// Handle clicking the same checkbox to unset its value.
				if (!event.target.checked && clockProp.value === index) {
					index--;
				}
				clockProp.value = index;
				break;
			}
			case "sizeIncrease":
				++clockProp.max;
				break;
			case "sizeDecrease":
				if (clockProp.max > clockMin) {
					--clockProp.max;
					if (clockProp.value > clockProp.max) {
						clockProp.value = clockProp.max;
					}
				}
				break;
		}
		await this.actor.update({ [property]: clockProp });
	}

	/**
	 * Handle clickable rolls.
	 *
	 * @this EatTheReichNPC
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @protected
	 */
	static async _onRoll(event, target) {
		event.preventDefault();
		const dataset = target.dataset;

		const stat = dataset.stat
		switch (dataset.rollType) {
			case "stat": {
				const statLabel = dataset.label ? dataset.label : "";
				const statValue = dataset.stat ? parseInt(dataset.stat) : 0;
				const selectedSeriousInjuries = Object.fromEntries(
					Object.entries(this.actor.system.injuries)
						.filter(([_, group]) => group.second?.selected)
				);
				const hasSeriousInjury = Object.keys(selectedSeriousInjuries).length > 0;

				const content = await renderTemplate("systems/eat-the-reich/templates/dialog/stat-roll.hbs", {
					stat: statValue,
					label: statLabel,
					injuries: selectedSeriousInjuries,
					hasInjuries: hasSeriousInjury
				});

				// Dialog
				const dicePool = await foundry.applications.api.DialogV2.wait({
					window: { title: "ETR.Dice.title" },
					content,
					modal: true,
					buttons: [
						{
							label: "ETR.Dice.label",
							action: "roll",
							callback: (event, button, dialog) => new FormDataExtended(button.form)
						}
					],
					rejectClose: false
				});
				
				if(dicePool) {
					// Chat Message
					const totalDice = dicePool.object.stat + dicePool.object.equipment + dicePool.object.abilities
					const roll = await new Roll(`{${totalDice}d6}`).evaluate();
					const chatData = {
						dice: roll.dice[0].results,
						stat: statLabel,
						isAttack: false,
					}
					const template = "systems/eat-the-reich/templates/chat/die-pool-output.hbs";

					ChatMessage.create({
						speaker: ChatMessage.getSpeaker({ actor: this.actor }),
						rollMode: game.settings.get("core", "rollMode"),
						content: await renderTemplate(template, chatData),
					});
				}
			}
		}
	}
}
