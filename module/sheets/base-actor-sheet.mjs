const { api, sheets } = foundry.applications;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheetV2}
 */
export default class EatTheReichActorSheet extends api.HandlebarsApplicationMixin(
	sheets.ActorSheetV2
) {
	constructor(options = {}) {
		super(options);
		this.#dragDrop = this.#createDragDropHandlers();
	}

	/** @override */
	static DEFAULT_OPTIONS = {
		classes: ["eat-the-reich", "actor"],
		position: {
			width: 600,
			height: 700,
		},
		window: {
			resizable: true,
		},
		actions: {
			onEditImage: this._onEditImage,
			viewDoc: this._viewDoc,
			createDoc: this._createDoc,
			deleteDoc: this._deleteDoc,
		},
		// Custom property that's merged into `this.options`
		dragDrop: [{ dragSelector: "[data-drag]", dropSelector: null }],
		form: {
			submitOnChange: true,
		},
	};

	/** @override */
	_configureRenderOptions(options) {
		super._configureRenderOptions(options);
		if (options.mode && this.isEditable) this.#mode = options.mode;
		// TODO: Refactor to use _configureRenderParts in v13
	}

	/** @override */
	async _prepareContext(options) {
		// Output initialization
		const context = {
			isPlay: this.isPlayMode,
			// Validates both permissions and compendium status
			editable: this.isEditable,
			owner: this.document.isOwner,
			limited: this.document.limited,
			gm: game.user.isGM,
			// Add the actor document.
			actor: this.actor,
			// Add the actor's data to context.data for easier access, as well as flags.
			system: this.actor.system,
			systemSource: this.actor.system._source,
			flags: this.actor.flags,
			// Adding a pointer to CONFIG.ETR
			config: CONFIG.ETR,
			// Necessary for formInput and formFields helpers
			fields: this.document.schema.fields,
			systemFields: this.document.system.schema.fields,
		};

		return context;
	}

	/**
	 * Available sheet modes.
	 * @enum {number}
	 */
	static MODES = {
		PLAY: 1,
		EDIT: 2,
	};

	/**
	 * The mode the sheet is currently in.
	 * @type {ActorSheetV2.MODES}
	 */
	#mode = EatTheReichActorSheet.MODES.PLAY;

	/**
	 * Is this sheet in Play Mode?
	 * @returns {boolean}
	 */
	get isPlayMode() {
		return this.#mode === EatTheReichActorSheet.MODES.PLAY;
	}

	/**
	 * Is this sheet in Edit Mode?
	 * @returns {boolean}
	 */
	get isEditMode() {
		return this.#mode === EatTheReichActorSheet.MODES.EDIT;
	}

	/**
	 * Actions performed after any render of the Application.
	 * Post-render steps are not awaited by the render process.
	 * @param {ApplicationRenderContext} context      Prepared context data
	 * @param {RenderOptions} options                 Provided render options
	 * @protected
	 * @override
	 */
	_onRender(context, options) {
		this.#dragDrop.forEach((d) => d.bind(this.element));
		// You may want to add other special handling here
		// Foundry comes with a large number of utility classes, e.g. SearchFilter
		// That you may want to implement yourself.
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

	/**************
	 *
	 *   ACTIONS
	 *
	 **************/

	/**
	 * Handle changing a Document's image.
	 *
	 * @this EatTheReichCharacterSheet
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

	/**
	 * Toggle Edit vs. Play mode
	 *
	 * @this EatTheReichCharacterSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 */
	static async _toggleMode(event, target) {
		if (!this.isEditable) {
			console.error("You can't switch to Edit mode if the sheet is uneditable");
			return;
		}
		// this.#mode = this.isPlayMode
		// 	? EatTheReichActorSheet.MODES.EDIT
		// 	: EatTheReichActorSheet.MODES.PLAY;
		this.render();
	}

	/**
	 * Renders an embedded document's sheet
	 *
	 * @this EatTheReichCharacterSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @protected
	 */
	static async _viewDoc(event, target) {
		const doc = this._getEmbeddedDocument(target);
		doc.sheet.render(true);
	}

	/**
	 * Handles item deletion
	 *
	 * @this EatTheReichCharacterSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @protected
	 */
	static async _deleteDoc(event, target) {
		const doc = this._getEmbeddedDocument(target);
		await doc.delete();
	}

	/**
	 * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
	 *
	 * @this EatTheReichCharacterSheet
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 * @private
	 */
	static async _createDoc(event, target) {
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

	/** Helper Functions */

	/**
	 * Fetches the embedded document representing the containing HTML element
	 *
	 * @param {HTMLElement} target    The element subject to search
	 * @returns {Item} The embedded Item
	 */
	_getEmbeddedDocument(target) {
		const docRow = target.closest("li[data-document-class]");
		if (docRow.dataset.documentClass === "Item") {
			return this.actor.items.get(docRow.dataset.itemId);
		} else return console.warn("Could not find document class");
	}

	/***************
	 *
	 * Drag and Drop
	 *
	 ***************/

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
		const docRow = event.currentTarget.closest("li");
		if ("link" in event.target.dataset) return;

		// Chained operation
		let dragData = this._getEmbeddedDocument(docRow)?.toDragData();

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
		const actor = this.actor;
		const allowed = Hooks.call("dropActorSheetData", actor, this, data);
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

	/**
	 * Handle dropping of an Actor data onto another Actor sheet
	 * @param {DragEvent} event            The concluding DragEvent which contains drop data
	 * @param {object} data                The data transfer extracted from the event
	 * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
	 *                                     not permitted.
	 * @protected
	 */
	async _onDropActor(event, data) {
		if (!this.actor.isOwner) return false;
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
		if (!this.actor.isOwner) return false;
		const item = await Item.implementation.fromDropData(data);

		// Handle item sorting within the same Actor
		if (this.actor.uuid === item.parent?.uuid)
			return this._onSortItem(event, item);

		// Create the owned item
		return this._onDropItemCreate(item, event);
	}

	/**
	 * Handle dropping of a Folder on an Actor Sheet.
	 * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
	 * @param {DragEvent} event     The concluding DragEvent which contains drop data
	 * @param {object} data         The data transfer extracted from the event
	 * @returns {Promise<Item[]>}
	 * @protected
	 */
	async _onDropFolder(event, data) {
		if (!this.actor.isOwner) return [];
		const folder = await Folder.implementation.fromDropData(data);
		if (folder.type !== "Item") return [];
		const droppedItemData = await Promise.all(
			folder.contents.map(async (item) => {
				if (!(document instanceof Item)) item = await fromUuid(item.uuid);
				return item;
			})
		);
		return this._onDropItemCreate(droppedItemData, event);
	}

	/**
	 * Handle the final creation of dropped Item data on the Actor.
	 * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
	 * @param {object[]|object} itemData      The item data requested for creation
	 * @param {DragEvent} event               The concluding DragEvent which provided the drop data
	 * @returns {Promise<Item[]>}
	 * @private
	 */
	async _onDropItemCreate(itemData, event) {
		itemData = itemData instanceof Array ? itemData : [itemData];
		return this.actor.createEmbeddedDocuments("Item", itemData);
	}

	/**
	 * Handle a drop event for an existing embedded Item to sort that Item relative to its siblings
	 * @param {Event} event
	 * @param {Item} item
	 * @private
	 */
	_onSortItem(event, item) {
		// Get the drag source and drop target
		const items = this.actor.items;
		const dropTarget = event.target.closest("[data-item-id]");
		if (!dropTarget) return;
		const target = items.get(dropTarget.dataset.itemId);

		// Don't sort on yourself
		if (item.id === target.id) return;

		// Identify sibling items based on adjacent HTML elements
		const siblings = [];
		for (let el of dropTarget.parentElement.children) {
			const siblingId = el.dataset.itemId;
			if (siblingId && siblingId !== item.id)
				siblings.push(items.get(el.dataset.itemId));
		}

		// Perform the sort
		const sortUpdates = SortingHelpers.performIntegerSort(item, {
			target,
			siblings,
		});
		const updateData = sortUpdates.map((u) => {
			const update = u.update;
			update._id = u.target._id;
			return update;
		});

		// Perform the update
		return this.actor.updateEmbeddedDocuments("Item", updateData);
	}

	/********************
	 *
	 * Actor Override Handling
	 *
	 ********************/

	/**
	 * Submit a document update based on the processed form data.
	 * @param {SubmitEvent} event                   The originating form submission event
	 * @param {HTMLFormElement} form                The form element that was submitted
	 * @param {object} submitData                   Processed and validated form data to be used for a document update
	 * @returns {Promise<void>}
	 * @protected
	 * @override
	 */
	async _processSubmitData(event, form, submitData) {
		const overrides = foundry.utils.flattenObject(this.actor.overrides);
		for (let k of Object.keys(overrides)) delete submitData[k];
		await this.document.update(submitData);
	}
}
