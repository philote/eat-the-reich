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
			value: new fields.StringField({ required: true, blank: true }),
		});
		
		schema.challengeRating = new fields.SchemaField({
			value: new fields.NumberField({
				...requiredInteger,
				initial: 1,
				min: 0,
			}),
		});

		return schema;
	}
}
