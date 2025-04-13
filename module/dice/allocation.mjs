import { FlashbackDialogApp } from "../apps/flashback-dialog-app.mjs";

/**
 * @class DiceAllocation
 * Handles allocation/crossing-out of dice shown in chat messages for the Eat the Reich system.
 * It works by:
 * 1. Attaching a single click listener to the chat log container (`renderChatLog` hook).
 * 2. When a die is clicked (`_handleDieClick`):
 *    - It parses the message's HTML content.
 *    - Finds the corresponding die element within the parsed HTML using specific attributes/classes.
 *    - Toggles data attributes (`data-allocated`, `data-crossed-out`) on the parsed element.
 *    - Updates the message's content (`message.update({ content: ... })`) with the modified HTML.
 *    - Provides immediate visual feedback by toggling CSS classes on the clicked element.
 * 3. When messages render (`renderChatMessage`, `renderChatLog` hooks):
 *    - It reads the `data-allocated` and `data-crossed-out` attributes from the dice HTML.
 *    - Applies the corresponding CSS classes (`.allocated`, `.crossed-out`, `.disabled`) for styling.
 * This approach ensures persistence by storing state in the message content itself.
 */
export class DiceAllocation {
	/**
	 * Attaches the primary click listener to the chat log container.
	 * Should be called ONCE when the chat log is initially rendered.
	 * @param {jQuery} html - The jQuery object representing the chat log container.
	 */
	static chatListeners(html) {
		// Use .off first to prevent duplicate listeners if this somehow gets called multiple times
		html.off("click.etrAllocation");
		html.on(
			"click.etrAllocation", // Add namespace for easier removal if needed
			`.message .roll.die.d6`, // Target only d6 dice within messages in the log
			this._handleDieClick.bind(this)
		);

		// Flashback button click handler
		html.off("click.etrFlashback");
		html.on(
			"click.etrFlashback",
			".etr-flashback-btn",
			this._handleFlashbackClick.bind(this)
		);
	}

	/**
	 * Handler for the 'renderChatMessage' hook. Applies styles to dice in a single message.
	 * @param {ChatMessage} message - The ChatMessage document being rendered.
	 * @param {jQuery} html - The jQuery object for the message's HTML.
	 * @param {object} data - Additional data provided by the hook.
	 */
	static onRenderChatMessage(message, html, data) {
		// Check if this message contains any attack dice
		const isAttackRoll =
			html.find('.roll.die.d6[data-is-attack="true"]').length > 0;
		this._applyStylesFromAttributes(html, isAttackRoll);

		// --- Flashback Button Logic ---
		const flashbackBtn = html.find(".etr-flashback-btn");
		if (flashbackBtn.length) {
			// Determine if the button should be shown
			let showButton = false;
			if (!isAttackRoll) {
				// Only for player rolls
				const rollConfig = message.getFlag("eat-the-reich", "rollConfig");
				// Get dice results from the DOM instead of message.rolls
				const numSuccesses = html.find(
					".roll.die.d6.success, .roll.die.d6.critical"
				).length;

				if (rollConfig && numSuccesses <= 2) {
					showButton = true;
				}
			}

			// Add or remove the 'hidden' class based on the check
			if (showButton) {
				flashbackBtn.removeClass("hidden");
			} else {
				// Ensure it's hidden if conditions aren't met
				flashbackBtn.addClass("hidden");
			}
		}
	}

	/**
	 * Handler for the 'renderChatLog' hook. Applies styles to all messages within the log.
	 * @param {Application} app - The ChatLog application instance.
	 * @param {jQuery} html - The jQuery object for the chat log's outer HTML.
	 * @param {object} data - Additional data provided by the hook.
	 */
	static onRenderChatLog(app, html, data) {
		html.find(".message").each((i, msgElement) => {
			const messageId = msgElement.dataset.messageId;
			if (!messageId) return;
			const message = game.messages.get(messageId);
			if (message) {
				// Pass the specific message element jQuery object
				// Check if this message contains any attack dice
				const isAttackRoll =
					html.find('.roll.die.d6[data-is-attack="true"]').length > 0;
				this._applyStylesFromAttributes($(msgElement), isAttackRoll);
			}
		});
	}

