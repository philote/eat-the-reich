/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class EatTheReichItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const rollData = { ...this.system };

    // Quit early if there's no parent actor
    if (!this.actor) return rollData;

    // If present, add the actor's roll data
    rollData.actor = this.actor.getRollData();

    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll(event) {
    const item = this;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${item.type}] ${item.name}`;

    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: item.system.description ?? '',
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.formula, rollData.actor);
      // If you need to store the value first, uncomment the next line.
      // const result = await roll.evaluate();
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
  }

  static ICONS_PATH = `systems/eat-the-reich/assets/icons/`;

  static getDefaultArtwork(actorData) {
    switch (actorData.type) {
			case 'ability': {
				return {
          img: `${this.ICONS_PATH}skills.svg`,
          texture: {
            src: `${this.ICONS_PATH}skills.svg`,
          },
        };
			}
      case 'advance': {
				return {
          img: `${this.ICONS_PATH}upgrade.svg`,
          texture: {
            src: `${this.ICONS_PATH}upgrade.svg`,
          },
        };
			}
      case 'equipment': {
				return {
          img: `${this.ICONS_PATH}backpack.svg`,
          texture: {
            src: `${this.ICONS_PATH}backpack.svg`,
          },
        };
			}
      case 'loot': {
				return {
          img: `${this.ICONS_PATH}strongbox.svg`,
          texture: {
            src: `${this.ICONS_PATH}strongbox.svg`,
          },
        };
			}
      case 'objective': {
				return {
          img: `${this.ICONS_PATH}target.svg`,
          texture: {
            src: `${this.ICONS_PATH}target.svg`,
          },
        };
			}
      case 'extraInfo': {
				return {
          img: `${this.ICONS_PATH}info.svg`,
          texture: {
            src: `${this.ICONS_PATH}info.svg`,
          },
        };
			}
			default: {
				return {
          img: this.DEFAULT_ICON,
          texture: {
            src: this.DEFAULT_ICON,
          },
        };
			}
		}
  }
}
