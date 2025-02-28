import EatTheReichItemBase from "./base-item.mjs";

export default class EatTheReichAdvance extends EatTheReichItemBase {
	static LOCALIZATION_PREFIXES = [
		"ETR.Item.base", 
		"ETR.Item.advance"
	];

	static defineSchema() {
		const fields = foundry.data.fields;
		const schema = super.defineSchema();
		
		schema.description = new fields.SchemaField({
			value: new fields.StringField({ required: true, blank: true }),
		});

		schema.selected = new fields.SchemaField({
			value: new fields.BooleanField({
				initial: false,
			})
		});

		return schema;
	}
}
