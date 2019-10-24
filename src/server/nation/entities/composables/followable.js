import FollowerIndex from '../indexes/followerIndex';

import { assert } from '../utils';





// Followable Composable

export default Child => class Entity extends Child {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Methods
		this.hasFollower = this.hasFollower.bind(this)

		this.withFollowers = this.withFollowers.bind(this)

		this.onFollowed = this.onFollowed.bind(this)
		this.onUnfollowed = this.onUnfollowed.bind(this)

		// Traits
		this.traits = this.traits.add("Followable")
		this.attribute("Followers", this.withFollowers)
		

	}



// GETTERS

	@assert("Followers:Account")
	get followerIndex() {
		return this.attributes.getIn(["Followers", "entity"])
	}

	@assert("Followers:Connected")
	get getFollowers() {
		return this.followerIndex.all
	}

	@assert("Followers:Connected")
	hasFollower(subject) {
		return this.followerIndex.has(subject.address)
	}



// LIFECYCLE

	@assert("Account")
	async withFollowers() {

		// Read from index
		let index = await new FollowerIndex(this)
			.fromSeed()
			.read()
			.catch(this.error)

		// Create events
		index.onAdd(index.indexListener("onFollowed"))
		index.onDelete(index.indexListener("onUnfollowed"))

		// Return index
		return index

	}




// LISTENERS

	onFollowed(callback, onError) {
		this.addListener("onFollowed", callback, onError)
	}

	onUnfollowed(callback, onError) {
		this.addListener("onUnfollowed", callback, onError)
	}


}




