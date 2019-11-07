import { Map } from 'immutable';


export default class Actor {

	constructor(population) {

		// REFS
		this.population = population
		this.nation = population.nation
		this.podium = population.podium

		// State
		this.user = undefined
		this.activities = Map()
		this.loaded = false
		this.active = false

		// Methods
		this.configure = this.configure.bind(this)

		this.create = this.create.bind(this)
		this.signIn = this.signIn.bind(this)
		this.signOut = this.signOut.bind(this)

		this.activate = this.activate.bind(this)
		this.deactivate = this.deactivate.bind(this)

	}




// GETTERS

	get address() {
		return this.user.address
	}

	get label() {
		return this.user.label
	}

	get status() {
		return {
			config: this.config,
			created: this.created,
			address: this.address,
			passphrase: this.passphrase,
			keyPair: this.user ? this.user.keyPair : undefined
		}
	}

	get store() {
		return this.population.store
	}



// CREATE

	async configure(config) {

		// Unpack config
		this.config = config

		// Check if actor already exists
		await this.load()

		// Sign-in, if actor already exists
		if (this.created) {
			return await this.signIn()
		} else {
			return await this.create()
		}

	}


	async create() {

		// Store or generate passphrase
		this.passphrase = this.config.passphrase || uuid()

		// Register user
		this.user = await new User(this.nation)
			.create(this.config.alias, this.passphrase)

		// Get picture, if provided
		let picture
		if (this.config.profile.picture) {

			// Deconstruct filename
			const file = this.config.profile.picture.split(".")

			// Load image
			picture = await this.podium.templateStore
				.in("media")
				.read(...file)

		}

		// Set profile
		await this.user.profile.update({
			...this.config.profile,
			picture
		})

		// Save
		await this.save()

		// Set created flag
		this.created = true

		// Return actor
		return this

	}


	async signIn() {

		// Ignore if already signed in
		if (this.user.authenticated) return this

		// Sign in user
		this.user = await new User(this.nation)
			.authenticate
			.withEncryptedKeyPair(this.keyPair, this.passphrase)

		// Return actor
		return this

	}


	async signOut() {

		// Ignore if not signed in
		if (!this.user.authenticated) return this

		// Deactivate user behaviour
		await this.deactivate()

		// Sign out user account
		await this.user.signOut()

		// Save user state
		await this.save()

		// Return actor
		return this

	}




// BEHAVIOUR

	async activate() {

		// Ignore if already active
		if (this.active) return this




		// Set active flag
		this.active = true

		// Return actor
		return this

	}


	async deactivate() {

		// Ignore if not active
		if (!this.active) return this




		// Clear active flag
		this.active = false

		// Return actor
		return this

	}




// SAVE

	async save() {

		// Save the actor's current status
		await this.store.write(this.status, this.config.alias)

		// Set loaded flag
		// (since the actor is now in-sync with the store)
		this.loaded = true

		// Return the actor
		return this

	}


	async load() {

		// Ignore if already loaded
		if (this.loaded) return this

		// Load backup
		let backup = await this.store.read(this.config.alias)

		// Return if no data received (i.e. actor does not exist)
		if (!backup) return this

		// Unpack backup
		const { created, config, passphrase, keyPair } = backup

		// Save in state
		this.config = config
		this.created = created
		this.passphrase = passphrase
		this.keyPair = keyPair

		// Set loaded flag
		this.loaded = true

		// Return actor
		return this

	}



}