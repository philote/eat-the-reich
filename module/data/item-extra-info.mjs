import EatTheReichItemBase from "./base-item.mjs";

export default class EatTheReichExtraInfo extends EatTheReichItemBase {
	static LOCALIZATION_PREFIXES = [
		"ETR.Item.base", 
		"ETR.Item.extraInfo"
	];

	static defineSchema() {
		const fields = foundry.data.fields;
		// const requiredInteger = { required: true, nullable: false, integer: true };
		const schema = super.defineSchema();
		
		schema.description = new fields.SchemaField({
			value: new fields.HTMLField({ required: true, blank: true }),
		});

		return schema;
	}
}
