
import { assert } from '../utils';




export default Child => class Entity extends Child {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Set trait data
		this.traits = this.traits.add("Collective")

	}
	
}


