const { api, sheets } = foundry.applications;

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheetV2}
 */
export default class EatTheReichItemSheet extends api.HandlebarsApplicationMixin(
	sheets.ItemSheetV2
) {
	/** @override */
	static DEFAULT_OPTIONS = {
		classes: ["eat-the-reich", "item"],
		actions: {
			onClockUpdate: this._onClockUpdate,
		},
		position: {
			width: 460,
			height: "auto",
		},
		window: {
			icon: "fa-solid fa-toolbox",
			resizable: true,
		},
		form: {
			submitOnChange: true,
		},
	};

	/* -------------------------------------------- */

	/** @override */
	static PARTS = {
		header: {
			template: "systems/eat-the-reich/templates/item/header.hbs",
		},
		advance: {
			template: "systems/eat-the-reich/templates/item/advance.hbs",
		},
		equipment: {
			template: "systems/eat-the-reich/templates/item/equipment.hbs",
		},
		objective: {
			template: "systems/eat-the-reich/templates/item/objective.hbs",
		},
		description: {
			template: "systems/eat-the-reich/templates/item/description.hbs",
			scrollable: [""],
		},
		bonus: {
			template: "systems/eat-the-reich/templates/item/bonus.hbs",
		},
	};

	/** @override */
	_configureRenderOptions(options) {
		super._configureRenderOptions(options);
		options.parts = ["header"];
		// Control which parts show based on document subtype
		switch (this.document.type) {
			case "ability":
				options.parts.push("bonus", "description");
				break;
			case "advance":
				options.parts.push("bonus", "advance", "description");
				break;
			case "objective":
				options.parts.push("objective", "description");
				break;
			case "loot":
				options.parts.push("bonus", "equipment");
				break;
			case "equipment":
				options.parts.push("bonus", "equipment");
				break;
			case "extraInfo":
				options.parts.push("description");
				break;
		}
	}

	/* -------------------------------------------- */

	/** @override */
	async _prepareContext(options) {
		const context = {
			// Validates both permissions and compendium status
			editable: this.isEditable,
			owner: this.document.isOwner,
			limited: this.document.limited,
			// Add the item document.
			item: this.item,
			// Adding system and flags for easier access
			system: this.item.system,
			systemSource: this.item.system._source,
			flags: this.item.flags,
			// Adding a pointer to CONFIG.ETR
			config: CONFIG.ETR,
			// Necessary for formInput and formFields helpers
			fields: this.document.schema.fields,
			systemFields: this.document.system.schema.fields,
		};

		return context;
	}

	/** @override */
	async _preparePartContext(partId, context) {
		switch (partId) {
			case "description":
				context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
					this.item.system.description.value,
					{
						secrets: this.document.isOwner,
						rollData: this.item.getRollData(),
						relativeTo: this.item
					}
				);
		}
		return context;
	}

	/**************
	 *
	 *   ACTIONS
	 *
	 **************/
	
	static async _onClockUpdate(event, target) {
		event.preventDefault();
		let { actionType, value, property } = target.dataset;
		let clockProp = foundry.utils.deepClone(
			foundry.utils.getProperty(this.item, property)
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
		await this.item.update({ [property]: clockProp });
	}
}
