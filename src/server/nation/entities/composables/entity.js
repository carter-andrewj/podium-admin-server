import { v4 as uuid } from 'uuid';

import { RadixAccountSystem } from 'radixdlt';

import { fromJS, List, Map, Set, OrderedMap } from 'immutable';

import { getEntity } from '../entities';

import { assert, cached } from '../utils';


// An entity is the base type of Podium entity designed
// to be extended with Composables to build top-level
// classes with shared behaviours

// COMPOSABLES
//
//		Entity			Base class
//
//		ATOM HANDLERS
//		Indexed			Keeps an index of atoms recevied
//		Merged			Merges atoms into a single record
//		Collated		Keeps all atoms as individual records
//
//		PERMISSIONS
//		Authenticating	Adds sign-in capability
//
//		CAPABILITIES
//		Profiled		Has a profile
//		Followable		Adds ability to be followed
//		Following		Adds ability to follow Followables
//		Posting			Adds ability to create posts
//		Moderated		Can be reported, subject to Laws & Sanctions
//		Moderating		Jury membership
//		Reactive		Can respond to content & track bias
//		Reactable		Can be reacted to
//		Reuptable		Reputation
//		Empowered		Rights and Unlocking
//		Certified		Emblems and Proofs
//		Governing		Hosts Laws, Sanctions, Rights
//		Voting			Can (collectively) amend Governing settings
//		Financial		Owns tokens
//		Minting			Can create/manage tokens
//		Paid			Costs tokens to create/update
//		Owning			Can own Ownables/NFTs
//		Ownable			NFTs

// NOTE: Compsables use async functions and directly throw errors
//		 when they encounter a problem. Composed entities should
//		 use promises to catch these errors and handle them at
//		 the top level.


// Entities keep links to other entities in the hierarchy with
// them. These links are:
//		parent		The entity immediately above the current entity
//		master		The first authoring entity above the current entity
//		domain		The first governing entity above the current entity
//		nation		The top-level entity


class BaseEntity {

