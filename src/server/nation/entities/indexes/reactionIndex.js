import Entity from '../composables/entity';
import Indexed from '../composables/indexed';

import User from '../user';






export default class ReactionIndex extends Entity(Indexed) {


	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Account data
		this.name = "ReactionIndex"
		this.contents = User

	}


	// Generate account seed
	get seed() {
		return `reactions-to-${this.parent.address}`
	}


}


