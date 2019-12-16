
import { User, getEntity } from '../entities/entities';



function task(subject) {

	// Get subject method
	let key = subject.key
	let method = subject.descriptor.value

	// Wrap function
	let wrapped = async function(data) {

		// Unpack the data
		const { nation, task, ...args } = data

		// Construct reporting context string
		const context = `${this.client.id} => '${key.toUpperCase()}()'`

		// Catch requests for the wrong nation
		if (nation !== this.nation.fullname) {

			// Create and log error
			let error = new Error(`Request to wrong nation: ${nation}`)
			this.api.error(error, context)

			// Return error to client
			this.client.emit({ error: error.message })

		// Otherwise perform the task
		} else {

			// Log action
			this.api.log(`${context} with ${JSON.stringify(args)}`, 1)

			// Call the subject method
			let error
			let result = await method.apply(this, [args])
				.catch(err => error = err)

			// Return result, if still connected
			if (this.connected) {
				if (error) {

					this.api.error(error, context)
					this.client.emit(task, { error: error.message })

				} else {

					this.api.log(`${context} returned ${JSON.stringify(result)}`)
					this.client.emit(task, { result: result })

				}
			}

		}

	}

	// Replace method
	subject.descriptor.value = wrapped

	// Return subject
	return subject

}




export default class Session {


	constructor(api) {

		// Store link to api
		this.api = api
		this.nation = this.api.nation

		// State
		this.client = undefined
		this.user = undefined
		this.alertListener = undefined

		// Methods
		this.connect = this.connect.bind(this)
		this.disconnect = this.disconnect.bind(this)

		this.register = this.register.bind(this)
		this.signIn = this.signIn.bind(this)
		this.keyIn = this.keyIn.bind(this)
		this.initialize = this.initialize.bind(this)

		this.get = this.get.bind(this)
		this.getNation = this.getNation.bind(this)

		this.seen = this.seen.bind(this)

		this.search = this.search.bind(this)
		this.find = this.find.bind(this)

	}




// LOGGING

	get id() {
		return this.client.id
	}

	get label() {
		const l = this.id.length
		return `SESSION:…${this.id.substring(l - 5, l)}`
	}

	log(line, level) {
		this.api.log(`${this.label} => ${line}`, level)
	}

	error(error, context) {
		this.api.error(error, `${this.label} => ${line}`)
	}




// CONNECTION

	connect(socket) {

		// Store socket
		this.client = socket

		// Log
		this.log("Opening Connection")

		// Set up responses
		this.client.on("register", this.register)
		this.client.on("signIn", this.signIn)
		this.client.on("keyIn", this.keyIn)

		this.client.on("get", this.get)
		this.client.on("nation", this.getNation)

		this.client.on("seen", this.seen)

		this.client.on("search", this.search)
		this.client.on("find", this.find)

		// Handle errors
		this.client.on(
			"error",
			error => this.client.emit("error", { error })
		)

		// Handle orphan messages
		this.client.use((packet, next) => {
			if (!this.client.eventNames().includes(packet[0])) {
				return next(new Error(`SERVER ERROR: Unknown Channel ${packet[0]}`))
			} else {
    			return next()
    		}
    	})

		// Confirm connection to client
		this.connected = true
		this.client.emit("connection", true)

		// Return session
		return this

	}


	disconnect() {

		// Set flag
		this.connected = false

		// Stop listening to alerts
		if (this.alertListener) {
			this.alertListener.remove()
			this.alertListener = undefined
		}

		// Remove user
		this.user = undefined

		// Message client
		this.client.emit("disconnect")

		// Self-destruct
		this.api.endSession(this.id)

	}



// ENTITIES

	withEntity(address, type) {

		// Reject back data
		if (!address) throw `Invalid Address: ${address}`

		// Check if entity is cached
		let entity = this.nation.entities[address]

		// Otherwise, build the entity
		if (!entity) {

			// Get required entity class
			let Entity = getEntity(type)

			// Build entity
			entity = new Entity(this.nation)
				.fromAddress(address)

		}

		// Return entity
		return entity

	}




// AUTHENTICATION

	@task
	async register({ alias, passphrase }) {

		// Log
		this.log(`Registering User '${alias}'`)

		// Create user
		this.user = await new User(this.nation)
			.create(alias, passphrase)

		// Manage alerts
		await this.initialize()

		// Follow founder
		await this.user.follow(this.nation.founder)

		// Return keyPair, auth token, and address
		return this.user.access

	}


	@task
	async signIn({ alias, passphrase }) {

		// Log
		this.log(`Signing-In User '${alias}'`)

		// Authenticate user
		let user = await new User(this.nation)
			.authenticate
			.withCredentials(alias, passphrase)

		// Check if entity is already cached
		this.user = await this.nation.unique(user)

		// Connect user
		await this.initialize()

		// Return keyPair, auth token, and address
		return this.user.access

	}


	@task
	async keyIn({ keyPair, passphrase }) {

		// Log
		this.log(`Authenticating User with ${JSON.stringify(keyPair)}`)

		// Authenticate user
		let user = await new User(this.nation)
			.authenticate
			.withEncryptedKeyPair(keyPair, passphrase)

		// Check if entity is already cached
		this.user = await this.nation.unique(user)

		// Initialize session
		await this.initialize()

		// Return keyPair, auth token, and address
		return this.user.access

	}


	async initialize() {

		// Connect user
		await this.user.read()

		// Create alerting function
		let onAlert = alert => this.client.emit("alert", alert)

		// Send current alerts
		this.nation.database
			.getAlertsFor(this.user.address)
			.map(onAlert)

		// Listen for new alerts
		this.alertListener = this.nation.database
			.onAlert(this.user.address, onAlert)

	}





// READ

	@task
	async get({ type, address }) {

		// Log
		this.log(`Fetching '${type}' Entity: ${address}`)

		// Check if entity is cached
		let entity = this.withEntity(address, type)

		// Start reading from entity
		await entity.read()

		// Subscribe client to entity data
		entity.addClient(this.client)

		// Return success
		return true

	}

	async getNation({ task }) {
		this.client.emit(task, { result: this.nation.clientSettings })
	}


	@task
	async seen({ alerts }) {

		// Log
		this.log(`Flagging ${alerts.length} alerts as seen`)

		// Flag alerts
		this.nation.database.seenAlerts(...alerts)

		// Return success
		return true

	}


	@task
	async search({ terms, among }) {

		// Log
		this.log(`Searching for '${terms}' among ${JSON.stringify(among)}`)

		// Return results
		return this.nation.database.search(terms, among)

	}


	@task
	async find({ term, among }) {

		// Log
		this.log(`Checking existence of '${term}' among ${JSON.stringify(among)}`)

		// Return results
		return this.nation.database.find(term, among)

	}


}