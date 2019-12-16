import { OrderedSet, OrderedMap } from 'immutable';

import { assert } from '../utils';




export default Child => class Entity extends Child {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// State
		this.contents = null		// Class of entity indexed
		this.index = OrderedMap()

		// Methods
		this.has = this.has.bind(this)
		this.where = this.where.bind(this)
		this.find = this.find.bind(this)
		this.retreive = this.retreive.bind(this)

		this.reindex = this.reindex.bind(this)

		this.indexListener = this.indexListener.bind(this)
		
		this.add = this.add.bind(this)
		this.delete = this.delete.bind(this)

		// Set composition vars
		this.traits = this.traits.add("Indexed")

	}



// GETTERS

	@assert("Connected")
	get all() {
		return this.index.keys().toJS()
	}

	@assert("Connected")
	get size() {
		return this.index.size
	}

	get state() {
		return OrderedSet(this.index.keys())
	}




// QUERIES

	@assert("Connected")
	has(item) {
		return this.index.has(item)
	}

	@assert("Connected")
	where(condition) {
		return this.index.filter(v => condition(v)).toJS()
	}

	@assert("Connected")
	find(condition) {
		return this.where(condition)[0]
	}

	@assert("Connected")
	retreive(address) {

		// Ensure entity is known
		if (!this.has(address)) {
			throw new Error(`INDEX ERROR: Entity ${address} not found`)
		}

		// Create and return Entity
		return new this.contents(this.parent).fromAddress(address)

	}




// RECEIVE ATOMS

	reindex() {
		this.index = this.timeline.reduce(
			(last, next) => {
				if (!next.exclude) {
					return last.set(next.address, next.support || {})
				} else {
					return last.delete(next.address)
				}
			},
			OrderedMap()
		)
	}

	async addAtom(data) {
		if (data.append) {
			if (data.exclude) {
				this.index = this.index.delete(data.address)
			} else {
				this.index = this.index.set(data.address, data.support || {})
			}
		} else {
			this.reindex()
		}
	}

	async deleteAtom(data) {
		this.reindex()
	}




// LISTENERS

	indexListener(event) {
		return this.forward(
			event,
			data => { return {
				...data,
				eventData: data.eventData.address,
				support: data.eventData.support || {}
			}}
		)
	}



// WRITE

	@assert("Connected")
	add(entity, support) {

		// Ensure entity is of the indexed type
		if (!entity.name === this.contents) {
			throw new Error(`INDEX ERROR: Attempted to add '${entity.name}' ` +
							`Entity to index of '${this.contents}'`)
		}

		// Ensure entity does not already exist in index
		if (this.has(entity.address)) {
			throw new Error(`INDEX ERROR: Cannot add Entity '${entity.label}' ` +
							`- already in Index.`)
		}

		// Write entity
		return this.write({
			support,
			address: entity.address,
			exclude: false
		})

	}


	@assert("Connected")
	delete(entity) {

		// Ensure entity is of the indexed type
		if (!entity.name === this.contents) {
			throw new Error(`Index Error: Attempted to delete '${entity.name}' ` +
							`Entity from index of '${this.contents}'`)
		}

		// Ensure entity exists in index
		if (!this.has(entity.address)) {
			throw new Error(`Index Error: Cannot delete Entity '${entity.label}' ` +
							`- not found in Index`)
		}

		// Write entity
		return this.write({
			address: entity.address,
			exclude: true
		})

	}


}




