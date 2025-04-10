import EatTheReichActorSheet from "./base-actor-sheet.mjs";
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {EatTheReichActorSheet}
 */
export default class EatTheReichLocationSheet extends EatTheReichActorSheet {
	/** @override */
	static DEFAULT_OPTIONS = {
		classes: ["location"],
		position: {
			width: 600,
			height: 700,
		},
		window: {
			icon: "fa-solid fa-map-location",
		},
		actions: {
			roll: this._onRoll,
			createDoc: this._createDocLocation,
		},
	};

	/** @override */
	static PARTS = {
		location: {
			template: "systems/eat-the-reich/templates/actor/location-sheet.hbs",
			scrollable: [""],
		},
	};

	/** @override */
	_configureRenderOptions(options) {
		super._configureRenderOptions(options);
		// if (this.document.limited) return;
		options.parts = ["location"];
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
				relativeTo: this.actor,
			}
		);
		context.enrichedEnemies = await TextEditor.enrichHTML(
			this.actor.system.enemies.value,
			{
				secrets: this.document.isOwner,
				rollData: this.actor.getRollData(),
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
		const loot = [];
		const equipment = [];
		const objectives = [];
		const secondaryObjectives = [];
		for (let i of this.document.items) {
			// Append to objectives.
			if (i.type === "objective") {
				if (i.system.isSecondary.value) {
					secondaryObjectives.push(i);
				} else {
					objectives.push(i);
				}
			}
			// Append to loot.
			else if (i.type === "loot") {
				loot.push(i);
			} else if (i.type === "equipment") {
				equipment.push(i);
			}
		}
		context.equipment = equipment.sort((a, b) => (a.sort || 0) - (b.sort || 0));
		context.loot = loot.sort((a, b) => (a.sort || 0) - (b.sort || 0));
		context.objectives = objectives.sort((a, b) => (a.sort || 0) - (b.sort || 0));
		context.secondaryObjectives = secondaryObjectives.sort(
			(a, b) => (a.sort || 0) - (b.sort || 0)
		);
	}

	/**************
	 *
	 *   ACTIONS
	 *
	 **************/

	/**
	 * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
	 *
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @private
	 */
	static async _createDocLocation(event, target) {
		// Retrieve the configured document class for Item
		const docCls = getDocumentClass(target.dataset.documentClass);
		// Prepare the document creation data by initializing it a default name.
		const docData = {
			name: docCls.defaultName({
				// defaultName handles an undefined type gracefully
				type: target.dataset.type,
				parent: this.actor,
			}),
		};
		// If subtype is secondaryObjective, set the isSecondary flag to true
		if (
			target.dataset.subtype &&
			(target.dataset.subtype = "secondaryObjective")
		) {
			let system = {
				isSecondary: {
					value: true,
				},
			};
			docData["system"] = system;
		}

		// Loop through the dataset and add it to our docData
		for (const [dataKey, value] of Object.entries(target.dataset)) {
			// These data attributes are reserved for the action handling
			if (["action", "documentClass"].includes(dataKey)) continue;
			// Nested properties require dot notation in the HTML, e.g. anything with `system`
			// An example exists in spells.hbs, with `data-system.spell-level`
			// which turns into the dataKey 'system.spellLevel'
			foundry.utils.setProperty(docData, dataKey, value);
		}

		// Finally, create the embedded document!
		await docCls.create(docData, { parent: this.actor, renderSheet: true });
	}

	/**
	 * Handle clickable rolls.
	 *
	 * @this EatTheReichLocationSheet
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
