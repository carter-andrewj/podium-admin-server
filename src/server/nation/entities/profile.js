import Entity from './composables/entity';
import Merged from './composables/merged';

import Media from './media';

import { assert } from './utils';




export default class Profile extends Entity(Merged) {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// State
		this.name = "Profile"

		// Methods
		this.checkPicture = this.checkPicture.bind(this)
		this.withPicture = this.withPicture.bind(this)

		this.update = this.update.bind(this)

		// Generate profile picture on change
		this.onChange(this.checkPicture)

		// Attributes
		this.attribute("Picture", this.withPicture)

		// Actions
		this.actions = this.actions
			.set("Update", this.update)

	}




// GETTERS

	get label() {
		return `Profile:${this.parent.label}`
	}

	@assert("Populated")
	get displayName() {
		return this.get("displayName")
	}

	@assert("Populated")
	get about() {
		return this.get("about")
	}

	get picture() {
		return this.attributes.getIn(["Picture", "entity"])
	}




// OVERRIDDEN

	// Default settings
	get defaults() {
		return {
			name: "",
			about: "",
			picture: null,
			homepage: null
		}
	}


	// Account seed
	get seed() {
		return `profile-of-${this.parent.address}`
	}




// READ

	// Check if each update has changed the profile picture
	async checkPicture(event) {

		// Unpack event data
		const picture = event.state.picture
		const lastPicture = event.lastState.picture

		// If changed, update attribute
		if (picture && picture !== lastPicture) {

			// Read picture
			await this.with("Picture")

		}

	}


	// Update media entity if/when profile picture is changed
	async withPicture() {

		// Disconnect old picture, if required
		if (this.picture && this.picture.connected) {
			await this.picture
				.disconnect()
				.catch(this.fail("Forgetting Old Profile Picture"))
		}

		// Get picture address
		const address = this.record.get("picture")

		// Read picture entity, if specified
		let picture = new Media(this.parent) 
		if (address) {
			picture = await picture
				.fromAddress(address)
				.read()
				.catch(this.fail("Reading Profile Picture", picture))
		}

		// Return picture storable
		return picture

	}



// ACTIONS

	@assert("Account", "Authenticated")
	async update(newProfile) {

		// Check if profile includes an image
		let newPicture
		if (newProfile.picture) {

			// Unpack picture data
			const { picture, pictureType } = newProfile

			// Register image
			newPicture = await new Media(this.master)
				.register(picture, pictureType)
				.catch(this.fail("Registering New Profile Picture"))

			// Set picture address
			newProfile.picture = newPicture.address

		}

		// Update profile
		await this.write(newProfile)
			.catch(this.fail("Updating Profile", newProfile))

		// Return this entity
		return this

	}


}