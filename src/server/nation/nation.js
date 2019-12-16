import { v4 as uuid } from 'uuid';

import { Map } from 'immutable';

import Ledger from './ledger/ledger';
import Database from './database/database';
import API from './api/api';
import Population from './population/population';

import Logger from '../utils/logger';

import User from './entities/user';
import Domain from './entities/domain';



export default class Nation {

	constructor(podium) {

		// Store link to master podium object
		this.podium = podium

		// Outputs
		this.ledger = undefined		// Decentralized store
		this.database = undefined	// Data store
		this.api = undefined		// API Websocket Server

		// State
		this.nation = this
		this.constitution = null	// Config
		this.founder = null			// Founding user
		this.domain = null			// Root Domain
		this.population = null		// Managed accounts

		// Flags
		this.creating = false		// Creating flag
		this.live = false			// Live flag
		this.connected = false		// Connected flag
		this.launched = false		// Flag for whether this is a new nation or resuming
		
		// Designation
		this.name = null			// Identifier of this nation
		this.family = null			// Categorization of this nation
		this.tags = null			// Tags

		// Entity management
		this.entities = {}			// Entity cache

		// Logging
		this.logger = null
		this.eventLogger = null

		// Methods
		this.makeLogger = this.makeLogger.bind(this)
		this.log = this.log.bind(this)
		this.error = this.error.bind(this)
		this.eventLog = this.eventLog.bind(this)
		this.eventError = this.eventError.bind(this)

		this.launch = this.launch.bind(this)
		this.create = this.create.bind(this)
		this.resume = this.resume.bind(this)

		this.cache = this.cache.bind(this)
		this.unique = this.unique.bind(this)

		this.save = this.save.bind(this)

	}



// GETTERS

	get fullname() {
		return `${process.env.ADMIN_NAME}|${this.family}|${this.name}|${this.tags.join("|")}`
	}

	get filename() {
		return `${process.env.ADMIN_NAME}/${this.family}/${this.name}/${this.tags.join("/")}/`
	}

	get status() {
		return {

			last: new Date().getTime(),

			created: this.created,
			creator: process.env.ADMIN_NAME,

			launched: this.launched,

			name: this.fullname,
			designation: this.constitution.designation,

			services: this.constitution.services,

			config: this.constitution.config,

			founder: (this.founder && this.founder.connected) ?
				{
					passphrase: this.founder.passphrase,
					keyPair: this.founder.encryptedKeyPair,
					address: this.founder.address
				}
				: null,

			domain: (this.domain && this.domain.connected) ?
				{
					name: this.domain.label,
					address: this.domain.address
				}
				: null,

			population: this.constitution.population

		}
	}


	get report() {
		return {

			// Inherit status
			...this.status,

			// Current state
			live: this.live,
			connected: this.connected,
			creating: this.creating,

			entities: Object.keys(this.entities).length

		}
	}

	get store() {
		return this.podium.nationStore.in("current")
	}

	get media() {
		return this.podium.mediaStore.in("current")
	}


	get clientSettings() {
		return {

			name: this.fullname,

			founder: this.founder.address,
			domain: this.domain.address,

			media: `https://${this.media.bucket.name}/${this.media.path}`,

		}
	}


