const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * ApplicationV2 dialog for handling Flashback mechanics.
 */
export class FlashbackDialogApp extends HandlebarsApplicationMixin(
	ApplicationV2
) {
	/** @inheritdoc */
	static DEFAULT_OPTIONS = {
		classes: ["etr", "etr-dialog"],
		position: {
			width: 500,
		},
		window: {
			title: "ETR.Flashback.Title",
		},
		tag: "form",
		form: {
			closeOnSubmit: true,
		},
		actions: {
			randomize: this.onClickRandomize,
		},
	};

	/**
	 * The final prompt value to return to the requester
	 * @type {Object}
	 */
	promptValue;

	/** @inheritdoc */
	static PARTS = {
		content: {
			template: "systems/eat-the-reich/templates/dialog/flashback-dialog.hbs",
		},
	};

	/** @inheritdoc */
	_initializeApplicationOptions(options) {
		if (!options.context?.actorId) {
			throw new Error("FlashbackDialogApp requires actorId in context options.");
		}
		return super._initializeApplicationOptions(options);
	}

	/** @inheritdoc */
	async _prepareContext(options) {
		const context = {
			...this.options.context,
		};

		// Prepare options for the template dropdowns
		const customSelector = {
			custom: game.i18n.localize("ETR.Flashback.CustomOption"),
		};
		const contextOptions = Object.assign(
			CONFIG.ETR.flashbackContext,
			customSelector
		);
		const questionOptions = Object.assign(
			CONFIG.ETR.flashbackQuestion,
			customSelector
		);
		const characters = game.actors
			.filter(
				(a) =>
					a.type === "character" &&
					a.id !== this.options.context.actorId &&
					a.hasPlayerOwner
			)
			.reduce((obj, a, index) => {
				obj[index + 1] = a.name;
				return obj;
			}, {});
		const characterOptions = Object.assign(characters, customSelector);

		context.flashback.context.options = contextOptions;
		context.flashback.question.options = questionOptions;
		context.flashback.character.options = characterOptions;
		return context;
	}

	/**
	 * Amend the global modifiers and target specific modifiers based on changed values
	 * @inheritdoc
	 */
	_onChangeForm(formConfig, event) {
		super._onChangeForm(formConfig, event);
		const formData = foundry.utils.expandObject(
			new FormDataExtended(this.element).object
		);

		// convince variables
		const flashbackForm = formData.flashback;
		const flashbackOptions = this.options.context.flashback;
		const contextSelected = flashbackForm.context.selected;
		const questionSelected = flashbackForm.question.selected;
		const characterSelected = flashbackForm.character.selected;

		// Update the form data
		flashbackOptions.context.selected = contextSelected;
		flashbackOptions.context.custom = flashbackForm.context.custom;
		flashbackOptions.question.selected = questionSelected;
		flashbackOptions.question.custom = flashbackForm.question.custom;
		flashbackOptions.character.selected = characterSelected;
		flashbackOptions.character.custom = flashbackForm.character.custom;
		flashbackOptions.description = flashbackForm.description;

		// Render the form with updated data
		this.render(true);

		// Use setTimeout to apply the changes after rendering
		setTimeout(() => {
			const contextCustomInput = this.element.querySelector(
				`input[name="flashback.context.custom"]`
			);
			const questionCustomInput = this.element.querySelector(
				`input[name="flashback.question.custom"]`
			);
			const characterCustomInput = this.element.querySelector(
				`input[name="flashback.character.custom"]`
			);

			if (contextSelected === "custom") {
				contextCustomInput.style.display = "block";
			} else {
				contextCustomInput.style.display = "none";
			}

			if (questionSelected === "custom") {
				questionCustomInput.style.display = "block";
			} else {
				questionCustomInput.style.display = "none";
			}

			if (characterSelected === "custom") {
				characterCustomInput.style.display = "block";
			} else {
				characterCustomInput.style.display = "none";
			}
		}, 0);
	}

	/**
	 * Set a final context for resolving the prompt, then close the dialog
	 * @inheritdoc
	 */
	async _onSubmitForm(formConfig, event) {
		const formData = foundry.utils.expandObject(
			new FormDataExtended(this.element).object
		);

		const flashbackForm = formData.flashback;
		const flashbackOptions = this.options.context.flashback;

		let context = "";
		let question = "";
		let character = "";

		if (flashbackForm.context.selected != "custom") {
			context = flashbackOptions.context.options[flashbackForm.context.selected];
		} else {
			context = flashbackForm.context.custom;
		}
		if (flashbackForm.question.selected != "custom") {
			question =
				flashbackOptions.question.options[flashbackForm.question.selected];
		} else {
			question = flashbackForm.question.custom;
		}
		if (flashbackForm.character.selected != "custom") {
			character =
				flashbackOptions.character.options[flashbackForm.character.selected];
		} else {
			character = flashbackForm.character.custom;
		}

		this.promptValue = {
			context: context,
			question: question,
			character: character,
			description: flashbackForm.description,
		};

		super._onSubmitForm(formConfig, event);
	}

	/**
	 * Handle click event for the randomize button, randomly selecting an option from the dropdown.
	 * @param {PointerEvent} event   The originating click event
	 * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
	 */
	static onClickRandomize(event, target) {
		const targetType = target.dataset.target; // 'context', 'question', or 'character'
		if (!targetType) {
			this.render();
			return;
		}

		const selectName = `flashback.${targetType}.selected`;
		const select = target
			.closest(".form-group-stacked")
			?.querySelector(`select[name="${selectName}"]`);
		if (!select) {
			this.render();
			return;
		}

		// Get all options from the select element
		const options = Array.from(select.querySelectorAll("option")).filter(
			(o) => o.value && o.value !== "custom"
		);

		if (options && options.length > 0) {
			const randomOption = options[Math.floor(Math.random() * options.length)];
			select.value = randomOption.value;
			// Programmatically trigger change event to update custom input visibility
			select.dispatchEvent(new Event("change", { bubbles: true }));
		}
		this.render();
	}

	/* -------------------------------------------- */

	/**
	 * Spawn a FlashbackDialogApp and wait for it to be submitted or closed.
	 * @param {Partial<ApplicationConfiguration>} [options]
	 * @returns {Promise<FlashbackDialogApp | null>} Resolves to the final context to use for one or more power rolls.
	 * If the dialog was closed without rolling, it resolves to null.
	 */
	static async prompt(options) {
		// add flashback context to options
		options.context.flashback = {
			context: {
				options: {},
				selected: "0",
				custom: "",
			},
			question: {
				options: {},
				selected: "0",
				custom: "",
			},
			character: {
				options: {},
				selected: "0",
				custom: "",
			},
			description: "",
		};

		return new Promise((resolve, reject) => {
			const dialog = new this(options);
			dialog.addEventListener(
				"close",
				(event) => {
					if (dialog.promptValue) resolve(dialog.promptValue);
					else resolve(null);
				},
				{ once: true }
			);

			dialog.render({ force: true });
		});
	}
}
