import Entity from './composables/entity';
import Merged from './composables/merged';
import Storable from './composables/storable';

import { assert } from './utils';




export default class Media extends Entity(
		Merged,			// Media record is a key-value map
		Storable,		// Media can add an object to static storage
	) {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Account
		this.name = "Media"

	}


	@assert("Connected")
	get url() {
		return `${this.nation.media.path}/${this.file}`
	}


	async store(media, type="png") {
		return await this.nation.media
			.write(media, this.address, type)
			.catch(this.fail("Storing File"))
	}


}