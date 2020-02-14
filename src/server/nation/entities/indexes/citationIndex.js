import Entity from '../composables/entity';
import Indexed from '../composables/indexed';

import Post from '../post';






export default class CitationIndex extends Entity(Indexed) {


	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Account data
		this.name = "CitationIndex"
		this.contents = Citation

	}


	// Generate account seed
	get seed() {
		return `citations-for-${this.parent.address}`
	}


}


