import Profile from '../profile';

import { assert } from '../utils';




export default Child => class Entity extends Child {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Methods
		this.withProfile = this.withProfile.bind(this)

		this.onUpdateProfile = this.onUpdateProfile.bind(this)
		this.updateProfile = this.updateProfile.bind(this)

		// Traits
		this.traits = this.traits.add("Profiled")

		// Attributes
		this.attribute("Profile", this.withProfile)

		// Actions
		this.actions = this.actions
			.set("UpdateProfile", this.updateProfile)

	}



// OVERRIDES

	// (OPTIONAL) Set the default display name in
	// this profile (e.g. to the master's @alias)
	get defaultName() {
		return null
	}



// GETTERS

	@assert("Profile:Account")
	get profile() {
		return this.attributes.getIn(["Profile", "entity"])
	}

	@assert("Profile:Populated")
	get displayName() {
		return this.profile.displayName
	}

	@assert("Profile:Populated")
	get about() {
		return this.profile.about
	}

	@assert("Profile:Populated")
	get picture() {
		return this.profile.picture
	}



// LIFECYCLE

	@assert("Account")
	async withProfile() {

		// Start reading from profile account
		let profile = await new Profile(this)
			.fromSeed()
			.read()
			.catch(this.fail("Reading Profile"))

		// Create events
		profile.onChange(this.forward("onUpdateProfile"))

		// Return entity
		return profile

	}



// LISTENERS

	onUpdateProfile(callback, onError) {
		this.addListener("onUpdateProfile", callback, onError)
	}



// WRITE

	@assert("Account", "Authenticated", "Profile:Connected")
	async updateProfile(profile) {

		// Log
		this.log("Updating Profile", 2)

		// Update and return profile
		await this.profile
			.update(profile)
			.catch(this.fail("Updating Profile", profile))

		// Return profile
		return this.profile

	}



}