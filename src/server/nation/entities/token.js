import { fromJS } from 'immutable';

import Merged from './composables/merged';
import Entity from './composables/entity';

import { assert } from './utils';




export default class Token extends Entity(Merged) {


	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Set account data
		this.name = "Token"

		// Methods
		this.pricePer = this.pricePer.bind(this)

		this.fromSymbol = this.fromSymbol.bind(this)

		this.issue = this.issue.bind(this)
		this.mint = this.mint.bind(this)

		// Actions
		this.actions = this.actions
			.set("Issue", this.issue)
			.set("Mint", this.mint)

	}


// GETTERS

	@assert("Populated")
	get tokenName() {
		return this.get("designation", "name")
	}

	@assert("Populated")
	get symbol() {
		return this.get("designation", "symbol")
	}

	@assert("Populated")
	get description() {
		return this.get("designation", "description")
	}

	@assert("Populated")
	get icon() {
		return this.get("designation", "icon")
	}

	@assert("Connected")
	get issuer() {
		return this.get("issuer")
	}

	@assert("Connected")
	get reference() {
		return `/${this.issuer}/${this.symbol}`
	}

	@assert("Populated")
	get cost() {
		return {

			// Cost of creating a new post
			content: content => {

				// Unpack content
				const { text, mentions, topics, links, media } = content

				// Base cost per post
				let cost = this.pricePer("post")

				// Add cost per payload
				// const postChunk = this.nation.settings.maxPostLengthPerPayload
				// cost = cost + (this.pricePer("payload") * Math.ceil(text.length / postChunk))

				// Add cost per character
				// TODO - Remove references from string before calculation
				cost = cost + (this.pricePer("character") * text.length)

				// Add cost per reference
				cost = cost + 
					(mentions && topics ?
						(this.pricePer("reference") * (mentions.length + topics.length))
						: 0
					)

				// Add cost per link
				cost = cost + 
					(links ?
						(this.pricePer("link") * links.length)
						: 0
					)

				// Add cost per media
				cost = cost +
					(media ?
						(this.pricePer("media") * media.length)
						: 0
					)

				// Return cost
				return cost

			},

			// Cost of creating a new topic
			topic: () => this.pricePer("topic"),

			// Cost of creating a new domain
			domain: () => this.pricePer("domain")

		}
	}


	@assert("Connected")
	pricePer(per) {
		return this.record.getIn(["pricing", per])
	}




// READ

	get seed() {
		return `token-with-symbol-${this.symbol}`
	}

	@assert("Blank")
	fromSymbol(symbol) {

		// Preemptively set state
		this.record = this.record.set("symbol", symbol)

		// Create and return account
		return this.fromSeed()

	}




// CREATION

	@assert("Blank", "Authenticated")
	async issue(designation, volume, config) {

		// Ensure token is being issued by an Economic entity
		if (!this.parent.is("Economic")) {
			throw new Error("Token Error: only Economic Entities can issue Tokens")
		}

		// Log
		this.log(`Creating ${volume}${designation.symbol}`, 4)

		// Create initial record
		this.record = fromJS({
			designation,
			issuer: this.master.address,
			...config
		})

		// Read current token account
		await this.fromSeed()
			.read()
			.catch(this.fail("Reading Token", designation))

		// Ensure token is not already defined
		if (!this.empty) {
			throw new Error(`Token '${this.symbol}' is already defined`)
		}

		// Create token
		await Promise
			.all([

				// Define token on ledger
				this.nation.ledger
					.storeToken(this.master.identity, this, volume),

				// Store token data
				this.write(this.record.toJS()),

				// Add to token index
				this.parent.tokenIndex
					.add(this, { symbol: designation.symbol })

			])
			.catch(this.fail("Writing Token", designation))

		// Return token
		return this

	}


	@assert("Account", "Authenticated")
	async mint(amount) {

		// Ensure token is being issued by an Economic entity
		if (!this.parent.economic) {
			throw new Error("Token Error: only Economic Entities can mint Tokens")
		}

		// Log
		this.log(`Minting ${amount}${this.symbol} `, 4)

		// Mint token
		await this.nation.ledger
			.storeToken(
				this.master.identity,
				this,
				amount
			)
			.catch(this.fail("Minting Token", amount))

		// Return token
		return this

	}


}