	constructor(parent) {

		// Set trait flags
		this.entity = true
		this.uid = uuid()
		this.traits = Set(["Entity"])
		this.attributes = Map()
		this.actions = Map()

		// Store link to parent entity
		this.parent = parent

		// Store link to nation
		this.nation = parent.nation

		// If this entity is authenticating, set as
		// master; otherwise, inherit the parent
		// entity's master
		this.master = this.parent.master

		// If entity is governing, set as domain;
		// otherwise, inherit parent entity's domain
		this.domain = this.parent.domain

		// Account
		this.name = undefined			// Name of this account type
		this.account = null				// This entity's account
		this.connecting = undefined		// Connection promise
		this.disconnecting = undefined	// Disconnection promise
		this.completionListener = null	// Subscription to account's onSync callback
		
		// Flags
		this.connected = false			// Is the account connection open?
		this.empty = true				// Has the account received any data?
		this.updating = false			// Is the account currently updating?
		this.complete = false			// Is the account in sync with the ledger?

		// Timestamps
		this.created = null				// Timestamp of earliest atom
		this.updated = null				// Time of most recent update
		this.changed = null				// Time of most recent change to data

		// Map of current atoms in this account
		this.lastState = null
		this.atoms = Set()
		this.history = OrderedMap()

		// Buffering method calls
		this.buffering = Map()
		this.buffered = Map()

		// Clients
		this.clients = Map()

		// Errors
		this.exceptions = Map()

		// Current listeners
		this.listeners = Map()

		this.log = this.log.bind(this)
		this.logline = this.logline.bind(this)
		this.error = this.error.bind(this)
		this.fail = this.fail.bind(this)
		this.registerException = this.registerException.bind(this)

		this.is = this.is.bind(this)
		this.fromAddress = this.fromAddress.bind(this)
		this.fromSeed = this.fromSeed.bind(this)
		this.connect = this.connect.bind(this)
		this.disconnect = this.disconnect.bind(this)

		this.read = this.read.bind(this)
		this.readWith = this.readWith.bind(this)
		this.readWithout = this.readWithout.bind(this)

		this.shouldUpdate = this.shouldUpdate.bind(this)
		this.sort = this.sort.bind(this)
		this.addAtom = this.addAtom.bind(this)
		this.deleteAtom = this.deleteAtom.bind(this)

		this.attribute = this.attribute.bind(this)
		this.with = this.with.bind(this)
		this.without = this.without.bind(this)

		this.addClient = this.addClient.bind(this)
		this.sync = this.sync.bind(this)
		this.act = this.act.bind(this)
		this.removeClient = this.removeClient.bind(this)
		this.removeAllClients = this.removeAllClients.bind(this)

		this.dispatch = this.dispatch.bind(this)
		this.forward = this.forward.bind(this)
		this.addListener = this.addListener.bind(this)
		this.removeListener = this.removeListener.bind(this)

		this.write = this.write.bind(this)

		// Helpers
		this.beforeCreate = this.beforeCreate.bind(this)
		this.onCreate = this.onCreate.bind(this)

		this.beforeConnect = this.beforeConnect.bind(this)
		this.onConnect = this.onConnect.bind(this)
		this.beforeUpdate = this.beforeUpdate.bind(this)
		this.beforeChange = this.beforeChange.bind(this)
		this.beforeAdd = this.beforeAdd.bind(this)
		this.onAdd = this.onAdd.bind(this)
		this.beforeDelete = this.beforeDelete.bind(this)
		this.onDelete = this.onDelete.bind(this)
		this.onChange = this.onChange.bind(this)
		this.onUpdate = this.onUpdate.bind(this)
		this.onComplete = this.onComplete.bind(this)
		this.beforeDisconnect = this.beforeDisconnect.bind(this)
		this.onDisconnect = this.onDisconnect.bind(this)

		this.onAddAttribute = this.onAddAttribute.bind(this)
		this.onRemoveAttribute = this.onRemoveAttribute.bind(this)
		this.onAttribute = this.onAttribute.bind(this)
		
		this.beforeNextConnect = this.beforeNextConnect.bind(this)
		this.onNextConnect = this.onNextConnect.bind(this)
		this.beforeNextUpdate = this.beforeNextUpdate.bind(this)
		this.beforeNextChange = this.beforeNextChange.bind(this)
		this.beforeNextAdd = this.beforeNextAdd.bind(this)
		this.onNextAdd = this.onNextAdd.bind(this)
		this.beforeNextDelete = this.beforeNextDelete.bind(this)
		this.onNextDelete = this.onNextDelete.bind(this)
		this.onNextChange = this.onNextChange.bind(this)
		this.onNextUpdate = this.onNextUpdate.bind(this)
		this.onNextComplete = this.onNextComplete.bind(this)
		this.beforeNextDisconnect = this.beforeNextDisconnect.bind(this)
		this.onNextDisconnect = this.onNextDisconnect.bind(this)

		// Register universal exceptions
		this.registerException(0, "entity", "No override found for default <seed> method.")
		this.registerException(1, "entity", "No override found for default <addAtom> method.")
		this.registerException(2, "entity", "No override found for default <deleteAtom> method.")
		this.registerException(3, "entity", "Entity Name Not Found. " +
			"Composed Entities must specify a 'name' variable in their" +
			"constructor to tag ledger records and act as an identifier."
		)
		this.registerException(4, "entity", id => `Unknown Attribute '${id}'`)

		this.registerException(5, "client", action => `Unknown Action: ${action}`)
		this.registerException(6, "client", "Invalid Auth Token")
		

	}





// OVERIDE THESE METHODS

	// Generates a seed string for account creation
	get seed() {
		throw this.exception[0]()
	}

	// (OPTIONAL) Shorthand for referring to account in logs, etc...
	get label() {
		return this.account ?
			`${this.name}:${this.shortAddress}` :
			`${this.name}:BLANK`
	}

	// (OPTIONAL) Add custom context to outputs
	logline(line) {
		return `${this.label} => ${line || "[NO OUTPUT RECEIVED]"}`
	}

	// (OPTIONAL) Set conditions to ignore certain conditions
	shouldUpdate(data) {
		return true
	}

	// Process an atom with new data
	async addAtom(data) {
		throw this.exception[1]()
	}

	// Process an atom removing data
	async deleteAtom(data) {
		throw this.exception[2]()
	}

	// (OPTIONAL) Change how the history object is ordered
	sort(last, next) {
		return last.created > next.created ? 1 : -1
	}