	get constants() {
		return {
			regex: {
				reference: /{\w+}/gi,
				url: /(?:http[s]*:\/\/)?(?:www\.)?(?!ww*\.)[a-z][a-z0-9.\-/]*\.[a-z]{2}(?:[^\s]*[a-z0-9/]|(?=\W))/gi,
				tag: /[@#\/][a-z0-9_-]+[a-z0-9_-]*?(?=\W|$)/gi,
				mention: /[@][a-z0-9_-]+[a-z0-9_-]*?(?=\W|$)/gi,
				topic: /[#][a-z0-9_-]+[a-z0-9_-]*?(?=\W|$)/gi,
				domain: /[\/][a-z0-9_-]+[a-z0-9_-]*?(?=\W|$)/gi,
			}
		}
	}




// LOGGING

	makeLogger(name) {

		// Get log config
		const { to, path } = this.constitution.config.log

		// Name logger
		const label = `${this.fullname}|${name}`

		// Create and configure logger
		let logger = new Logger(label).start(to, path)

		// Return logger
		return logger

	}

	log(line, level=0) {
		this.logger.out(line, level)
	}

	error(error, context) {
		this.logger.error(error, context)
	}

	eventLog(line, level=0) {
		this.eventLogger.out(line, level)
	}

	eventError(error, context) {
		this.eventLogger.error(line, level)
	}




// CREATION



	async launch(constitution) {

		// Store constitution
		this.constitution = constitution



		// Unpack designation
		const { name, family, tags } = this.constitution.designation

		// Validate constitution
		if (tags.length === 0) {
			throw new Error("NATION ERROR: Constitution must specify at least one 'tag'.")
		}

		// Construct nation name
		this.name = name
		this.family = family
		this.tags = tags

		// Set store name
		this.store.setPath(this.filename)
		this.media.setPath(this.filename)

		// Start logger
		this.logger = await this.makeLogger("Nation")
		this.log(`CONSTITUTED NATION: ${this.fullname}`)

		// Start event logger
		this.eventLogger = await this.makeLogger("Events")
		this.eventLog(`EVENTS FOR: ${this.fullname}`)



		// Log
		this.log("Connecting to Services:", 1)

		// Get services from constitution
		const { ledger, database, api, population } = this.constitution.services

		// Connect to services
		await Promise.all([

			// Connect to ledger
			new Ledger(this)
				.connect(ledger)
				.then(ledger => {
					this.log("Connected to Ledger", 2)
					this.ledger = ledger
				})
				.catch(this.error),

			// Connect to database
			new Database(this)
				.connect(database)
				.then(database => {
					this.log("Connected to Database", 2)
					this.database = database
				})
				.catch(this.error),

			// Connect to server
			new API(this)
				.connect(api)
				.then(api => {
					this.log("Connected to API", 2)
					this.api = api
				})
				.catch(this.error),

			// Connect population
			new Population(this)
				.connect(population)
				.then(population => {
					this.log("Connected to Population Manager", 2)
					this.population = population
				})
				.catch(this.error)

		])

		// Set connected flag
		this.connected = true



		// Create blank entities
		this.founder = new User(this)
		this.domain = new Domain(this.founder)
		this.founder.domain = this.domain

		// Create or retreive nation
		if (!this.constitution.launched) {
			await this.create()
		} else {
			await this.resume()
		}



		// Accept websocket connections
		await this.api.open().catch(this.error)


		// Save nation data
		this.live = true
		await this.save()

		// Return nation
		return this

	}




	async create() {

		// Log
		this.log(`Creating Nation: ${this.fullname}`, 0)

		// Set creating flag
		this.creating = true



		// Log
		this.log("Creating Founder", 1)

		// Unpack founder data and generate a passphrase
		const { alias, profile, firstPost } = this.constitution.founder
		this.passphrase = uuid()

		// Create founder
		await this.founder
			.create(alias, this.passphrase)
			.catch(this.error)

		// Log
		this.log("Creating Root Domain", 1)

		// Unpack domain
		const { tokens, articles } = this.constitution.domain

		// Create root domain
		await this.domain
			.create(this.name, tokens, articles)
			.catch(this.error)




		// Log
		this.log("Adding Support Data:", 1)

		// Fetch user picture
		let userPicture
		if (profile.picture) {

			// Deconstruct filename
			const file = profile.picture.split(".")
			profile.pictureType = file[1]

			// Load image
			userPicture = this.podium.templateStore
				.in("media")
				.read(...file)
				.then(picture => profile.picture = picture)
				.catch(this.error)

		}

		// Fetch user picture
		let domainProfile = this.constitution.domain.profile
		let domainPicture
		if (domainProfile.picture) {

			// Deconstruct filename
			const file = domainProfile.picture.split(".")
			domainProfile.pictureType = file[1]

			// Load image
			domainPicture = this.podium.templateStore
				.in("media")
				.read(...file)
				.then(picture => domainProfile.picture = picture)
				.catch(this.error)

		}

		// Wait for pictures to load
		await Promise.all([userPicture, domainPicture])


		// Add data for domain and user
		await Promise.all([

			// Update founder profile
			this.founder
				.updateProfile(profile)
				.then(() => this.log("Updated Founder Profile", 2))
				.catch(this.error),

			// Compose first founder post
			this.founder
				.compose({ text: firstPost }, "POD")
				.then(() => this.log("Authored First Post", 2))
				.catch(this.error),

			// Update domain profile
			this.domain
				.updateProfile(domainProfile)
				.then(() => this.log("Updated Domain Profile", 2))
				.catch(this.error)

		])




		// Log
		this.log("Pre-Populating:")

		// Pre-populate nation
		await this.population
			.populate(this.constitution.population)
			.catch(this.error)




		// Set launched flag
		this.launched = true
		this.created = new Date().getTime()

		// Log
		this.log(`Created Nation: ${this.fullname}`, 0)

	}




	async resume() {

		// Log
		this.log(`Resuming Nation: ${this.fullname}`, 0)

		// Restore values
		this.launched = true
		this.created = this.constitution.created

		// Create entities
		this.founder = new User(this)
		this.domain = new Domain(this.founder)
		this.founder.domain = this.domain




		// Log
		this.log("Recovering Founder", 1)

		// Unpack founder data
		const { address, keyPair, passphrase } = this.constitution.founder

		// Authenticate founder
		await this.founder
			.authenticate
			.withEncryptedKeyPair(keyPair, passphrase)
			.catch(this.error)

		// Read from founder account
		await this.founder
			.fromAddress(address)
			.read()
			.catch(this.error)




		// Log
		this.log("Recovering Domain", 1)

		// Unpack domain data
		const domainAddress = this.constitution.domain.address

		// Recover domain
		await this.domain
			.fromAddress(domainAddress)
			.read()
			.catch(this.error)



		// Log
		this.log("Repopulating Actors", 1)

		// Repopulate
		await this.population
			.populate(this.constitution.population)
			.catch(this.error)



		// Log
		this.log(`Resumed Nation: ${this.fullname}`, 0)


	}




	async stop() {

		// Ignore if nation is not live
		if (!this.live) return


		// Log
		this.log("Stopping Nation", 1)

		// Clear flag
		this.live = false



		// Log
		this.log("Closing Websocket", 2)

		// Disconnect all clients
		await Promise.all(Map(this.entities)
			.map(e => e.removeAllClients())
			.valueSeq()
		)

		// Close websocket
		await this.api.close()



		// Log
		this.log("Deactivating Population", 2)

		// Stop population
		await this.population.disconnect()



		// Log
		this.log("Backing-up Nation", 2)

		// Save nation
		await this.save()



		// Log
		this.log("Disconnecting Entities", 2)

		// Disconnect all entities
		let check = await Promise.all(
			Map(this.entities)
				.valueSeq()
				.map(e => e.disconnect())
		)



		// Log
		this.log("Disconnecting Services ", 2)

		// Disconnect services
		await Promise.all([

			// Disconnect from Ledger
			this.ledger
				.disconnect()
				.then(() => {
					this.log("Disconnected Ledger", 3)
					this.ledger = undefined
				})
				.catch(this.error),

			this.database
				.disconnect()
				.then(() => {
					this.log("Disconnected Database", 3)
					this.database = undefined
				})
				.catch(this.error),

			this.api
				.disconnect()
				.then(() => {
					this.log("Disconnected API", 3)
					this.api = undefined
				})
				.catch(this.error)

		])

		// Clear store path
		this.store.setPath(null)
		this.media.setPath(null)

		// Clear flag
		this.connected = false


		// Log
		this.log("Cleaning Up", 2)		

		// Clear variables
		this.entities = {}
		this.founder = undefined
		this.domain = undefined
		this.constitution = undefined
		this.created = undefined
		this.launched = undefined

		// Log
		this.log("Nation Offline", 1)



		// Stop loggers
		this.logger.stop()
		this.logger = undefined
		this.eventLogger.stop()
		this.eventLogger = undefined

	}





// CACHE

	// Cache entities
	cache(entity) {

		// Cache entity, if not found
		if (!this.entities[entity.address]) {
			this.entities[entity.address] = entity
		}

		// Return cached entity
		return this.entities[entity.address]

	}

	// Deduplicate 2 entities
	// (Required because there are cases where an entity
	// needs to be created blind - such as sign-in - and
	// so cannot be checked against the cache until after
	// connection.)
	async unique(entity) {

		// Get cached version of entity
		let current = this.entities[entity.address]

		// Cache entity and return if not already cached
		if (!current) return this.cache(entity)

		// Authenticated cached entity, if applicable
		if (entity.is("Authenticating") &&
				entity.authenticated &&
				!current.authenticated) {
			await current
				.authenticate
				.withKeyPair(entity.keyPair)
		}

		// Disconnect duplicate entity
		if (entity.connected) {
			await entity.disconnect()
		}

		// Return the cached entity
		return current

	}







// FILES

	get saveName() {
		return this.podium.config.nations.saveName
	}

	async save() {

		// Log
		this.log("Saving Nation Backup", 1)

		// Write to store
		return await this.store.write(this.status, this.saveName)

	}



}