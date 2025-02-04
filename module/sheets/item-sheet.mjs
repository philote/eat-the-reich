const { api, sheets } = foundry.applications;

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheetV2}
 */
export class EatTheReichItemSheet extends api.HandlebarsApplicationMixin(
	sheets.ItemSheetV2
) {
	constructor(options = {}) {
		super(options);
		this.#dragDrop = this.#createDragDropHandlers();
	}

	/** @override */
	static DEFAULT_OPTIONS = {
		classes: ["eat-the-reich", "item"],
		actions: {
			onEditImage: this._onEditImage,
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
		// Custom property that's merged into `this.options`
		dragDrop: [{ dragSelector: "[data-drag]", dropSelector: null }],
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
		loot: {
			template: "systems/eat-the-reich/templates/item/loot.hbs",
		},
		description: {
			template: "systems/eat-the-reich/templates/item/description.hbs",
			scrollable: [""],
		},
	};

	/** @override */
	_configureRenderOptions(options) {
		super._configureRenderOptions(options);
		options.parts = ["header"];
		// Control which parts show based on document subtype
		switch (this.document.type) {
			case "ability":
				options.parts.push("description");
				break;
			case "advance":
				options.parts.push("description", "advance");
				break;
			case "loot":
				options.parts.push("loot", "equipment");
				break;
			case "equipment":
				options.parts.push("equipment");
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
				context.enrichedDescription = await TextEditor.enrichHTML(
					this.item.system.description,
					{
						// Whether to show secret blocks in the finished html
						secrets: this.document.isOwner,
						// Data to fill in for inline rolls
						rollData: this.item.getRollData(),
						// Relative UUID resolution
						relativeTo: this.item,
					}
				);
		}
		return context;
	}

	/**
	 * Actions performed after any render of the Application.
	 * Post-render steps are not awaited by the render process.
	 * @param {ApplicationRenderContext} context      Prepared context data
	 * @param {RenderOptions} options                 Provided render options
	 * @protected
	 */
	_onRender(context, options) {
		this.#dragDrop.forEach((d) => d.bind(this.element));
		// You may want to add other special handling here
		// Foundry comes with a large number of utility classes, e.g. SearchFilter
		// That you may want to implement yourself.
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
				await this.item.update({ [property]: clockProp });
				break;
			}
			case "sizeIncrease":
				++clockProp.max;
				await this.item.update({ [property]: clockProp });
				break;
			case "sizeDecrease":
				if (clockProp.max > clockMin) {
					--clockProp.max;
					if (clockProp.value > clockProp.max) {
						clockProp.value = clockProp.max;
					}
				}
				await this.item.update({ [property]: clockProp });
				break;
		}
	}

	/**
	 * Handle changing a Document's image.
	 *
	 * @this EatTheReichItemSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @returns {Promise}
	 * @protected
	 */
	static async _onEditImage(event, target) {
		const attr = target.dataset.edit;
		const current = foundry.utils.getProperty(this.document, attr);
		const { img } =
			this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ??
			{};
		const fp = new FilePicker({
			current,
			type: "image",
			redirectToRoot: img ? [img] : [],
			callback: (path) => {
				this.document.update({ [attr]: path });
			},
			top: this.position.top + 40,
			left: this.position.left + 10,
		});
		return fp.browse();
	}

	/** Helper Functions */

	/**
	 *
	 * DragDrop
	 *
	 */

	/**
	 * Define whether a user is able to begin a dragstart workflow for a given drag selector
	 * @param {string} selector       The candidate HTML selector for dragging
	 * @returns {boolean}             Can the current user drag this selector?
	 * @protected
	 */
	_canDragStart(selector) {
		// game.user fetches the current user
		return this.isEditable;
	}

	/**
	 * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
	 * @param {string} selector       The candidate HTML selector for the drop target
	 * @returns {boolean}             Can the current user drop on this selector?
	 * @protected
	 */
	_canDragDrop(selector) {
		// game.user fetches the current user
		return this.isEditable;
	}

	/**
	 * Callback actions which occur at the beginning of a drag start workflow.
	 * @param {DragEvent} event       The originating DragEvent
	 * @protected
	 */
	_onDragStart(event) {
		const li = event.currentTarget;
		if ("link" in event.target.dataset) return;

		let dragData = null;

		if (!dragData) return;

		// Set data transfer
		event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
	}

	/**
	 * Callback actions which occur when a dragged element is over a drop target.
	 * @param {DragEvent} event       The originating DragEvent
	 * @protected
	 */
	_onDragOver(event) {}

	/**
	 * Callback actions which occur when a dragged element is dropped on a target.
	 * @param {DragEvent} event       The originating DragEvent
	 * @protected
	 */
	async _onDrop(event) {
		const data = TextEditor.getDragEventData(event);
		const item = this.item;
		const allowed = Hooks.call("dropItemSheetData", item, this, data);
		if (allowed === false) return;

		// Handle different data types
		switch (data.type) {
			case "Actor":
				return this._onDropActor(event, data);
			case "Item":
				return this._onDropItem(event, data);
			case "Folder":
				return this._onDropFolder(event, data);
		}
	}

	/* -------------------------------------------- */

	/**
	 * Handle dropping of an Actor data onto another Actor sheet
	 * @param {DragEvent} event            The concluding DragEvent which contains drop data
	 * @param {object} data                The data transfer extracted from the event
	 * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
	 *                                     not permitted.
	 * @protected
	 */
	async _onDropActor(event, data) {
		if (!this.item.isOwner) return false;
	}

	/* -------------------------------------------- */

	/**
	 * Handle dropping of an item reference or item data onto an Actor Sheet
	 * @param {DragEvent} event            The concluding DragEvent which contains drop data
	 * @param {object} data                The data transfer extracted from the event
	 * @returns {Promise<Item[]|boolean>}  The created or updated Item instances, or false if the drop was not permitted.
	 * @protected
	 */
	async _onDropItem(event, data) {
		if (!this.item.isOwner) return false;
	}

	/* -------------------------------------------- */

	/**
	 * Handle dropping of a Folder on an Actor Sheet.
	 * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
	 * @param {DragEvent} event     The concluding DragEvent which contains drop data
	 * @param {object} data         The data transfer extracted from the event
	 * @returns {Promise<Item[]>}
	 * @protected
	 */
	async _onDropFolder(event, data) {
		if (!this.item.isOwner) return [];
	}

	/** The following pieces set up drag handling and are unlikely to need modification  */

	/**
	 * Returns an array of DragDrop instances
	 * @type {DragDrop[]}
	 */
	get dragDrop() {
		return this.#dragDrop;
	}

	// This is marked as private because there's no real need
	// for subclasses or external hooks to mess with it directly
	#dragDrop;

	/**
	 * Create drag-and-drop workflow handlers for this Application
	 * @returns {DragDrop[]}     An array of DragDrop handlers
	 * @private
	 */
	#createDragDropHandlers() {
		return this.options.dragDrop.map((d) => {
			d.permissions = {
				dragstart: this._canDragStart.bind(this),
				drop: this._canDragDrop.bind(this),
			};
			d.callbacks = {
				dragstart: this._onDragStart.bind(this),
				dragover: this._onDragOver.bind(this),
				drop: this._onDrop.bind(this),
			};
			return new DragDrop(d);
		});
	}
}
