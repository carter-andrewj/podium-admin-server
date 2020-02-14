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

		// Register exceptions
		this.registerException(13, "index", address => `${address} not found`)
		this.registerException(14, "index", entity => `Cannot relate '${entity.name}' entity to index of ${this.contents}`)
		this.registerException(15, "index", entity => `Entity '${entity.label}' already in index. Cannot add.`)
		this.registerException(16, "index", entity => `Entity '${entity.label}' not found in index. Cannot delete.`)

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

	@assert("Connected")
	get meta() {
		return this.index.valueSeq().toJS()
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
		if (!this.has(address)) throw this.exception[13](address)

		// Create and return Entity
		return new this.contents(this.parent).fromAddress(address)

	}

	




// RECEIVE ATOMS

	reindex() {
		this.index = this.timeline.reduce(
			(last, next) => {
				if (!next.exclude) {
					return last.set(next.address, next.meta || {})
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
				this.index = this.index.set(data.address, data.meta || {})
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
				meta: data.eventData.meta || {}
			}}
		)
	}



// WRITE

	@assert("Connected")
	add(entity, meta, master = this.master) {

		// Ensure entity is of the indexed type
		if (!entity.name === this.contents) throw this.exception[14](entity)

		// Ensure entity does not already exist in index
		if (this.has(entity.address)) throw this.exception[15](entity)
			
		// Write entity
		return this.write(
			{
				meta,
				address: entity.address,
				exclude: false
			},
			master
		)

	}


	@assert("Connected")
	delete(entity, master = this.master) {

		// Ensure entity is of the indexed type
		if (!entity.name === this.contents) throw this.exception[14](entity)

		// Ensure entity exists in index
		if (!this.has(entity.address)) throw this.exception[15](entity)

		// Write entity
		return this.write(
			{
				address: entity.address,
				exclude: true
			},
			master
		)

	}


}




