import Entity from '../composables/entity';
import Indexed from '../composables/indexed';

import Post from '../post';






export default class PostIndex extends Entity(Indexed) {


	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Account data
		this.name = "PostIndex"
		this.contents = Post

	}


	// Generate account seed
	get seed() {
		return `posts-by-${this.master.address}`
	}


}


