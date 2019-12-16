import Entity from '../composables/entity';
import Indexed from '../composables/indexed';

import Post from '../post';






export default class ReplyIndex extends Entity(Indexed) {


	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Account data
		this.name = "ReplyIndex"
		this.contents = Post

	}


	// Generate account seed
	get seed() {
		return `replies-to-${this.parent.address}`
	}


}


