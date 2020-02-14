import Entity from './composables/entity';
import Merged from './composables/merged';
import Storable from './composables/storable';

import { assert } from './utils';




export default class Source extends Entity(
		Merged,			// Source record is a key-value map
		Moderated,		// Source is subject to Laws and can be Reported
		Reputable,		// Source has reputation
	) {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Account
		this.name = "Source"

		// Methods

		// Attributes
		this.

	}



// GETTERS

	get url() {
		return this.record.get()
	}




// ACCOUNT

	get seed() {
		return `source-of-${this.url}`
	}


	fromCitation(citationURL) {

		// Unpack url source
		let url = citationURL
			.replace(/(http(?:s?)\:\/\/(www.)?)/gi, "")
			.split("/")[0]

		// Set source url
		this.record = this.record.set("url", url)

		// Build account and return
		return this.fromSeed()

	}



// ATTRIBUTES

	withCitations() {

	}




// CREATION

	@assert("Populated")
	async register() {

		// Get data from root url
		let metadata = await fetchMetadata(this.url)

		// Write data
		await this.write({

		})

		// Return 

	}


}