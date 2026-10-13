const { api, sheets } = foundry.applications;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheetV2}
 */
export default class EatTheReichActorSheet extends api.HandlebarsApplicationMixin(
	sheets.ActorSheetV2
) {
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
			viewDoc: this._viewDoc,
			createDoc: this._createDoc,
			deleteDoc: this._deleteDoc,
		},
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

	/**************
	 *
	 *   ACTIONS
	 *
	 **************/

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
	 * Handle dropping a Folder of Items on an Actor Sheet by creating all of its items as owned items.
	 * Core ActorSheetV2 handles Item drops and sorting, but ignores Folders.
	 * @param {DragEvent} event     The initiating drop event
	 * @param {Folder} folder       The dropped Folder document
	 * @returns {Promise<Folder|null>}
	 * @protected
	 * @override
	 */
	async _onDropFolder(event, folder) {
		if (!this.actor.isOwner || folder.type !== "Item") return null;
		const items = await Promise.all(
			folder.contents.map((item) => (item instanceof Item ? item : fromUuid(item.uuid)))
		);
		const itemData = items.map((item) =>
			item.inCompendium
				? game.items.fromCompendium(item, { clearFolder: true })
				: item.toObject()
		);
		await this.actor.createEmbeddedDocuments("Item", itemData);
		return folder;
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
