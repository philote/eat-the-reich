import EatTheReichActorBase from "./base-actor.mjs";

const fields = foundry.data.fields;
function getInjury() {
	return new fields.SchemaField({
		first: new fields.SchemaField({
			name: new fields.StringField({ initial: "" }),
			selected: new fields.BooleanField({ initial: false }),
		}),
		second: new fields.SchemaField({
			name: new fields.StringField({ required: true, blank: true }),
			selected: new fields.BooleanField({ initial: false }),
			penalty: new fields.StringField({ required: true, blank: true }),
		}),
	});		
}

export default class EatTheReichCharacter extends EatTheReichActorBase {
	static LOCALIZATION_PREFIXES = [
		...super.LOCALIZATION_PREFIXES,
		"ETR.Actor.Character",
	];

	static defineSchema() {
		const requiredInteger = { required: true, nullable: false, integer: true };
		const schema = super.defineSchema();

		schema.shortDescription = new fields.StringField({ required: true, blank: true }),

		// Iterate over Stat names and create a new SchemaField for each.
		schema.stats = new fields.SchemaField(
			Object.keys(CONFIG.ETR.stats).reduce((obj, stat) => {
				obj[stat] = new fields.SchemaField({
					value: new fields.NumberField({
						...requiredInteger,
						initial: 1,
						min: 0,
					}),
					current: new fields.NumberField({
						...requiredInteger,
						initial: 1,
						min: 0,
					}),
				});
				return obj;
			}, {})
		);

		schema.blood = new fields.SchemaField({
			value: new fields.NumberField({
				...requiredInteger,
				initial: 0,
				min: 0,
			}),
			max: new fields.NumberField({
				...requiredInteger,
				initial: 10,
				min: 0,
			}),
		});

		schema.injuries = new fields.SchemaField({
			oneTwo: getInjury(),
			threeFour: getInjury(),
			fiveSix: getInjury()
		});

		schema.lastStand = new fields.SchemaField({
			name: new fields.StringField({ required: true, blank: true }),
			dice: new fields.NumberField({
				...requiredInteger,
				initial: 8,
				min: 0,
			}),
		});

		return schema;
	}

	prepareDerivedData() {
		// Loop through stat scores, and add their modifiers to our sheet output.
		for (const key in this.stats) {
			// Handle stat label localization.
			this.stats[key].label = game.i18n.localize(CONFIG.ETR.stats[key]) ?? key;
		}
	}

	getRollData() {
		const data = {};

		// Copy the stat scores to the top level, so that rolls can use
		if (this.stats) {
			for (let [k, v] of Object.entries(this.stats)) {
				data[k] = foundry.utils.deepClone(v);
			}
		}

		// data.lvl = this.attributes.level.value;

		return data;
	}
}
