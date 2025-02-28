import EatTheReichActorBase from "./base-actor.mjs";

export default class EatTheReichNPC extends EatTheReichActorBase {
	static LOCALIZATION_PREFIXES = [
		...super.LOCALIZATION_PREFIXES,
		"ETR.Actor.NPC",
	];

	static defineSchema() {
		const fields = foundry.data.fields;
		const requiredInteger = { required: true, nullable: false, integer: true };
		const schema = super.defineSchema();

		schema.isUbermenschen = new fields.SchemaField({
			value: new fields.BooleanField({
				initial: false,
			})
		});

		schema.threatRating = new fields.SchemaField({
			value: new fields.NumberField({
				...requiredInteger,
				initial: 0,
				min: 0,
			}),
			max: new fields.NumberField({
				...requiredInteger,
				initial: 1,
				min: 0,
			}),
		});

		schema.attack = new fields.SchemaField({
			value: new fields.NumberField({
				...requiredInteger,
				initial: 1,
				min: 0,
			}),
			description: new fields.StringField({ required: true, blank: true }),
		});

		schema.challenge = new fields.SchemaField({
			description: new fields.StringField({ required: true, blank: true }),
			value: new fields.NumberField({
				...requiredInteger,
				initial: 0,
				min: 0,
			}),
		});

		return schema;
	}
}
