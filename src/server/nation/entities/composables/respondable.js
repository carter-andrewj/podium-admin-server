import Post from '../post';
import PostIndex from '../indexes/postIndex';

import { assert } from '../utils';



export default Child => class Entity extends Child {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Methods
		this.withReplies = this.withReplies.bind(this)

		this.reply = this.reply.bind(this)

		// Traits
		this.traits = this.traits.add("Respondable")

		// Attributes
		this.attribute("Replies", this.withReplies)

		// Actions
		this.actions = this.actions
			.set("Reply", this.reply)

	}


// GETTERS

	@assert("Replies:Connected")
	get replies() {
		return this.attributes.getIn(["Replies", "entity"])
	}



// READ

	@assert("Account")
	async withReplies() {

		// Start reading from indexes
		let index = await new PostIndex(this)
			.fromSeed()
			.read()
			.catch(this.fail("Reading Replies"))

		// Create events
		index.onAdd(this.forward("onReply"))

		// Return entity
		return index

	}



// ACTIONS

	@assert("Account", "Authenticated")
	async reply(content, mentions=[], topics=[], links=[], media=[]) {

		// Create reply
		// (The new post knows it is a reply from the context
		//  provided via -this-).
		let post = new Post(this)

		// Write reply
		await post
			.create(content, mentions, topics, links, media)
			.catch(this.fail("Writing Reply", content, ...mentions,
							 ...topics, ...links, ...media))

		// Return post
		return post

	}
	
}


