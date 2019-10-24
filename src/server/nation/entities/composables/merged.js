import { Map } from 'immutable';

import { assert } from '../utils';



// Adds functionality to convert payloads into a single
// queriable record
export default Child => class Entity extends Child {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// State
		this.record = Map()

		// Methods
		this.get = this.get.bind(this)
		this.combine = this.combine.bind(this)
		this.build = this.build.bind(this)

		// Set trait flags
		this.traits = this.traits.add("Merged")

	}




// OVERRIDES

	// (OPTIONAL) Set specific defaults for record values
	get defaults() {
		return {}
	}

	// (OPTIONAL) Set which variable is considered the entity's value 
	get state() {
		return this.record
	}

	// (OPTIONAL) Add specific merge functionality for given keys
	// where the newer record should not simply replace the old
	combine(last, next, key) { return next }



// GETTERS

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
			record: this.record.toJS()
		}
	}

	// Returns undefined if entity is empty, true
	// if entity has data that has not yet been
	// read from the ledger, and otherwise false.
	get pending() {
		if (!this.connected) {
			return undefined
		} else if (!this.record.get("atomID")) {
			return true
		} else {
			return false
		}
	}




// RECEIVE ATOMS

	// Compose output record from history
	// of transaction payloads
	async build() {
		this.record = this.history.reduce(
			(last, next) => last
				.mergeDeepWith(this.combine, next),
			Map(this.defaults)
		)
	}

	async addAtom(data) {
		if (data.append) {
			this.record = this.record
				.mergeDeepWith(this.combine, data)
		} else {
			this.build()
		}
	}

	async deleteAtom(data) {
		this.build()
	}




}




