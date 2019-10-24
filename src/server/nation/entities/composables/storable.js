
import { assert, cached } from '../utils';


export default Child => class Entity extends Child {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Validate composition
		if (!this.is("Merged")) {
			throw new Error("Composition Error: Storable Entities " +
							"must be of type 'Merged'.")
		}

		// Methods
		this.fromFile = this.fromFile.bind(this)

		this.store = this.store.bind(this)
		this.register = this.register.bind(this)

		// Traits
		this.traits = this.traits.add("Storable")

		// Actions
		this.actions = this.actions
			.set("Register", this.register)

	}


// GETTERS

	@assert("Complete")
	get type() {
		this.get("type")
	}

	@assert("Complete")
	get file() {
		return `${this.address}.${this.type}`
	}



// READ

	@assert("Blank")
	@cached
	fromFile(file) {

		// Use file binary as account seed
		this.account = this.nation.ledger
			.accountForSeed(file.toString('base64'))

		// Return entity
		return this

	}



// ACTIONS

	async store(file, type) {
		return await this.nation
			.storeFile(file, this.address, type)
			.catch(this.fail("Storing File"))
	}


	@assert("Blank", "Authenticated")
	async register(file, type) {

		// Log
		this.log("Registering Storable", 3)

		// Connect to proposed account
		await this.fromFile(file)
			.read()
			.catch(this.fail("Reading Registration of Storable"))

		// Ensure account is empty
		if (!this.empty) {
			throw new Error("STORABLE ERROR: Already Registered")
		}

		// Log
		this.log(`Generated Storable Account: ${this.label}`, 4)

		// Store file
		await this.store(file, type)

		// Log
		this.log("Stored", 4)

		// Register storable
		await this.write({
				address: this.address,
				owner: this.master.address,
				type: type
			})
			.catch(this.fail("Registering Storable"))

		// Log
		this.log("Registered", 4)

		// Return entity
		return this

	}


}