	// (OPTIONAL) Control the core output of this entity
	get state() {
		return Map()
	}





// GETTERS

	// Check traits
	is(trait) {
		return this.traits
			.map(t => t.toLowerCase())
			.includes(trait.toLowerCase())
	}

	// Address of this account
	@assert("Account")
	get address() {
		return this.account.getAddress()
	}

	// Short version of account address, for output
	@assert("Account")
	get shortAddress() {
		const l = this.address.length
		return `${this.address.substring(0, 4)}…${this.address.substring(l - 4, l)}`
	}

	get status() {
		return {

			// Entity type
			name: this.name,
			label: this.label,

			// Address
			address: this.address,

			// Flags
			connected: this.connected,
			complete: this.complete,
			empty: this.empty,

			// Timestamps
			created: this.created,
			updated: this.updated,

			// Traits
			traits: this.traits.toJS(),

			// Actions
			actions: this.actions.keySeq().toJS(),

			// Parent
			parent: this.parent ?
				{
					name: this.parent.name,
					label: this.parent.label,
					address: this.parent.address
				}
				: null,

			// Generate time stamp for this sync
			// (We can't guarantee the client will
			// receive sync data in the order they
			// occur, so need to let the client
			// ignore old data)
			timestamp: new Date().getTime(),

			// Atom history for building current state
			history: this.history.toJS(),

			// State of this entity
			state: this.state.toJS(),

			// Attribute entities belonging to this entity
			attributes: this.attributes

				// Ignore omitted/disconnected entities
				.filter(entity => entity.get("entity") &&
					entity.get("entity").connected)

				// Send entity type and address
				.map((entity, id) => { return {
					type: entity.get("entity").name,
					address: entity.get("entity").address
				}})
				.toJS()

		}
	}

	get latest() {
		return this.timeline.valueSeq().last()
	}





// LOGGING

	// Write new line to logger
	log(line, level) {
		this.nation.log(this.logline(line), level)
	}

	// Write error to logger
	error(error, context) {
		this.nation.error(error, this.logline(context))
	}

	// Error handler
	fail(context, ...args) {
		return error => {

			// Convert to error object, if required
			if (!(error instanceof Error)) error = new Error(error)

			// Report error, if required
			if (!error.reported) {

				// Convert entities into text
				let data = args.map(
					a => (a && a instanceof BaseEntity) ? a.label : a
				)

				// Build arguments output
				let argline = (data.length > 0) ?
					` with ${JSON.stringify(...args)}`
					: ""

				// Write error log
				this.error(error, `${context}${argline}`)

				// Set reported flag
				error.reported = true

			}

			// Throw error
			throw error

		}
	}

	// Exception register
	registerException(code, type, message) {

		// Ensure exception codes are unique
		if (this.exceptions.get(code)) throw new Error(
			`Exception Code >${code}< already exists. ` +
			`Attempting to register '${type.toUpperCase()} ERROR'.`
		)

		// Build error object
		let error = (...args) => {

			// Make error message prefix
			let prefix = `${type.toUpperCase()} ERROR: `

			// Build error message
			let suffix
			if (typeof message !== "string") {
				suffix = message(args)
			} else {
				suffix = message
			}

			// Create error
			let error = new Error(prefix + suffix)
			error.code = code

			// Return error
			return error

		}

		// Store exception
		this.exceptions = this.exceptions.set(code, error)

	}

	// Exception retreival
	get exception() {
		return this.exceptions.toJS()
	}




// CONNECTION

	@cached
	fromAddress(address) {

		// Retreive account from address
		this.account = this.nation.ledger.accountForAddress(address)

		// Return entity
		return this

	}


	@cached
	fromSeed() {

		// Create account
		this.account = this.nation.ledger.accountForSeed(this.seed)

		// Return entity
		return this

	}


