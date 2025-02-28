export default class EatTheReichActorBase extends foundry.abstract
	.TypeDataModel {
	static LOCALIZATION_PREFIXES = ["ETR.Actor.base"];

	static defineSchema() {
		const fields = foundry.data.fields;
		const schema = {};
		schema.description = new fields.SchemaField({
			value: new fields.HTMLField({ required: true, blank: true }),
		});
		return schema;
	}
}
