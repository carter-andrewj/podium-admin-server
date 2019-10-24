import OwnableIndex from '../indexes/ownableIndex';

import { assert } from '../utils';




export default Child => class Entity extends Child {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Validate composition
		if (this.is("Ownable")) {
			throw new Error("Composition Error: Cannot be both Owning and Ownable.")
		}

		// Methods
		this.withOwnables = this.withOwnables.bind(this)

		this.claim = this.claim.bind(this)
		this.transfer = this.transfer.bind(this)

		// Traits
		this.traits = this.traits.add("Owning")

		// Attributes
		this.attribute("Owned", this.withOwnables)

		// Actions
		this.actions = this.actions
			.set("Claim", this.claim)
			.set("Transfer", this.transfer)

	}



// GETTERS

	@assert("Connected")
	get owned() {
		return this.attributes.getIn(["Owned", "entity"])
	}




// READ

	@assert("Account")
	async withOwnables() {

		// Start reading from ownables index
		let index = await new OwnableIndex(this)
			.fromSeed()
			.read()
			.catch(this.fail("Reading Ownables"))

		// Add events
		index.onAdd(index.indexListener("onReceiveOwnable"))
		index.onDelete(index.indexListener("onSendOwnable"))

		// Return index
		return index

	}



// WRITE

	@assert("Complete", "Authenticated")
	async claim(type, id) {

		// Create ownable
		let ownable = new Ownable(this)

		// Claim ownership
		await ownable
			.claim(type, id)
			.catch(this.fail("Claiming Ownable", type, id))

		// Return ownable
		return ownable

	}


	async transfer() {}



}