	@assert("Account")
	async connect(silent = false) {

		// Make sure account name has been set
		if (!this.name) throw this.exception[3]()


		// Wait for promise, if still disconnecting
		if (this.disconnecting) await this.disconnecting


		// Ignore if already connected
		if (this.connected) return this


		// Otherwise, open connection
		if (!this.connecting) {

			// Create connection promise
			this.connecting = new Promise(async (resolve, reject) => {

				// Log connection
				this.log("Connecting to Ledger", 4)

				// Declare timeout variable
				let timeout

				// Store account
				this.lastState = this.state

				// Wait for account to get up to date
				this.addListener("onComplete", data => {

					// Set connected flag
					this.connected = true

					// Clear promise from state
					this.connecting = null
					
					// Return account
					resolve(this)

				})

				// Fire event
				if (!silent) await this.dispatch("willConnect")
					.catch(this.fail("Dispatching willConnect"))

				// Add account system
				this.account.addAccountSystem(this)

				// Add atom cache
				// let cache = this.nation.ledger.cacheFor(this.address)
				// this.account.enableCache(cache)

				// REMOVE THIS ONCE RADIX FIX THEIR SYNC BUG
				let fakeCompleter

				// Set account waiting for up-to-date event
				this.completionListener = this.account
					.isSynced()
					.subscribe({

						// Handle isSynced changes
						next: async complete => {

							// Cancel timeout
							clearTimeout(timeout)

							// REMOVE THIS ONCE RADIX FIX THEIR SYNC BUG
							clearTimeout(fakeCompleter)

							// Check if account is up to date
							if (complete) {

								// Log completion
								this.log("Up-to-Date with Ledger", 4)

								// Set complete flag
								this.complete = true

								// Dispatch event
								if (!silent) await this.dispatch("onComplete")
									.catch(this.fail("Dispatching onComplete"))
							
							// Otherwise, clear flag and wait
							} else {

								// Clear flag
								this.complete = false

								// REMOVE THIS ONCE RADIX FIX THEIR SYNC BUG
								fakeCompleter = setTimeout(
									async () => {
										if (!this.complete) {

											// Log completion
											this.log("Up-to-Date with Ledger (auto)", 4)

											// Set complete flag
											this.complete = true

											// Dispatch event
											if (!silent) await this.dispatch("onComplete")
												.catch(this.fail("Dispatching onComplete"))
									
										}
									},
									1000
								)

							}

						},

						// Handle errors
						error: this.fail("Subscription to isSynced")

					})

				// Set timeout
				timeout = setTimeout(
					async () => {

						// TODO - REMOVE THIS WHEN RADIX FIX ISSYNCED
						this.complete = true
						if (!silent) await this.dispatch("onComplete")
							.catch(this.fail("Dispatching onComplete"))
						this.log("Up-to-Date with Ledger (timeout)", 4)

						// Clear subscriptions
						// await this.completionListener.unsubscribe()
						// this.account.removeAccountSystem(this.name)

						// Dispatch event
						// await this.dispatch("onConnectionFail")
						// 	.catch(this.fail("Dispatching onConnectionFail"))

						// // Reject promise
						// reject(new Error("Timed Out"))

					},

					// TODO - REMOVE THIS WHEN RADIX FIX ISSYNCED
					1000

					//this.nation.ledger.config.timeout * 1000
				)

				// Open connection
				this.account
					.openNodeConnection()
					.catch(this.fail("Opening Account Connection"))

				// Fire event
				if (!silent) await this.dispatch("onConnect")
					.catch(this.fail("Dispatching onConnect"))

			})

		}


		// Return the connection promise
		return await this.connecting

	}


	async disconnect(silent = false) {

		// Ignore if not connected
		if (!this.connected) return this

		// Wait for promise, if still connecting
		if (this.connecting) await this.connecting

		// Ignore if already disconnecting
		if (!this.disconnecting) {

			// Create promise
			this.disconnecting = new Promise(async resolve => {

				// Log
				this.log("Disconnecting", 3)

				// Fire event
				if (!silent) await this.dispatch("willDisconnect")
					.catch(this.fail("Dispatching willDisconnect"))

				// Remove completion listener
				await this.completionListener.unsubscribe()

				// Remove account system
				this.account.removeAccountSystem(this.name)

				// Disconnect attributes
				await Promise.all(this.attributes
					.keySeq()
					.map(k => this.without(k))
				)

				// Close account connection
				await this.account.closeNodeConnection()

				// Clear connected flag
				this.connected = false

				// Fire event
				if (!silent) await this.dispatch("onDisconnect")
					.catch(this.fail("Dispatching onDisconnect"))

				// Remove all listeners
				this.listeners = Map()

				// Remove promise
				this.disconnecting = undefined

				// Resolve
				resolve(this)

			})

		}

		// Return the disconnection promise
		return await this.disconnecting

	}





// READ LEDGER

