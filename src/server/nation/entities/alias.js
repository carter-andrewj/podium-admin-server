import Entity from './composables/entity';
import Merged from './composables/merged';
import Ownable from './composables/ownable';




export default class Alias extends Entity(
		Ownable,		// Alias is an NFT
		Merged,			// Alias data is a key-value map
	) {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Account
		this.name = "Alias"

		// State
		this.markup = "@"

	}


	get seed() {
		return `alias-${this.id}`
	}

}