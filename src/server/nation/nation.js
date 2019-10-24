import { v4 as uuid } from 'uuid';

import { Map } from 'immutable';

import Ledger from './ledger/ledger';
import Database from './database/database';
import API from './api/api';
import Logger from '../utils/logger';

import User from './entities/user';
import Domain from './entities/domain';



export default class Nation {

	constructor(podium) {

		// Store link to master podium object
		this.podium = podium

		// Outputs
		this.ledger = null			// Decentralized store
		this.database = null		// Data store
		this.api = null				// API Websocket Server

		// State
		this.nation = this
		this.constitution = null	// Config
		this.founder = null			// Founding user
		this.domain = null			// Root Domain

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
		this.entities = Map()		// Entity cache

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

		this.save = this.save.bind(this)
		this.load = this.load.bind(this)
		this.storeData = this.storeData.bind(this)
		this.storeMedia = this.storeMedia.bind(this)

	}



// GETTERS

	get fullname() {
		return `${process.env.ADMIN_NAME}|${this.family}|${this.name}|${this.tags.join("|")}`
	}

	get filename() {
		return `${process.env.ADMIN_NAME}/${this.family}/${this.name}/${this.tags.join("/")}`
	}

	get config() {
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
					keyPair: this.founder.encryptedKeypair,
					address: this.founder.address
				}
				: null,

			domain: (this.domain && this.domain.connected) ?
				{
					name: this.domain.label,
					address: this.domain.address
				}
				: null,

		}
	}


	get status() {
		return {

			// Inherit status
			...this.config,

			// Current state
			live: this.live,
			connected: this.connected,
			creating: this.creating,

			entities: this.entities.size

		}
	}



// LOGGING

	async makeLogger(name) {

		// Get log config
		const { to, path } = this.constitution.config.log

		// Name logger
		const label = `${this.fullname}|${name}`

		// Create and configure logger
		let logger = new Logger(label).start(to, path)

		// Reset log
		await logger.clear()

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

		// Start logger
		this.logger = await this.makeLogger("Nation")
		this.log(`CONSTITUTED NATION: ${this.fullname}`)

		// Start event logger
		this.eventLogger = await this.makeLogger("Events")
		this.eventLog(`EVENTS FOR: ${this.fullname}`)




		// Log
		this.log("Connecting to Services:", 1)

		// Get services from constitution
		const { ledger, database, api } = this.constitution.services

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
			userPicture = this.podium.store
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
			domainPicture = this.podium.store
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
				.author({ text: firstPost }, "POD")
				.then(() => this.log("Authored First Post", 2))
				.catch(this.error),

			// Update domain profile
			this.domain
				.updateProfile(domainProfile)
				.then(() => this.log("Updated Domain Profile", 2))
				.catch(this.error)

		])


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
		this.log(`Resumed Nation: ${this.fullname}`, 0)


	}




	async stop() {

		// Log
		this.log("Stopping Nation", 1)

		// Clear flag
		this.live = false



		// Log
		this.log("Closing Websocket", 2)

		// Disconnect all clients
		this.entities.map(e => e.removeAllClients())

		// Close websocket
		this.api.close()



		// Log
		this.log("Backing-up Nation", 2)

		// Save nation
		await this.save()



		// Log
		this.log("Disconnecting Entities", 2)

		// Disconnect all entities
		let check = await Promise.all(
			this.entities
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
					this.log("Disconnected from Ledger", 3)
					this.ledger = undefined
				})
				.catch(this.error),

			this.database
				.disconnect()
				.then(() => {
					this.log("Disconnected from Database", 3)
					this.database = undefined
				})
				.catch(this.error),

			this.api
				.disconnect()
				.then(() => {
					this.log("Disconnected from API", 3)
					this.api = undefined
				})
				.catch(this.error),
		])

		// Clear flag
		this.connected = false


		// Log
		this.log("Cleaning Up", 2)		

		// Clear variables
		this.entities = Map()
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



	// Cache entities
	cache(entity) {

		// Cache entity, if not found
		if (!this.entities.get(entity.address)) {
			this.entities = this.entities.set(entity.address, entity)
		}

		// Return cached entity
		return this.entities.get(entity.address)

	}







// FILES

	save() {

		// Log
		this.log("Saving Nation Backup", 1)

		// Write to store
		return this.storeData(this.config, "nation")

	}

	load(fullname) {

		// Log
		this.log("Loading Nation Backup", 1)

		// Write to store
		return this.podium.store.readNation(fullname)

	}


	storeMedia(media, name, type="png") {
		return new Promise((resolve, reject) => {

			// Construct file name
			const destination = `${this.filename}/${name}`

			// Log
			this.log(`Storing media: ${destination}`, 2)

			// Write to store
			this.podium.store
				.writeMedia(media, destination, type)
				.then(resolve)
				.catch(this.logger.error)

		})
	}


	storeData(data, name, type="json") {
		return new Promise((resolve, reject) => {

			// Construct file name
			const destination = `${this.filename}/${name}`

			// Log
			this.log(`Storing file: ${destination}`, 2)

			// Write to store
			this.podium.store
				.writeNation(data, destination, type)
				.then(resolve)
				.catch(this.logger.error)

		})
	}



}