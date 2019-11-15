import loki from 'lokijs';




export default class Database {


	constructor(nation) {

		// Store link to parent nation
		this.nation = nation

		// State
		this.db = undefined			// Database object
		this.config = undefined		// Config
		this.logger = undefined		// Logging

		this.searchTable = undefined

		// Methods
		this.connect = this.connect.bind(this)
		this.disconnect = this.disconnect.bind(this)
		
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
				autosaveInterval: this.config.backupFrequency,

				// Set to autoload
				autoload: true,
				autoloadCallback: () => {

					// Confirm or create record stores
					this.initSearch()

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

			// Clear collections
			this.searchTable = undefined

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
		return this.searchTable
			.find({
				type: { "$in": among },
				key: { "$regex": terms.toLowerCase() }
			})
			.map(r => r.address)
	}


	find(term, among = ["user"]) {
		return this.searchTable
			.find({
				type: { "$in": among },
				key: { "$eq": term.toLowerCase() }
			})
			.map(r => r.address)
	}



}