	get timeline() {
		return this.history.sort(this.sort)
	}


	async processAtomUpdate(update) {

		// Unpack update
		let atom = update.atom
		let action = update.action
		let payload = update.processedData.decryptedData
		const atomID = atom.getAidString()

		// Ensure atom belongs to this nation and
		// is not a duplicate
		if (payload &&
				payload.application === this.nation.fullname &&
				!this.atoms.has(atomID)) {

			// Log atom as received
			this.atoms = this.atoms.add(atomID)

			//TODO - Verify atom signatures, etc...

			// Set update flag
			let didUpdate = false
			this.update = true
			await this.dispatch("willUpdate")
				.catch(this.fail("Dispatching willUpdate"))

			// Get data from atom
			const timestamp = atom.getTimestamp()
			const append = timestamp >= this.last
			const record = JSON.parse(payload.data)

			// Update created timestamp, if required
			if (!this.created) {
				this.created = timestamp
			} else {
				this.created = Math.min(this.created, timestamp)
			}

			// Build data map
			const data = {
				atomID,
				timestamp,
				append,
				...record
			}

			// Check if this atom should update the account
			if (this.name === record.record && this.shouldUpdate(data)) {

				// Log
				this.nation.ledger
					.log(`${this.label} => Received New Atom ${JSON.stringify(data)}`, 1)

				// Dispatch event
				await this.dispatch("willChange")
					.catch(this.fail("Dispatching willChange"))

				// Handle Store atoms
				if (action === "STORE") {

					// Dispatch event
					await this.dispatch("willAdd", data)
						.catch(this.fail("Dispatching willAdd", data))

					// Add atom to history
					this.lastState = this.state
					this.history = this.history
						.set(atomID, data)
						.sort(this.sort)

					// Update state
					await this.addAtom(data)
						.catch(this.fail("Adding New Atom", data))

					// Dispatch event
					await this.dispatch("onAdd", data)
						.catch(this.fail("Dispatching onAdd", data))

				// Handle Delete atoms
				} else if (action === "DELETE") {

					// Dispatch event
					await this.dispatch("willDelete", data)
						.catch(this.fail("Dispatching willDelete", data))

					// Remove atom from history
					this.lastState = this.state
					this.history = this.history.delete(atomID)

					// Update state
					await this.deleteAtom(data)
						.catch(this.fail("Deleting Atom", data))

					// Dispatch event
					await this.dispatch("onDelete", data)
						.catch(this.fail("Dispatching onDelete", data))

				}

				// Dispatch event
				await this.dispatch("onChange")
					.catch(this.fail("Dispatching onChange"))

				// Track last update
				didUpdate = true
				this.changed = new Date().getTime()
				this.empty = false

			}

			// Dispatch event
			await this.dispatch("onUpdate", didUpdate)
				.catch(this.fail("Dispatching onUpdate", didUpdate))

			// Clear updating flag
			this.updating = false
			this.updated = new Date().getTime()

		}

	}



	async read(specify, omit=false) {

		// Get requirements of read
		let required = List()
		if (specify) {
			required = List(specify).map(r => r.toLowerCase())
		}

		// Map through required accounts
		await this.connect()

			// Handle result
			.then(() => Promise.all(this.attributes
				.keySeq()
				.filter(k => required.size === 0 ||
					(omit && !required.includes(k.toLowerCase())) ||
					(!omit && required.includes(k.toLowerCase()))
				)
				.map(k => this.with(k))
			))

			// Handle errors
			.catch(this.fail("Reading from Accounts"))

		// Return this entity
		return this

	}


	async readWith(...args) {
		return this.read(args)
	}


	async readWithout(...args) {
		// NOTE: readWithout called with args will read from
		// every attribute account except for the specified
		// args. HOWEVER, readWithout called with no args
		// is interpreted as read-without-anything.
		if (args.length === 0) {
			return this.connect()
		} else {
			return this.read(args, true)
		}
	}






// SATELLITE ENTITIES

	attribute(id, connector) {
		this.attributes = this.attributes
			.setIn([id, "connector"], connector)
	}


