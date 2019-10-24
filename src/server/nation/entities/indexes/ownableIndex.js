import Entity from '../composables/entity';
import Indexed from '../composables/indexed';

import Alias from '../alias';
import Topic from '../topic';

import { assert } from '../utils';





export default class OwnableIndex extends Entity(Indexed) {


	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Account
		this.name = "OwnableIndex"

	}


	@assert("Connected")
	retreive(type, address) {

		// Ensure index contains address
		if (!this.has(address)) {
			throw new Error("Index Error: Address not found")
		}

		// Check type of ownable
		switch (type) {

			// Retreive an alias
			case "alias":
				return new Alias(this.master).fromAddress(address)

			// Retreive a topic
			case "topic":
				return new Topic(this.master).fromAddress(address)

			// Throw error for unknown ownable types
			default:
				throw new Error(`Unknown Ownable Type: '${type}'`)

		}

	}


	// Generate account seed
	get seed() {
		return `ownables-of-${this.master.address}`
	}


}