import EatTheReichActorBase from "./base-actor.mjs";

export default class EatTheReichLocation extends EatTheReichActorBase {
	static LOCALIZATION_PREFIXES = [
		...super.LOCALIZATION_PREFIXES,
		"ETR.Actor.Location",
	];

	static defineSchema() {
		const fields = foundry.data.fields;
		const requiredInteger = { required: true, nullable: false, integer: true };
		const schema = super.defineSchema();

		schema.enemies = new fields.SchemaField({
			value: new fields.HTMLField({ required: true, blank: true }),
		});

		// TODO maybe add a list of document IDs to track threats
		/*
		UUID
		Name
		Starting Threat level
		Description
		(actions: open, refresh, remove | create, add on drop)
		*/

		return schema;
	}
}
