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

		// Register exceptions
		this.registerException(20, "ownable", type => `Unknown Ownable Type: '${type}'`)

	}


	@assert("Connected")
	retreive(type, address) {

		// Ensure index contains address
		if (!this.has(address)) throw this.exception[13]()

		// Check type of ownable
		switch (type) {

			// Retreive an alias
			case "alias":
				return new Alias(this.master).fromAddress(address)

			// Retreive a topic
			case "topic":
				return new Topic(this.master).fromAddress(address)

			// Throw error for unknown ownable types
			default: throw this.exception[20](type)

		}

	}


	// Generate account seed
	get seed() {
		return `ownables-of-${this.master.address}`
	}


}