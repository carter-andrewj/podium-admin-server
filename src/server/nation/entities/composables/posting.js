import Post from '../post';
import PostIndex from '../indexes/postIndex';

import { assert, buffer } from '../utils';




export default Child => class Entity extends Child {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Methods
		this.hasPost = this.hasPost.bind(this)

		this.withPosts = this.withPosts.bind(this)

		this.onPost = this.onPost.bind(this)
		this.compose = this.compose.bind(this)

		// Traits
		this.traits = this.traits.add("Posting")

		// Attributes
		this.attribute("Posts", this.withPosts)

		// Actions
		this.actions = this.actions
			.set("Compose", this.compose)

	}



// GETTERS

	@assert("Posts:Connected")
	get posts() {
		return this.attributes.getIn(["Posts", "entity"])
	}

	@assert("Posts:Complete")
	get postCount() {
		return this.posts.size
	}

	@assert("Posts:Connected")
	hasPost(subject) {
		if (subject.entity) {
			return this.posts.has(subject.address)
		} else {
			return this.posts.has(subject)
		}
	}



// LIFECYCLE

	@assert("Account")
	async withPosts() {

		// Start reading from indexe
		let index = await new PostIndex(this)
			.fromSeed()
			.read()
			.catch(this.fail("Reading Posts"))

		// Create events
		index.onAdd(index.indexListener("onPost"))

		// Return entity
		return index

	}




// LISTENERS

	onPost(callback, onError) {
		this.addListener("onPost", callback, onError)
	}



// ACTIONS

	@assert("Complete", "Authenticated")
	@buffer
	async compose(content, token) {

		// Create reply
		// (The new post knows if it is a reply from the context
		//  provided via -this-).
		let post = new Post(this)

		// Write reply
		await post
			.compose(content, token)
			.catch(this.fail("Writing Post", content, token))

		// Return post
		return post

	}


}




