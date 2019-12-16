import { Map, List, fromJS, OrderedSet } from 'immutable';

import Entity from './composables/entity';
import Merged from './composables/merged';
import Promotable from './composables/promotable';
import Moderated from './composables/moderated';
import Respondable from './composables/respondable';
import Reactable from './composables/reactable';

import Media from './media';

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

		this.markup = this.markup.bind(this)
		this.compose = this.compose.bind(this)
		this.amend = this.amend.bind(this)
		this.retract = this.retract.bind(this)

		// Actions
		this.actions = this.actions
			.set("Compose", this.compose)
			.set("Amend", this.amend)
			.set("Retract", this.retract)

	}



// GETTERS

	get number() {
		return this.record.get("number")
	}

	get text() {
		return this.record.get("text")
	}

	get characters() {
		return this.text
			.split(this.nation.constants.regex.reference)
			.join("")
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

	markup(regex, label) {

		// Get references in text
		let references = this.text.match(regex)

		// Ignore if no references found
		if (!references) return

		// Split out post text by regex
		let newText = List(this.text.split(regex))

			// Match regex sections and interleave
			.interleave(references.map((item, i) => {

				// Add markup content to state references
				this.record = this.record
					.setIn(["references", label, i], item)

				// Return markup text
				return `{${label}:${i}}`

			}))
			.toJS()
			.join("")

		// Update post text
		this.record = this.record.set("text", newText)

	}
	

	@assert("Blank", "Authenticated")
	async compose(content, tokenSymbol) {

		// Unpack content
		const { text, media } = content

		// Strip references from text
		let chars = ""

		// Store text
		this.record = fromJS({
			number: this.master.postCount + 1,
			text: text,
		})

		// Create and connect to account
		await this.fromSeed()
			.read()
			.catch(this.fail("Reading Post", this.number))

		// Make sure post does not already exist
		if (!this.empty) {
			throw new Error(`${this.master.label} has already posted ${this.number} times`)
		}

		// Markup text
		const { url, mention, topic, domain } = this.nation.constants.regex
		this.markup(url, "links")
		this.markup(mention, "mentions")
		this.markup(topic, "topics")
		this.markup(domain, "domains")

		// Register media
		let mediaEntities
		if (media && media.length > 0) {
			mediaEntities = await Promise.all(media.map(
				({ base64, type }) => new Media(this)
					.retrieveOrRegister(base64, type)
			))
		}

		// Get token
		let token = this.domain.getToken(tokenSymbol)

		// Calculate post cost
		let cost = token.cost.content({
			text: this.characters,
			...this.record.get("references", Map()).toJS()
		})

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
		this.record = this.record.merge(fromJS({
			cost: cost,
			currency: tokenSymbol,
			author: this.master.address,
			domain: this.domain.address,
			media: mediaEntities ?
				mediaEntities.map(m => m.address)
				: undefined,
			...parentage,
		}))

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


