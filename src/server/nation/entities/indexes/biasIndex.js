import Entity from '../composables/entity';
import Indexed from '../composables/indexed';

import Post from '../post';






export default class BiasIndex extends Entity(Indexed) {


	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Account data
		this.name = "BiasIndex"
		this.contents = Post

	}


	// Generate account seed
	get seed() {
		return `bias-of-${this.parent.address}`
	}


}


