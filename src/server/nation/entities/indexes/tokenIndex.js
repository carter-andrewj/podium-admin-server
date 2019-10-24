import Entity from '../composables/entity';
import Indexed from '../composables/indexed';

import Token from '../token';





export default class TokenIndex extends Entity(Indexed) {


	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Account data
		this.name = "TokenIndex"
		this.contents = Token

	}


	// Generate account seed
	get seed() {
		return `tokens-issued-by-${this.domain.address}`
	}


}