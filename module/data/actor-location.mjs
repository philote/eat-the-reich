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

		// TODO

		return schema;
	}
}
