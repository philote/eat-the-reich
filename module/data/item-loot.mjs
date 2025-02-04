import EatTheReichItemBase from "./base-item.mjs";

export default class EatTheReichLoot extends EatTheReichItemBase {
	static LOCALIZATION_PREFIXES = [
		"ETR.Item.base", 
		"ETR.Item.Loot"
	];

	static defineSchema() {
		const fields = foundry.data.fields;
		const requiredInteger = { required: true, nullable: false, integer: true };
		const schema = super.defineSchema();

		// Uses
		schema.uses = new fields.SchemaField({
			value: new fields.NumberField({
				...requiredInteger,
				initial: 0,
				min: 0,
			}),
			max: new fields.NumberField({
				...requiredInteger,
				initial: 3,
				min: 0,
			}),
		});

		return schema;
	}
}
