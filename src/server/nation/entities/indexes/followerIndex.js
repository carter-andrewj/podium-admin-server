import Entity from '../composables/entity';
import Indexed from '../composables/indexed';

import User from '../user';





export default class FollowerIndex extends Entity(Indexed) {


	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Account data
		this.name = "Followers"
		this.contents = User

	}


	// Generate account seed
	get seed() {
		return `followers-of-${this.master.address}`
	}


}