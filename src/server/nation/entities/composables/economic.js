import { Map } from 'immutable';

import Token from '../token';
import TokenIndex from '../indexes/tokenIndex';

import { assert } from '../utils';





export default Child => class Entity extends Child {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// State
		this.tokens = Map()

		// Methods
		this.getToken = this.getToken.bind(this)

		this.withTokenIndex = this.withTokenIndex.bind(this)
		this.withToken = this.withToken.bind(this)

		this.issueToken = this.issueToken.bind(this)

		// Set trait data
		this.traits = this.traits.add("Economic")
		
		// Register attributes
		this.attribute("Tokens", this.withTokenIndex)

		// Register actions
		this.actions = this.actions
			.set("IssueToken", this.issueToken)

	}



// GETTERS

	@assert("Tokens:Connected")
	get tokenIndex() {
		return this.attributes.getIn(["Tokens", "entity"])
	}

	getToken(symbol) {
		return this.attributes.getIn([symbol, "entity"])
	}





// READ

	@assert("Account")
	async withTokenIndex() {

		// Retreive token index
		let index = new TokenIndex(this).fromSeed()

		// Load tokens on receipt
		index.onAdd(async ({ eventData }) => {

			// Get token data
			const address = eventData.address
			const symbol = eventData.meta.symbol

			// Add as a dependency
			this.attribute(symbol, () => this.withToken(address))
			
			// Load token
			await this.with(symbol)

			// Store token id
			this.tokens = this.tokens.set(symbol, this.getToken(symbol))

		})

		// Read from index
		await index
			.read()
			.catch(this.fail("Reading Token Index"))

		// Return 
		return index

	}


	@assert("Account")
	async withToken(address) {

		// Read token
		let token = await new Token(this)
			.fromAddress(address)
			.read()
			.catch(this.fail("Reading Token", address))

		// Return
		return token

	}





// CREATION

	@assert("Connected", "Authenticated")
	async issueToken(designation, amount, config) {

		// Log
		this.log(`Creating Token '${designation.name}' (${designation.symbol})`, 3)

		// Create token
		let token = new Token(this)

		// Issue token
		await token
			.issue(designation, amount, config)
			.catch(this.fail("Issuing Token", designation, amount))

		// Return token
		return token

	}




}


