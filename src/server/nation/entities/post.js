import { Map, List, fromJS, OrderedSet } from 'immutable';

import Entity from './composables/entity';
import Merged from './composables/merged';
import Promotable from './composables/promotable';
import Moderated from './composables/moderated';
import Respondable from './composables/respondable';
import Reactable from './composables/reactable';

import { assert } from './utils';





export default class Post extends Entity(
		Reactable,			// Post can be reacted to
		Respondable,		// Post can receive replies
		Promotable,			// Post can be promoted
		Moderated,			// Post is subject to Laws
		Merged,				// Post record is key-value map
	) {


	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Account
		this.name = "Post"

		// Methods
		this.fromPostNumber = this.fromPostNumber.bind(this)

		this.author = this.author.bind(this)
		this.amend = this.amend.bind(this)
		this.retract = this.retract.bind(this)

		// Actions
		this.actions = this.actions
			.set("Author", this.author)
			.set("Amend", this.amend)
			.set("Retract", this.retract)

	}



// GETTERS

	get number() {
		return this.record.get("number")
	}



// ATOM HANDLING

	combine(last, next, key) {
		switch (key) {

			// Combine text
			case "text": return `${last}${next}`

			// Combine entries flag
			case "entries": return Math.max(last, next)

			// Determine most recent update
			case "timestamp": return Math.max(last, next)

			// Combine mentions
			case "mentions": return [...last, ...next]

			// Combine topics
			case "topics": return [...last, ...next]

			// Combine links
			case "links": return [...last, ...next]

			// Combine media
			case "media": return [...last, ...next]

			// Use latest value for all other keys
			default: return next

		}
	}


// ACCOUNT

	get seed() {
		return `post-number-${this.number}-from-${this.master.address}`
	}

	@assert("Blank")
	fromPostNumber(n) {

		// Preemtively set state
		this.record = fromJS({ number: n })

		// Create and return account
		return this.fromSeed()

	}


// CREATE

	@assert("Blank", "Authenticated")
	async author(content, tokenSymbol) {

		// Unpack content
		const { text, mentions, topics, links, media } = content

		// Get token
		let token = this.domain.getToken(tokenSymbol)

		// Calculate post cost
		let cost = token.cost.content(content)

		// Ensure user has the balance to pay for this post

		// Set up for next post account
		this.record = fromJS({
			number: this.master.postCount + 1
		})

		// Create and connect to account
		await this.fromSeed()
			.read()
			.catch(this.fail("Reading Post", this.number))

		// Make sure post does not already exist
		if (!this.empty) {
			throw new Error(`${this.master.label} has already posted ${this.number} times`)
		}

		// Construct parentage data
		let reply = false
		let parentage
		if (this.parent.name === this.name) {
			reply = true
			parentage = {
				parent: this.parent.address,
				origin: this.parent.origin,
				depth: this.parent.depth + 1
			}
		} else {
			parentage = {
				origin: this.address,
				depth: 0
			}
		}

		// Make post record
		this.record = fromJS({
			text: text,
			cost: cost,
			currency: tokenSymbol,
			author: this.master.address,
			domain: this.domain.address,
			mentions: mentions ? mentions.map(m => m.address) : undefined,
			topics: topics ? topics.map(m => m.address) : undefined,
			links: links,
			media: media ? media.map(m => m.address) : undefined,
			...parentage,
			...this.record.toJS()
		})

		// Write to ledger
		await Promise
			.all([
	
				// Create post record
				this.write(this.record.toJS()),

				// Add to author's index
				this.master.posts.add(this),

				// Pay for post
				//this.master.transact(cost, token, this),

				// Add to parent replies
				reply ? this.parent.replies.add(this) : null

			])
			.catch(this.fail("Writing Post", this.record.toJS()))

		// Return post
		return this

	}


	amend(text, notice) {}


	retract(notice) {}



}


