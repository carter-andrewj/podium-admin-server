import Entity from '../composables/entity';
import Indexed from '../composables/indexed';

import User from '../user';





export default class FollowingIndex extends Entity(Indexed) {


	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Account data
		this.name = "Following"
		this.contents = User

	}


	// Generate account seed
	get seed() {
		return `followed-by-${this.master.address}`
	}


}