	/**
	 * Apply CSS classes (.allocated, .crossed-out, .disabled) to dice elements
	 * within the provided HTML jQuery object based on their data attributes.
	 * This function reads the state from the HTML attributes set by _handleDieClick.
	 * @param {jQuery} html - jQuery object for the container of dice elements (usually a single message).
	 * @param {boolean} isAttack - Whether the roll was made an attack roll.
	 */
	static _applyStylesFromAttributes(html, isAttack) {
		const diceElements = html.find(".roll.die.d6");
		diceElements.each((i, el) => {
			const die = $(el);
			// Clear previous classes to ensure accurate state reflection
			die.removeClass("allocated crossed-out disabled");
			const dieValue = parseInt(die.attr("data-die-value"));

			// Apply classes based on data attributes present in the HTML
			const isAllocated = die.attr("data-allocated") === "true";
			const isCrossedOut = die.attr("data-crossed-out") === "true";

			if (isAllocated) die.addClass("allocated");
			if (isCrossedOut) die.addClass("crossed-out");

			// Apply disabled state based on value for non-GM rolls
			if (!isAttack && !isNaN(dieValue) && dieValue < 4) {
				die.addClass("disabled");
			}
		});
	}

	/**
	 * Handle clicks on dice elements.
	 * Updates the underlying message content HTML with data attributes reflecting the new state,
	 * then triggers a message update. Also provides immediate visual feedback.
	 * @param {Event} event - The click event.
	 */
	static async _handleDieClick(event) {
		event.preventDefault();
		const die = $(event.currentTarget);

		// Ensure the click is within the chat log specifically
		if (!die.closest("#chat-log").length) return;

		// Prevent action if the die is visually disabled
		if (die.hasClass("disabled")) return;

		const messageElement = die.closest(".message");
		if (!messageElement.length) {
			return;
		}
		const messageId = messageElement.data("messageId");
		const message = game.messages.get(messageId);
		if (!message) {
			return;
		}

		// Check permissions
		if (!message.isOwner && !game.user.isGM) {
			ui.notifications.warn(
				game.i18n.localize("ETR.Notifications.NoPermissionModifyRoll")
			); // Use localization
			return;
		}

		const isAttack = die.attr("data-is-attack");

		// --- Identify the clicked die uniquely within the message content ---
		const clickedDieIndex = die.attr("data-die-index"); // Index within its partition
		const clickedDieValueAttr = die.attr("data-die-value");
		let clickedCategory = "unknown"; // Determine category for selector
		if (die.hasClass("critical")) clickedCategory = "critical";
		else if (die.hasClass("success")) clickedCategory = "success";
		else if (die.hasClass("discard")) clickedCategory = "discard";
		else {
			// Fallback if class isn't present? Might happen during render timing issues.
			// Log a warning, but proceed with the less specific selector for now.
			console.warn(
				`ETR-TEST | Could not determine category class for clicked die (Index: ${clickedDieIndex}, Value: ${clickedDieValueAttr}). Falling back to less specific selector.`
			);
		}

		// --- Parse HTML ---
		const parser = new DOMParser();
		const doc = parser.parseFromString(
			`<div>${message.content}</div>`,
			"text/html"
		);
		const contentWrapper = doc.body.firstChild;

		// --- Find the corresponding die in parsed HTML ---
		let parsedDie = null;
		if (clickedCategory !== "unknown") {
			// Construct a more specific selector using the category class
			const selector = `section .dice-rolls .${clickedCategory}.d6[data-die-index="${clickedDieIndex}"][data-die-value="${clickedDieValueAttr}"]`;
			parsedDie = contentWrapper.querySelector(selector);
			if (!parsedDie) {
				console.warn(
					`ETR-TEST | Specific selector "${selector}" failed. Trying fallback.`
				);
			}
		}

		// Fallback selector (less reliable if category wasn't found or specific selector failed)
		if (!parsedDie) {
			const fallbackSelector = `.roll.die.d6[data-die-index="${clickedDieIndex}"][data-die-value="${clickedDieValueAttr}"]`;
			parsedDie = contentWrapper.querySelector(fallbackSelector);
			if (parsedDie) {
				console.warn(
					"ETR-TEST | Using fallback selector - might target wrong die if values/indices repeat across categories."
				);
			}
		}

		if (!parsedDie) {
			console.error(
				`ETR-TEST | Failed to find unique die in parsed HTML (Index: ${clickedDieIndex}, Value: ${clickedDieValueAttr}). Aborting update.`
			);
			return; // Prevent incorrect update
		}

		// --- Toggle data attributes ---
		let updateNeeded = false;
		let newState; // To track the intended state for visual feedback

		if (isAttack) {
			const isCrossedOut = parsedDie.getAttribute("data-crossed-out") === "true";
			newState = !isCrossedOut;
			if (newState) {
				parsedDie.setAttribute("data-crossed-out", "true");
				parsedDie.removeAttribute("data-allocated"); // Ensure mutual exclusivity
			} else {
				parsedDie.removeAttribute("data-crossed-out");
			}
			updateNeeded = true;
		} else {
			// Player roll
			const isAllocated = parsedDie.getAttribute("data-allocated") === "true";
			newState = !isAllocated;
			if (newState) {
				parsedDie.setAttribute("data-allocated", "true");
				parsedDie.removeAttribute("data-crossed-out"); // Ensure mutual exclusivity
			} else {
				parsedDie.removeAttribute("data-allocated");
			}
			updateNeeded = true;
		}

		// --- Provide Immediate Visual Feedback ---
		// This makes the UI feel responsive, even though the final state
		// will be reapplied by the render hook after the update.
		if (isAttack) {
			die.toggleClass("crossed-out", newState);
			die.toggleClass("allocated", false);
		} else {
			die.toggleClass("allocated", newState);
			die.toggleClass("crossed-out", false);
		}

		// --- Update message content ---
		if (updateNeeded) {
			const newContent = contentWrapper.innerHTML;
			try {
				await message.update({ content: newContent });
			} catch (err) {
				console.error("ETR-TEST | Error updating message content:", err);
				// Attempt to revert visual toggle on error to reflect failed save
				if (isAttack) die.toggleClass("crossed-out", !newState);
				else die.toggleClass("allocated", !newState);
			}
		}
	}

