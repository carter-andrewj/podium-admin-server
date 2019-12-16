import FollowingIndex from '../indexes/followingIndex';

import { assert } from '../utils';




// Followable Composable

export default Child => class Entity extends Child {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Methods
		this.isFollowing = this.isFollowing.bind(this)

		this.withFollowing = this.withFollowing.bind(this)

		this.follow = this.follow.bind(this)
		this.unfollow = this.unfollow.bind(this)

		this.onFollow = this.onFollow.bind(this)
		this.onUnfollow = this.onUnfollow.bind(this)

		// Traits
		this.traits = this.traits.add("Following")

		// Register attribute
		this.attribute("Following", this.withFollowing)

		// Register actions
		this.actions = this.actions
			.set("Follow", this.follow)
			.set("Unfollow", this.unfollow)

	}



// GETTERS

	@assert("Following:Account")
	get followingIndex() {
		return this.attributes.getIn(["Following", "entity"])
	}

	@assert("Following:Connected")
	get following() {
		return this.followingIndex.all
	}

	@assert("Following:Connected")
	isFollowing(subject) {
		return this.followingIndex.has(subject.address)
	}



// LIFECYCLE

	@assert("Account")
	async withFollowing() {

		// Start reading from index
		let index = await new FollowingIndex(this)
			.fromSeed()
			.read()
			.catch(this.fail("Reading Following"))

		// Create events
		index.onAdd(index.indexListener("onFollow"))
		index.onDelete(index.indexListener("onUnfollow"))

		// Return entity
		return index

	}




// LISTENERS

	onFollow(callback, onError) {
		this.addListener("onFollow", callback, onError)
	}

	onUnfollow(callback, onError) {
		this.addListener("onUnfollow", callback, onError)
	}



// ACTIONS

	@assert("Connected", "Authenticated")
	async follow(subject) {
		
		// Ensure the subject is followable
		if (!subject.is("Followable")) {
			throw new Error(`FOLLOWING ERROR: Subject '${subject.label}' ` +
							`is not Followable`)
		}

		// Ensure the subject's follower index is connected
		if (!subject.followingIndex.connected) {
			throw new Error(`FOLLOWING ERROR: Subject '${subject.label}' ` +
							`is not Connected`)
		}

		// Ensure master is not already following the subject
		if (this.isFollowing(subject)) {
			throw new Error(`FOLLOWING ERROR: Already following '${subject.label}'`)
		}

		// Write to ledger
		await Promise
			.all([

				// Add subject to master's following index
				this.followingIndex.add(subject),

				// Add master to subject's follower index
				subject.followerIndex.add(this.master)

			])
			.catch(this.fail("Following", subject))

		// Dispatch alerts
		this.nation.database.alert("follow", subject, this)

		// Return entity
		return this

	}


	@assert("Connected", "Authenticated")
	async unfollow(subject) {

		// Ensure the subject's follower index is connected
		if (!subject.followingIndex.connected) {
			throw new Error(`FOLLOWING ERROR: Subject '${subject.label}' ` +
							`is not Connected`)
		}

		// Ensure master is following the subject
		if (!this.isFollowing(subject)) {
			throw new Error(`Following Error: Attempted to unfollow '${subject.label}' ` +
							`- not in Following Index`)
		}

		// Write to ledger
		await Promise
			.all([

				// Add subject to master's following index
				this.followingIndex.delete(subject),

				// Add master to subject's follower index
				subject.followerIndex.delete(this.master)

			])
			.catch(this.fail("Unfollowing", subject))

		// Dispatch alerts
		this.nation.database.alert("unfollow", subject, this)

		// Return entity
		return this

	}


}