	async with(id) {

		// Skip if dependant already exists
		if (!this.attributes.getIn([id, "entity"])) {

			// Ignore if attribute is already connected
			if (this.attributes.getIn([id, "entity"])) return

			// Log
			this.log(`Connecting Attribute: ${id}`, 3)

			// Retreive connector for this dependency
			let connector = this.attributes.getIn([id, "connector"])

			// Ensure connector exists
			if (!connector) throw this.exception[4](id)

			// Generate attribute entity
			let attribute = await connector()
				.catch(this.fail(`Connecting Attribute ${id}`))

			// Store attribute
			this.attributes = this.attributes
				.setIn([id, "entity"], attribute)

			// Dispatch event
			this.dispatch("onAddAttribute", id)

		}

	}


	async without(id) {

		// Ignore if attribute does not exist or is not connected
		if (!this.attributes.get(id) &&
			!this.attributes.getIn([id, "entity"]) &&
			!this.attributes.getIn([id, "entity"]).connected) {

			// Log
			this.log(`Disconnecting Attribute: ${id}`, 3)

			// Dispatch
			this.dispatch("onRemoveAttribute", id)

			// Disconnect attribute
			await this.attributes
				.getIn([id, "entity"])
				.disconnect()
				.catch(this.fail(`Disconnecting Attribute ${id}`))

			// Delete attribute
			this.attributes = this.attributes.deleteIn([id, "entity"])

		}

	}





// PROXIES

	@assert("Account")
	addClient(socket) {

		// Ignore request if nation is not live
		if (this.nation.live) {

			// Log
			this.log(`Adding Client ${socket.id}`, 3)

			// Store client
			let id = socket.id
			this.clients = this.clients.setIn([id, "socket"], socket)

			// Listen for instructions
			socket.on(this.address, async message => {

				// Log
				this.nation.api.log(`Client:${id} => to ${this.label} ` +
					`${JSON.stringify(message)}`)

				// Unpack message
				const { type, task, ...args } = message

				// Make finisher functions
				let done = (result = true) => {
					if (result.entity) result = result.address
					socket.emit(task, { result })
				}
				let fail = (error) => socket.emit(task, { error: error.message })

				// Handle instruction
				switch (type) {

					// Sync data
					case "sync":
						if (!this.clients.getIn([id, "sync", "active"])) {

							// Initial sync
							this.sync(socket)

							// Trigger syncs on data changes and new attributes
							let sync = () => this.sync(socket)
							let changeListener = this.onChange(sync)
							let attributeListener = this.onAttribute(sync)
							let completeListener = this.onComplete(sync)

							// Store listeners
							this.clients = this.clients.setIn([id, "sync"], Map({
								active: true,
								onChange: changeListener,
								onAttribute: attributeListener,
								onComplete: completeListener,
							}))

						}
						done()
						break

					// Stop syncing
					case "unsync":
						if (this.clients.getIn([id, "sync", "active"])) {

							// Remove listeners
							this.clients.getIn([id, "sync", "onChange"]).remove()
							this.clients.getIn([id, "sync", "onAttribute"]).remove()
							this.clients.getIn([id, "sync", "onComplete"]).remove()

							// Clear syncing flag
							this.clients = this.clients.setIn([id, "sync"], Map({
								active: false
							}))

						}
						done()
						break

					// Add dependencies
					case "read":
						if (args.without) {
							await this.readWithout(...args.without)
						} else if (args.with) {
							await this.readWith(...args.with)
						} else {
							await this.readWith()
						}
						done()
						break

					// Take action
					case "write":
						await this.act(socket, args)
							.then(done)
							.catch(fail)
						break

					// Return an error for unknown instructions
					default: fail(new Error(`Unknown instruction ${type}`))

				}

			})

			// Listen for connection close
			socket.on("disconnect", () => this.removeClient(socket.id))

		}

	}


	sync(socket) {

		// Ignore when socket lost
		if (socket) {

			// Send latest data to the client
			socket.emit(this.address, {
				type: "sync",
				...this.status
			})

		}

	}


