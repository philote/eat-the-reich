export default class EatTheReichItemBase extends foundry.abstract
	.TypeDataModel {
	static defineSchema() {
		const fields = foundry.data.fields;
		const schema = {};

		schema.bonus = new fields.SchemaField({
			value: new fields.StringField({ required: true, blank: true }),
		});

		return schema;
	}
}
