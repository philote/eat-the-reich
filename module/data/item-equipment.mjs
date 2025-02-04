import EatTheReichItemBase from "./base-item.mjs";
/*
	The last use of any item of equipment that starts with more 
	than one use adds an additional bonus dice to the pool.
*/

export default class EatTheReichEquipment extends EatTheReichItemBase {
	static LOCALIZATION_PREFIXES = [
		"ETR.Item.base", 
		"ETR.Item.Equipment"
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
				initial: 1,
				min: 0,
			}),
		});

		return schema;
	}
}