	async act(socket, data) {

		// Unpack action
		const { action, args, auth } = data

		// Retreive the method
		let method = this.actions.get(action)

		// Check if method exists
		if (!method) throw this.exception[5](action)

		// Check the auth token is valid
		if (auth !== this.master.auth) throw this.exception[6]()

		// Populate args
		let inputs = await Promise.all(args.map(async arg => {

			// Ignore non-entity arguments
			if (!arg || !arg.isEntity) return arg

			// Get entity type
			let Entity = getEntity(arg.type)
			
			// Make entity
			let input = await new Entity(this.nation)
				.fromAddress(arg.address)
				.read()

			// Return entity
			return input

		}))

		// Call method
		let error
		let output = await method(...inputs)
			.catch(this.fail("Proxy Action", method, args))

		// Return
		return output

	}


	async removeClient(id) {

		// Retreive socket
		let socket = this.clients.getIn([id, "socket"])

		// Handle socket failures
		if (socket) {

			// Emit disconnect event
			socket.emit(this.address, { type: "end" })

			// Disconnect socket
			await socket.disconnect(true)

		}

		// Delete record
		this.clients = this.clients.delete(id)

		// Return entity
		return this

	}


	removeAllClients() {
		return Promise.all(this.clients
			.keySeq()
			.map(this.removeClient)
		)
	}




// LISTENERS

	async dispatch(eventName, data) {

		// Log event
		let dataline = ""
		if (data) { dataline = ` with ${JSON.stringify(data)}` }
		this.nation.eventLog(this.logline(`EVENT: ${eventName}${dataline}`), 1)

		// Build args for callback, unless data has been
		// passed through from another event
		let args
		if (!data || !data.passthrough) {
			args = {
				passthrough: true,
				event: eventName,
				eventData: data,
				history: this.history.toJS(),
				state: this.state.toJS(),
				lastState: this.lastState ?
					this.lastState.toJS()
					: undefined
			}
		} else {
			args = data
		}

		// Run listeners
		return await Promise
			.all(
				this.listeners
					.valueSeq()
					.filter(({ event }) => event === eventName)
					.map(async ({ callback, onError }) => {

						// Create callback promise
						let action = new Promise(resolve => resolve(callback(args)))
						
						// Catch errors
						if (onError) {
							action.catch(error => {
								onError(error, args)
								this.fail(`Callback on ${eventName}`)(error)
							})
						}

						// Return promise
						return action

					})
					.toList()
					.toJS()
			)
			.catch(this.fail(`Dispatching ${eventName}`, data))

	}


	addListener(event, callback, onError, selfDestruct = false) {

		// AVAILABLE EVENTS
		//		willConnect		Fires before the node connection is opened
		//		onConnect		Fires once the connection is established
		//		willUpdate		Fires when a new atom is received
		//		willChange		Fires before a state change
		//		willAdd			Fires before new data is added to state
		//		onAdd			Fires when new data has been added to state
		//		willDelete		Fires before data is removed from state
		//		onDelete		Fires when data has been removed from state
		//		onChange		Fires after a state change
		//		onUpdate		Fires after a new atom was received
		//		onComplete		Fires when data is in sync with the ledger
		//		willDisconnect	Fires before the node connection will close
		//		onDisconnect	Fires when the node connection has closed

		// Generate ID
		let id = uuid()

		// Check if listener should self-destruct after being called
		if (selfDestruct) {

			// Wrap callback
			callback = (...args) => {
				callback(...args)
				this.removeListener(id)
			}

			// Wrap error handler, if required
			if (onError) {
				onError = (...args) => {
					onError(...args)
					this.removeListener(id)
				}
			}

		}

		// Add to listener map
		this.listeners = this.listeners.set(id, {
			event: event,
			callback: callback,
			onError: onError || this.error
		})

		// Return remover function
		return {
			id: id,
			remove: () => this.removeListener(id)
		}

	}


	forward(event, transform) {
		if (transform) {
			return async data => await this.dispatch(event, transform(data))
				.catch(this.fail(`Dispatching ${event}`, data))
		} else {
			return async data => await this.dispatch(event, data)
				.catch(this.fail(`Dispatching ${event}`, data))
		}
	}


	beforeCreate(callback, onError) {
		return this.addListener("willCreate", callback, onError)
	}

	onCreate(callback, onError) {
		return this.addListener("didCreate", callback, onError)
	}



	beforeConnect(callback, onError) {
		return this.addListener("willConnect", callback, onError)
	}

