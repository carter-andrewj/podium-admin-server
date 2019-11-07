
import { Map } from 'immutable';



export default class Population {

	constructor(nation) {

		// Refs
		this.nation = nation
		this.podium = nation.podium

		// State
		this.config = undefined
		this.logger = undefined
		this.actors = Map()

		// Methods
		this.log = this.log.bind(this)
		this.error = this.error.bind(this)

		this.connect = this.connect.bind(this)
		this.disconnect = this.disconnect.bind(this)

		this.populate = this.populate.bind(this)
		this.repopulate = this.repopulate.bind(this)
		this.depopulate = this.depopulate.bind(this)

		this.addActor = this.addActor.bind(this)
		this.deleteActor = this.deleteActor.bind(this)

	}



// GETTERS

	get store() {
		return this.podium.nationStore.in("actors")
	}




// LOGGING

	log(line, level) {
		this.logger.log(line, level)
	}

	error(error, context) {
		this.logger.error(error, context)
	}





// SETUP

	async connect(config) {

		// Load users
		this.config = config

		// Create logger
		this.logger = this.nation.makeLogger("Population")
		await this.logger.clear()
		this.log(`Connected Population to Nation: ${this.nation.fullname}`)

		// Return population
		return this

	}


	async populate(actors) {

		// Log
		this.log(`Populating ${actors.length} Actors`)

		// Create actors
		await Promise.all(actors.map(this.addActor))

		// Return population
		return this

	}


	async repopulate() {

		// Log
		this.log("Rebuilding Population")

		// List actors
		await this.store.list()

			// Read config store for each actor and rebuild
			.then(actors => Promise.all(actors.map(a =>
				this.store
					.read(a)
					.then(this.addActor)
			)))

			// Handle errors
			.catch(this.error)

		// Return population
		return this

	}


	async depopulate() {

		// Log
		this.log("Signing Out Actors")

		// Sign out all accounts
		await Promise.all(this.actors
			.map(a => a.signOut())
			.valueSeq()
		)

		// Return population
		return this

	}


	async disconnect() {

		// Sign out actors
		await this.depopulate()

		// Clear variables
		this.actors = Map()
		this.config = undefined

		// Log
		this.log("Population Disconnected", 1)

		// Close logger
		this.logger.stop()
		this.logger = undefined

	}



// ACTORS

	async addActor(actorConfig) {

		// Log
		this.log(`Creating Actor '@${actorConfig.alias}'`, 2)

		// Create actor
		let actor = await new Actor(this).configure(actorConfig)
		
		// Activate actor behaviour
		await actor.activate()

		// Store actor
		this.actors = this.actors.set(actor.address, actor)

	}


	async deleteActor(address) {

		// Get actor
		let actor = this.actors.get(address)

		// Log
		this.log(`Deleting Actor: '${actor.label}'`, 2)

		// Sign out
		await actor.signOut()

		// Remove actor save file
		await this.store.erase(actor.file)

		// Delete actor from store
		this.actors = this.actors.delete(address)

	}



}