import { Repeat, List } from 'immutable';

import { assert } from '../utils';

import ReactionIndex from '../indexes/reactionIndex';



export default Child => class Entity extends Child {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Methods
		this.withReactions = this.withReactions.bind(this)

		// Set trait data
		this.traits = this.traits.add("Reactable")

		// Attributes
		this.attribute("Reactions", this.withReactions)

	}



// GETTERS

	get parameters() {
		return this.nation.constitution.config.balancing.affinity
	}

	@assert("Reactions:Connected")
	get reactions() {
		return this.attributes.getIn(["Reactions", "entity"])
	}

	@assert("Complete")
	get bias() {

		// Calculate the net bias
		return List(this.reactions.meta).reduce(
			(current, step) => {

				// Extend the coordinate frame, if required
				if (current.length < step.bias.length) {
					current = [
						...current,
						...Repeat(0, step.bias.length - current.length).toJS()
					]
				}

				// Return the total and counter
				return current.map((b, i) => {

					// Calculate bias step
					let distance = step.bias[i] * step.value * this.parameters.step.size
					let weighting = Math.exp(-0.5 * Math.pow((b + distance) / this.parameters.step.norm, 2.0))

					// Return new coordinates
					return b + (distance * weighting)

				})

			},
			[]
		)

	}




// READ

	@assert("Account")
	async withReactions() {

		// Start reading from indexes
		let index = await new ReactionIndex(this)
			.fromSeed()
			.read()
			.catch(this.fail("Reading Reactions"))

		// Create events
		index.onAdd(this.forward("onReact"))

		// Return entity
		return index

	}




}


