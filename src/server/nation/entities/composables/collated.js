


export default Child => class Entity extends Child {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// State
		this.records = Map()
		this.keyName = "id"		// Key used as an ID

		// Methods
		this.get = this.get.bind(this)

		// Set trait data
		this.traits = this.traits.add("Collated")

	}


// OVERRIDES

	// (OPTIONAL) Set specific defaults for record values
	get defaults() {
		return {}
	}

	// (OPTIONAL) Set which variable is considered the entity's value 
	get state() {
		return this.records
	}



// GETTERS

	get all() {
		return this.history.toJS()
	}

	// Allows direct access to the record values
	// as if in a map
	get(...keys) {
		if (keys.length === 1) {
			return this.record.get(keys[0])
		} else {
			return this.record.getIn(keys)
		}
	}

	// Overriding default eventData to provide
	// the current record state to event listeners
	get eventData() {
		return {
			records: this.records.toJS()
		}
	}




// RECEIVE ATOMS

	async addAtom(data) {
		this.records = this.records.set(
			data[this.keyName],
			fromJS(this.defaults).mergeDeep(fromJS(data))
		)
	}

	async deleteAtom(data) {
		this.records = this.records.delete(data[this.keyName])
	}



	
}


