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

		// TODO: Add Übermenschen as a boolean?

		schema.threat = new fields.SchemaField({
			value: new fields.NumberField({
				...requiredInteger,
				initial: 1,
				min: 0,
			}),
			max: new fields.NumberField({
				...requiredInteger,
				initial: 1,
				min: 0,
			}),
		});

		schema.attack = new fields.SchemaField({
			rating: new fields.NumberField({
				...requiredInteger,
				initial: 1,
				min: 0,
			}),
			name: new fields.StringField({ initial: "" }),
			description: new fields.HTMLField(),
		});

		schema.challenge = new fields.SchemaField({
			rating: new fields.NumberField({
				...requiredInteger,
				initial: 0,
				min: 0,
			}),
			name: new fields.StringField({ initial: "" }),
			description: new fields.HTMLField(),
		});

		schema.extra = new fields.ArrayField(
			new fields.SchemaField({
				name: new fields.StringField({ required: true, blank: true }),
				description: new fields.HTMLField(),
			})
		);

		return schema;
	}
}
