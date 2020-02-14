



class Nation {

	constructor(constitution) {

	}

	entity(type) {

	}

}



function Aliased(config) {
	return Child => class Aliased extends Child {

		constructor(...args) {

			// Call parent constructor
			super(...args)

			// Unpack Config
			const { parameters } = config

			// State
			this.markup = parameters

			// Properties
			this.addProperty("alias", {
				type: "reference",
			})

		}

	}
}



export default class Entity {

	constructor(parent) {

		// Refs
		this.nation = parent.nation
		this.parent = parent
		this.owner = parent.owner

		// Data
		this.data = Map()
		this.properties = Map()

		// State
		this.readSync = false	// Is the entity up to date with the ledger
		this.writeSync = false	// Is the ledger up to date with the entity

	}



// PERMISSIONS

	permission({ subjects, test, values }) {
		switch (test) {

			// 
			default: return true

			case "equality":

			// Entity tests
			case "isEntityType": return subjects[0].name === values[0]
			case "isEntityTypeAmong": return values.find(subjects[0].name)
			case "hasTrait": return subjects[0].traits.find(values[0])


		}
	}

	validate() {

	}






// PROPERTIES

	registerProperty(key, { type, validate }) {

		// Add property
		this.properties = this.properties.set(key, {
			type,
			validation
		})

		// Create a getter and setter for this property
		Object.defineProperty(this, key, {
	        get: () => this.data.get("key"),
	        set: value => this.writeProperty(key, value),
	        enumerable: true,
	    })

	}


	writeProperty(key, value) {

		// Validate write permissions

		// Write new data
		this.data = this.data.set(key, value)

		// Validate new entity state

		// Ready for commit
		this.changes = this.changes.push(key)
		this.writeSync = false

	}






// LEDGER

	async whenComplete() {

		// Return immediately if already complete
		if (this.readSync) return true

	}


	async commit() {

		// Ignore if entity has no changes
		if (this.writeSync) return true

		// Wait for entity to be up-to-date
		await this.whenComplete()

		// Reject if properties have changed on the
		// ledger between local change and commit
		

		// Make new payload
		let payload = this.changes.reduce(
			(result, next) => result[next] = this.data.get(next),
			{ record: this.name }
		)

		// Write to ledger
		this.nation.write(this.account, payload)

	}





// METHODS

	async create(id, recipe) {

		// 

	}


	async connect(id) {

	}


	async write(id) {

	}



}