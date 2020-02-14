import { List, Repeat } from 'immutable';

import { assert } from '../utils';

import BiasIndex from '../indexes/biasIndex';


export default Child => class Entity extends Child {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Set trait data
		this.traits = this.traits.add("Reactive")

		// Methods
		this.withBias = this.withBias.bind(this)
		this.initializeBias = this.initializeBias.bind(this)
		this.react = this.react.bind(this)

		// Initialization
		this.onCreate(this.initializeBias)

		// Attributes
		this.attribute("Bias", this.withBias)

		// Actions
		this.actions = this.actions.set("React", this.react)

		// Exceptions
		this.registerException(26, "reactive", entity => `Cannot react to entity '${entity.label}' (requires 'Reactable' trait).`)
		this.registerException(27, "reactive", entity => `Cannot calculate affinity with '${entity.label}' (requires 'Reactive' trait).`)
		this.registerException(28, "reactive", entity => `Cannot calculate affinity of unloaded entity '${entity.label}'`)
		this.registerException(29, "reactive", value => `Invalid reaction value '${value}' (must be between -1 and 1, exclusive)`)

	}




// GETTERS

	get parameters() {
		return this.nation.constitution.config.balancing.affinity
	}

	@assert("Bias:Connected")
	get biasIndex() {
		return this.attributes.getIn(["Bias", "entity"])
	}

	@assert("Complete")
	get bias() {

		// Calculate the net bias
		return List(this.biasIndex.meta).reduce(
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

	@assert("Complete")
	affinity(target) {

		// Ensure target is loaded
		if (!target.complete) throw this.exception[28](target)

		// Ensure target is a reactive entity
		if (!target.is("Reactive")) throw this.exception[27](target)

		// Calculate dimensionality
		let dimensions = Math.min(this.bias.length, target.length)

		// Loop through dimensions
		let affinity
		for (let d = 0; d < dimensions; d++) {
			affinity = affinity + Math.pow(this.bias[d] - target.bias[d], 2.0)
		}

		// Return affinity
		return 1.0 - Math.pow(affinity, 0.5)

	}




// READ

	@assert("Account")
	async withBias() {

		// Start reading from indexes
		let index = await new BiasIndex(this)
			.fromSeed()
			.read()
			.catch(this.fail("Reading Bias"))

		// Return entity
		return index

	}




// WRITE	

	@assert("Account")
	async initializeBias() {

		// Log
		this.log("Initializing Bias", 3)

		// Seed bias with randomized position in affinity space
		await this.biasIndex.add(this, {
			value: 1,
			bias: Repeat(0, this.parameters.dimensionality)
				.map(_ => (Math.random() * 2.0) - 1.0)
				.toJS()
		})

		// Return entity
		return this

	}


	@assert("Account", "Authenticated")
	async react(target, value) {

		// Ensure subject is reactable
		if (!target.is("Reactable")) throw this.exception[26](target)

		// Ensure value is valid
		if (!value || value >= 1.0 || value <= -1.0) throw this.exception[29](value)

		// Log
		this.log(`Reacting to ${target.label}`, 3)

		// Calculate reward volume
		let pod = this.domain.getToken("POD")
		let aud = this.domain.getToken("AUD")
		let podReward = pod.reward
		let audReward = aud.reward

		// Write reaction
		await Promise.all([

			// Write reaction
			target.reactions.add(
				this,
				{
					value,
					bias: this.bias
				},
				this.master
			),

			// Add to current user's bias index
			this.biasIndex.add(
				target,
				{
					value,
					bias: target.bias
				}
			),

			// Award POD
			podReward > 0 ?
				this.faucet(podReward, pod, {
					subject: this.address,
					for: "reaction",
				})
				: null,

			// Award AUD
			audReward > 0 ?
				this.faucet(audReward, aud, {
					subject: this.address,
					for: "reaction",
				})
				: null,

		])

		// Return entity
		return {
			pod: podReward,
			aud: audReward
		}

	}
	
}