	onConnect(callback, onError) {
		return this.addListener("onConnect", callback, onError)
	}

	beforeUpdate(callback, onError) {
		return this.addListener("willUpdate", callback, onError)
	}

	beforeChange(callback, onError) {
		return this.addListener("willChange", callback, onError)
	}

	beforeAdd(callback, onError) {
		return this.addListener("willAdd", callback, onError)
	}

	onAdd(callback, onError) {
		return this.addListener("onAdd", callback, onError)
	}

	beforeDelete(callback, onError) {
		return this.addListener("willDelete", callback, onError)
	}

	onDelete(callback, onError) {
		return this.addListener("onDelete", callback, onError)
	}

	onChange(callback, onError) {
		return this.addListener("onChange", callback, onError)
	}

	onUpdate(callback, onError) {
		return this.addListener("onUpdate", callback, onError)
	}

	onComplete(callback, onError) {
		return this.addListener("onComplete", callback, onError)
	}

	beforeDisconnect(callback, onError) {
		return this.addListener("willDisconnect", callback, onError)
	}

	onDisconnect(callback, onError) {
		return this.addListener("onDisconnect", callback, onError)
	}

	onAttribute(callback, onError) {
		let add = this.onAddAttribute(callback, onError)
		let remove = this.onRemoveAttribute(callback, onError)
		return {
			remove: () => {
				add.remove()
				remove.remove()
			}
		}
	}

	onAddAttribute(callback, onError) {
		return this.addListener("onAddAttribute", callback, onError)
	}

	onRemoveAttribute(callback, onError) {
		return this.addListener("onRemoveAttribute", callback, onError)
	}



	beforeNextConnect(callback, onError) {
		return this.addListener("willConnect", callback, onError, true)
	}

	onNextConnect(callback, onError) {
		return this.addListener("onConnect", callback, onError, true)
	}

	beforeNextUpdate(callback, onError) {
		return this.addListener("willUpdate", callback, onError, true)
	}

	beforeNextChange(callback, onError) {
		return this.addListener("willChange", callback, onError, true)
	}

	beforeNextAdd(callback, onError) {
		return this.addListener("willAdd", callback, onError, true)
	}

	onNextAdd(callback, onError) {
		return this.addListener("onAdd", callback, onError, true)
	}

	beforeNextDelete(callback, onError) {
		return this.addListener("willDelete", callback, onError, true)
	}

	onNextDelete(callback, onError) {
		return this.addListener("onDelete", callback, onError, true)
	}

	onNextChange(callback, onError) {
		return this.addListener("onChange", callback, onError, true)
	}

	onNextUpdate(callback, onError) {
		return this.addListener("onUpdate", callback, onError, true)
	}

	onNextComplete(callback, onError) {
		return this.addListener("onComplete", callback, onError, true)
	}

	beforeNextDisconnect(callback, onError) {
		return this.addListener("willDisconnect", callback, onError, true)
	}

	onNextDisconnect(callback, onError) {
		return this.addListener("onDisconnect", callback, onError, true)
	}


	removeListener(id) {
		this.listeners = this.listeners.delete(id)
	}




// WRITE TO LEDGER

	@assert("Account")
	async write(data, master = this.master) {

		// Log
		this.log(`Writing to ledger ${JSON.stringify(data)}`, 3)

		// Check if entity is empty
		let first = false
		if (this.empty) {
			first = true
			await this.dispatch("willCreate", data)
				.catch(this.fail("Dispatching willCreate", data))
		}

		// Dispatch event
		await this.dispatch("willWrite", data)
			.catch(this.fail("Dispatching willWrite", data))

		// Write data
		await master
			.commit(this.account, {
				record: this.name,
				...data
			})
			.catch(this.fail("Writing to Ledger", data))

		// Dispatch first-write event
		if (first) await this.dispatch("didCreate", data)
			.catch(this.fail("Dispatching didCreate", data))

		// Dispatch event
		await this.dispatch("didWrite", data)
			.catch(this.fail("Dispatching didWrite", data))

		// Otherwise, return the entity
		return this

	}



}


// Export entity builder
export default function Entity(...args) {
	if (args.length === 0) {
		return BaseEntity
	} else {
		return args.reduce(
			(last, next) => next(last),
			BaseEntity
		)
	}
}



