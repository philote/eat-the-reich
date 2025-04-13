const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * ApplicationV2 dialog for handling Flashback mechanics.
 */
export class FlashbackDialogApp extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["etr", "dialog", "etr-flashback-dialog"],
    position: {
      width: 450,
      height: "auto",
    },
    window: {
      title: "ETR.Flashback.Title",
      resizable: false
    },
    tag: "form",
    form: {
      closeOnSubmit: false,
      handler: this.onSubmit,
    },
    actions: {
      confirm: this.onConfirm,
      cancel: this.onCancel,
      randomize: this.onClickRandomize,
      changeSelect: this.onChangeSelect
    }
  };

  /** @inheritdoc */
  static PARTS = {
    content: {
      template: "systems/eat-the-reich/templates/dialog/flashback-dialog.hbs",
    }
  };


  /** @inheritdoc */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    // Validate required context data
    if (!options.context?.actor || !options.context?.rollConfig) {
      throw new Error("FlashbackDialogApp requires actor and rollConfig in context options.");
    }
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    // Prepare options for the template dropdowns
    const contextOptions = Object.entries(CONFIG.ETR.flashbackContext ?? {}).map(([key, locKey]) => ({ key, label: game.i18n.localize(locKey) }));
    const questionOptions = Object.entries(CONFIG.ETR.flashbackQuestion ?? {}).map(([key, locKey]) => ({ key, label: game.i18n.localize(locKey) }));
    const characterOptions = game.actors.filter(a => a.type === 'character' && a.id !== this.options.context.actor.id && a.hasPlayerOwner).map(a => ({ id: a.id, name: a.name }));

    // Initial state for custom inputs (hidden by default)
    // We manage visibility directly via style in #onChangeSelect, so no need to pass state here.

    // Return the full context for Handlebars
    return {
      ...this.options.context, // Pass actor and rollConfig through
      contextOptions,
      questionOptions,
      characterOptions
      // No need to define buttons here if using actions and template buttons
    };
  }

  /**
   * Handle changes on select dropdowns to toggle custom input visibility.
   * Note: This needs data-action="changeSelect" on the select elements in the template.
   * @param {Event} event   The change event.
   * @param {HTMLElement} target The select element.
   * @private
   */
  static onChangeSelect(event, target) {
    const name = target.name; // e.g., contextSelect
    const customInputName = name.replace('Select', 'Custom'); // e.g., contextCustom
    // Find the input within the same form-group for better scoping
    const customInput = target.closest('.form-group')?.querySelector(`input[name="${customInputName}"]`);

    if (customInput) {
      const show = target.value === 'custom';
      customInput.style.display = show ? 'block' : 'none'; // Use style for visibility
    }
  }

  /**
   * Handle clicks on randomize buttons.
   * Note: This needs data-action="randomize" and data-target="<type>" on the button elements.
   * @param {Event} event   The click event.
   * @param {HTMLElement} target The button element.
   * @private
   */
  static onClickRandomize(event, target) {
    const targetType = target.dataset.target; // 'context', 'question', or 'character'
    if (!targetType) return;

    const optionsKey = `${targetType}Options`; // e.g., 'contextOptions'
    const selectName = `${targetType}Select`; // e.g., 'contextSelect'
    
    // In ApplicationV2, 'this' in a static method refers to the application instance
    // Find all options in the DOM
    const select = target.closest('.form-group')?.querySelector(`select[name="${selectName}"]`);
    if (!select) return;
    
    // Get all options from the select element
    const options = Array.from(select.querySelectorAll('option')).filter(o => o.value && o.value !== 'custom');

    if (options && options.length > 0) {
      const randomOption = options[Math.floor(Math.random() * options.length)];
      // We already have the select element
      select.value = randomOption.value;
      // Programmatically trigger change event to update custom input visibility
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  /**
   * Default form submission handler (can be empty if button actions handle everything).
   * @param {Event} event   The submit event.
   * @param {HTMLFormElement} form The form element.
   * @param {FormDataExtended} formData The form data.
   * @private
   */
  static async onSubmit(event, form, formData) {
     // Intentionally left blank as #onConfirm handles the primary action via button click.
     // This prevents default form submission behavior if somehow triggered.
     event.preventDefault();
     console.debug("ETR | FlashbackDialogApp form submitted, but action handled by button click.");
  }


  /**
   * Handle confirming the dialog via the button click.
   * Note: This needs data-action="confirm" on the confirm button element.
   * @param {Event} event   The click event.
   * @param {HTMLElement} target The button element.
   * @private
   */
  static async onConfirm(event, target) {
    event.preventDefault(); // Prevent default button behavior
    
    // Get the application instance from the DOM
    const appInstance = foundry.applications.api.ApplicationV2.get(target.closest('[data-appid]').dataset.appid);
    if (!appInstance) {
      ui.notifications.error("ETR | Could not find application instance.");
      return;
    }
    
    const form = appInstance.element; // The root element is the form
    const formData = new FormDataExtended(form);
    const data = formData.object; // Get processed form data

    // Access context data from the application instance
    const { actor, rollConfig } = appInstance.options.context;
    
    if (!actor || !rollConfig) {
        ui.notifications.error("ETR | Missing required data for flashback.");
        return; // Should not happen due to validation check
    }

    // Get selected/custom values
    let contextVal = data.contextSelect === 'custom' ? data.contextCustom : CONFIG.ETR.flashbackContext?.[data.contextSelect];
    let questionVal = data.questionSelect === 'custom' ? data.questionCustom : CONFIG.ETR.flashbackQuestion?.[data.questionSelect];
    let characterId = data.characterSelect === 'custom' ? null : data.characterSelect;
    let characterName = "Someone"; // Default
    if (data.characterSelect === 'custom') {
        characterName = data.characterCustom || "Someone (Custom)";
    } else if (characterId) {
        // Find character in the actors collection directly
        const character = game.actors.get(characterId);
        characterName = character?.name || "Someone";
    }
    let description = data.description;

    // Localize context/question if they came from config keys
    if (data.contextSelect !== 'custom' && contextVal) contextVal = game.i18n.localize(contextVal);
    if (data.questionSelect !== 'custom' && questionVal) questionVal = game.i18n.localize(questionVal);

    // Ensure question is a string before replacing
    questionVal = questionVal || "";

    // Replace [character] placeholder
    questionVal = questionVal.replace("[character]", `<b>${characterName}</b>`);

    // --- Perform Re-roll ---
    const baseDice = rollConfig.statValue + rollConfig.equipmentDice + rollConfig.abilityDice;
    const flashbackDice = Math.max(1, baseDice + 2); // Ensure at least 1 die
    const roll = await new Roll(`{${flashbackDice}d6}`).evaluate();

    // --- Create New Chat Message ---
    const chatData = {
      dice: roll.dice[0].results,
      stat: rollConfig.statLabel,
      isAttack: false, // Flashback rolls are not attacks
    };
    const chatTemplate = "systems/eat-the-reich/templates/chat/die-pool-output.hbs";
    const rollContent = await renderTemplate(chatTemplate, chatData);

    const flashbackFlavor = game.i18n.format("ETR.Flashback.RollMessage", {
      context: contextVal || "Custom Context",
      question: questionVal || "Custom Question",
      characterName: characterName,
      description: description || "No description provided."
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: flashbackFlavor,
      content: rollContent,
      rolls: [roll],
      rollMode: game.settings.get("core", "rollMode"),
      flags: { "eat-the-reich": { isFlashback: true, originalMessageId: this.options.context.messageId } } // Optional: Link back
    });

    // Close the dialog - get the application instance from the DOM
    const dialogApp = foundry.applications.api.ApplicationV2.get(target.closest('[data-appid]').dataset.appid);
    if (dialogApp) dialogApp.close();
  }

  /**
   * Handle canceling the dialog.
   * Note: This needs data-action="cancel" on the cancel button element.
   * @param {Event} event   The click event.
   * @param {HTMLElement} target The button element.
   * @private
   */
  static onCancel(event, target) {
    // Get the application instance from the DOM
    const cancelApp = foundry.applications.api.ApplicationV2.get(target.closest('[data-appid]').dataset.appid);
    if (cancelApp) cancelApp.close(); // Close the application window
  }

  /**
   * Override render to ensure initial state of custom inputs is correct after render.
   * @param {boolean} [force=false]  Whether to force rendering.
   * @param {object} [options={}]    Additional rendering options.
   * @returns {Promise<ApplicationV2>} The rendered application instance.
   */
  async render(force = false, options = {}) {
      await super.render(force, options);

      // Ensure initial visibility of custom fields after render by triggering change handler
      this.element.querySelectorAll('select[name$="Select"]').forEach(select => {
          FlashbackDialogApp.onChangeSelect.call(this, null, select); // Call static method with correct 'this' context
      });

      return this;
  }
}