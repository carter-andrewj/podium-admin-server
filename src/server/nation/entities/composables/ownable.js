import { fromJS } from 'immutable';

import { assert } from '../utils';



export default Child => class Entity extends Child {

	constructor(...args) {

		// Call parent constructor
		super(...args)
		
		// Validate composition
		if (this.is("Owning")) {
			throw new Error("Composition Error: Cannot be both Owning and Ownable.")
		}

		// State
		this.markup = undefined

		// Methods
		this.fromIdentifier = this.fromIdentifier.bind(this)

		this.claim = this.claim.bind(this)
		this.transfer = this.transfer.bind(this)

		// Traits
		this.traits = this.traits.add("Ownable")

		// Actions
		this.actions = this.actions
			.set("Claim", this.claim)
			.set("Transfer", this.transfer)

		// Register Errors
		this.registerException(17, "ownable", () =>`${this.name} is already Owned. Cannot Claim.`)
		this.registerException(18, "ownable", entity => `Cannot transfer to Entity of type '${recipient.name}'`)
		this.registerException(19, "ownable", "Transfering Account is not the Owner")

	}



// GETTERS

	@assert("Connected")
	get owned() {
		return this.empty ? false : true
	}

	@assert("Complete")
	get owner() { 
		return this.record.get("owner")
	}

	get id() {
		return this.record.get("id")
	}

	get label() {
		return `${this.name}:${this.markup}${this.id}`
	}

	@assert("Complete")
	get mine() {
		return this.master.address === this.owner
	}




// READ

	get seed() {
		return `ownable-${this.name}-${this.id}`
	}

	fromIdentifier(id) {

		// Pre-emptively initial data
		this.record = fromJS({ id: id })

		// Create and return ownable
		return this.fromSeed()

	}



// WRITE

	@assert("Account", "Authenticated")
	async claim() {

		// Load topic, if not already up to date
		if (!this.complete) await this.read()

		// Reject if ownable is already owned
		if (this.owned) throw this.exception[17]()
		
		// Create ownable
		await Promise
			.all([

				// Write ownable record
				this.write({
					id: this.record.get("id"),
					owner: this.master.address
				}),

				// Add ownable to owner's index
				this.master.owned.add(this),

				//TODO - Pay for ownable creation

			])
			.catch(this.fail("Claiming Ownership", this.id))

		// Return ownable
		return this

	}


	@assert("Authenticated")
	async transfer(recipient) {

		// Ensure new owner can receive ownable
		if (!recipient.is("Owning")) throw this.exception[18](recipient)

		// Ignore if recipient is the current owner
		if (this.master.address === recipient.address) return this

		// Ensure transfering user is up-to-date
		if (!this.master.owned.complete) await this.master.read("owned")

		// Ensure recipient's index is connected
		if (!recipient.owned.connected) await recipient.read("owned")

		// Ensure transferer is current owner
		if (!this.mine) throw this.exception[19]()

		// Transfer ownership
		await Promise
			.all([

				// Change record ownership
				this.write({ owner: recipient.address }),

				// Remove from old owner's index
				this.master.owned.delete(this.address),

				// Add to new owner's index
				recipient.owned.add(this.address)

			])
			.catch(this.fail("Transfering Ownership", recipient))

		// Return ownable
		return this

	}

}



