import EatTheReichItemBase from "./base-item.mjs";

export default class EatTheReichAbility extends EatTheReichItemBase {
	static LOCALIZATION_PREFIXES = [
		"ETR.Item.base", 
		"ETR.Item.Ability"
	];

	static defineSchema() {
		const fields = foundry.data.fields;
		const schema = super.defineSchema();
		
		schema.description = new fields.SchemaField({
			value: new fields.StringField({ required: true, blank: true }),
		});

		return schema;
	}
}