	/**
	 * Handle clicks on the Flashback button in chat messages.
	 * @param {Event} event - The click event.
	 */
	static async _handleFlashbackClick(event) {
		event.preventDefault();
		const btn = $(event.currentTarget);
		const messageElement = btn.closest(".message");
		const messageId = messageElement.data("messageId");
		if (!messageId) {
			ui.notifications.warn("Could not find message ID for flashback.");
			return;
		}
		const message = game.messages.get(messageId);
		if (!message) {
			ui.notifications.warn("Could not find chat message for flashback.");
			return;
		}
		const rollConfig = message.getFlag("eat-the-reich", "rollConfig");
		if (!rollConfig) {
			ui.notifications.warn("No roll config found for flashback.");
			return;
		}
		const speaker = message.speaker;
		let actor = null;
		if (speaker && speaker.actor) {
			actor = game.actors.get(speaker.actor);
		}
		if (!actor) {
			ui.notifications.warn("Could not find actor for flashback.");
			return;
		}

		// --- Show Dialog using custom ApplicationV2 ---
		const flashbackChoices = await FlashbackDialogApp.prompt({
			context: {
				actorId: actor.id
			},
		});
		console.log(
			"ETR-TEST | FlashbackDialogApp flashbackChoices:",
			flashbackChoices
		);

		// --- Build the flashback chat message with Flashback Choices ---
		this._buildFlashbackMessage(actor, rollConfig, messageId, flashbackChoices);
	}

	static async _buildFlashbackMessage(actor, rollConfig, messageId, flashbackChoices) {
		// --- Perform Re-roll ---
		const baseDice =
			rollConfig.statValue + rollConfig.equipmentDice + rollConfig.abilityDice;
		const flashbackDice = Math.max(1, baseDice + 2); // Ensure at least 1 die
		const roll = await new Roll(`{${flashbackDice}d6}`).evaluate();

		// --- Create New Chat Message ---
		const chatData = {
			dice: roll.dice[0].results,
			stat: rollConfig.statLabel,
			isAttack: false,
		};
		const chatTemplate =
			"systems/eat-the-reich/templates/chat/die-pool-output.hbs";
		const rollContent = await renderTemplate(chatTemplate, chatData);

		// Render the flashback message content using the template
		const flashbackTemplate = "systems/eat-the-reich/templates/chat/flashback-message-content.hbs";
		const flashbackData = {
			context: game.i18n.localize(flashbackChoices.context),
			question: game.i18n.localize(flashbackChoices.question),
			characterName: flashbackChoices.character,
			description: flashbackChoices.description,
		};
		const flashbackFlavor = await renderTemplate(flashbackTemplate, flashbackData);

		await ChatMessage.create({
			speaker: ChatMessage.getSpeaker({ actor: actor }),
			flavor: flashbackFlavor,
			content: rollContent,
			rolls: [roll],
			rollMode: game.settings.get("core", "rollMode"),
			flags: {
				"eat-the-reich": {
					isFlashback: true,
					originalMessageId: messageId,
				},
			}, // Optional: Link back
		});
	}
}
