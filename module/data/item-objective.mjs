import EatTheReichItemBase from "./base-item.mjs";

export default class EatTheReichObjective extends EatTheReichItemBase {
	static LOCALIZATION_PREFIXES = [
		"ETR.Item.base", 
		"ETR.Item.objective"
	];

	static defineSchema() {
		const fields = foundry.data.fields;
		const requiredInteger = { required: true, nullable: false, integer: true };
		const schema = super.defineSchema();
		
		schema.description = new fields.SchemaField({
			value: new fields.HTMLField({ required: true, blank: true }),
		});
		
		schema.rating = new fields.SchemaField({
			value: new fields.NumberField({
				...requiredInteger,
				initial: 2,
				min: 0,
			}),
			max: new fields.NumberField({
				...requiredInteger,
				initial: 12,
				min: 2,
			})
		});

		schema.challenge = new fields.SchemaField({
			description: new fields.StringField({ required: true, blank: true }),
			value: new fields.NumberField({
				...requiredInteger,
				initial: 0,
				min: 0,
			})
		});

		schema.isSecondary = new fields.SchemaField({
			value: new fields.BooleanField({
				initial: false,
			})
		});

		return schema;
	}
}
