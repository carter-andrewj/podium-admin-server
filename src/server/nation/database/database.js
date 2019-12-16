import loki from 'lokijs';
import { v4 as uuid } from 'uuid';

import { Map } from 'immutable';




export default class Database {


	constructor(nation) {

		// Store link to parent nation
		this.nation = nation

		// State
		this.db = undefined			// Database object
		this.config = undefined		// Config
		this.logger = undefined		// Logging

		this.searchTable = undefined
		this.alertsTable = undefined

		this.alertListeners = Map()

		// Methods
		this.connect = this.connect.bind(this)
		this.disconnect = this.disconnect.bind(this)
		
		this.initAlerts = this.initAlerts.bind(this)
		this.alert = this.alert.bind(this)
		this.onAlert = this.onAlert.bind(this)
		this.getAlertsFor = this.getAlertsFor.bind(this)
		this.seenAlerts = this.seenAlerts.bind(this)

		this.initSearch = this.initSearch.bind(this)
		this.addSearch = this.addSearch.bind(this)
		this.search = this.search.bind(this)
		this.find = this.find.bind(this)

	}


// LOGGING

	log(line, level) {
		this.logger.log(line, level)
	}

	error(error, context) {
		this.logger.error(error, context)
	}



// GETTERS

	get path() {
		return `${this.config.path}/${this.nation.fullname}.db`
	}



// SETUP

	// Initialise the database
	connect(config) {
		return new Promise(async (resolve, reject) => {

			// Store config
			this.config = config

			// Make logger
			this.logger = await this.nation.makeLogger("Database")
			this.log(`Connected Database to Nation '${this.nation.fullname}'`)

			// Connect to database
			this.db = new loki(this.path, {

				// Set to autosave
				autosave: true,
				autosaveInterval: this.config.backupInterval * 1000,

				// Set to autoload
				autoload: true,
				autoloadCallback: () => {

					// Confirm or create record stores
					this.initSearch()
					this.initAlerts()

					//TODO - Add dynamic views for quick searching, curating, etc...

					// Make sure the db save object is created
					this.db.saveDatabase(() => resolve(this))

				}

			})

		})
	}


	disconnect() {
		return new Promise((resolve, reject) => {

			// Log
			this.log("Disconnecting Database", 1)

			// Clear listeners
			this.alertListeners = Map()

			// Clear collections
			this.searchTable = undefined
			this.alertsTable = undefined

			// Close database (will trigger autosave)
			this.db.close()
			this.db = undefined

			// Clear variables
			this.config = undefined

			// Log
			this.log("Database Disconnected", 1)

			// Stop logger
			this.logger.stop()
			this.logger = undefined

			// Resolve
			resolve(this)

		})
	}





// ALERTS

	initAlerts() {

		// Get current table
		this.alertsTable = this.db.getCollection("alerts")

		// Create table, if not found
		if (!this.alertsTable) {
			this.alertsTable = this.db.addCollection(
				"alerts",
				{
					unique: [ "key" ],
					ttl: this.config.alertLifetime,
					ttlInterval: this.config.cleanupInterval,
				}
			)
		}

	}

	alert(type, entityTo, entityFrom, entitySubject) {

		// Make record
		let record = {
			key: uuid(),
			type,
			to: entityTo.address,
			from: entityFrom ? entityFrom.address : undefined,
			at: new Date().getTime(),
			about: entitySubject ? entitySubject.address : undefined,
			seen: false
		}

		// Update database
		this.alertsTable.insert(record)

		// Log
		let fromLine = entityFrom ?
			` from ${entityFrom.label}`
			: ""
		let subjectLine = entitySubject ?
			` about ${entitySubject.label}`
			: ""
		this.log(`Added alert about (${type})${fromLine} ` +
				 `to ${entityTo.label}${subjectLine}`)

		// Fire listener, if found
		let callback = this.alertListeners.get(entityTo.address)
		if (callback) callback(record)

		// Send push notification

		// Return database
		return this

	}


	onAlert(address, callback) {

		// Add listener
		this.alertListeners = this.alertListeners.set(address, callback)

		// Return remover
		return {
			address: address,
			remove: () => this.alertListeners = this.alertListeners.delete(address)
		}

	}


	getAlertsFor(address) {
		return this.alertsTable
			.find({ to: { "$eq": address }})
	}


	seenAlerts(...keys) {
		this.alertsTable
			.chain()
			.find({ key: { "$in": keys }})
			.update({ seen: true })
	}





// SEARCH

	initSearch() {

		// Get current table
		this.searchTable = this.db.getCollection("search")

		// Create collection, if not found
		if (!this.searchTable) {
			this.searchTable = this.db.addCollection(
				"search",
				{ unique: ["address"] }
			)
		}

	}


	async addSearch(type, key, address) {

		// Update database
		this.searchTable.insert({
			type,
			key: key.toLowerCase(),
			address
		})

		// Log
		this.log(`Added search term (${type})${key} for ${address}`)

		// Return database
		return this

	}

	search(terms, among = ["user"]) {

		// Sanitize terms
		let sanitizedTerms = terms
			.replace(/[-[\]{}()*+!<=:?.\/\\^$|#\s,]/g, '\\$&')
			.toLowerCase()

		// Return search
		return this.searchTable
			.find({
				type: { "$in": among },
				key: { "$regex": sanitizedTerms }
			})
			.map(r => r.address)

	}


	find(term, among = ["user"]) {

		// Sanitize search term
		let sanitizedTerm = term
			.replace(/[-[\]{}()*+!<=:?.\/\\^$|#\s,]/g, '\\$&')
			.toLowerCase()

		// Return search
		return this.searchTable
			.find({
				type: { "$in": among },
				key: { "$eq": sanitizedTerm }
			})
			.map(r => r.address)

	}



}



