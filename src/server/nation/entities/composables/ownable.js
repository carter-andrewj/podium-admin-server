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
		this.record = fromJS({
			id: id,
			owner: this.master.account ? this.master.address : undefined
		})

		// Create and return ownable
		return this.fromSeed()

	}



// WRITE

	@assert("Blank", "Authenticated")
	async claim() {

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


	@assert("Complete", "Authenticated")
	async transfer(recipient) {

		// Ensure new owner can receive ownable
		if (!recipient.is("Owning")) {
			throw new Error("Ownables can only be transfered to Owning Entities")
		}

		// Ensure master's index is connected
		if (!this.master.owned.connected) {
			throw new Error("OWNABLE ERROR: Index not connected.")
		}

		// Ensure recipient's index is connected
		if (!recipient.owned.connected) {
			throw new Error("OWNABLE ERROR: Index not connected.")
		}

		// Ensure transferer is current owner
		if (!this.mine) {
			throw new Error("Cannot tranfer Ownables you do not own")
		}

		// Ensure recipient is not current owner
		if (this.master.address === recipient.address) {
			throw new Error("Cannot transfer Ownables to yourself")
		}

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



