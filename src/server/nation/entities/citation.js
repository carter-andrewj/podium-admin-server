import Entity from './composables/entity';
import Merged from './composables/merged';
import Referable from './composables/referable';




export default class Citation extends Entity(
		Merged,			// Citation data is a key-value map
		Referable,		// Citation can be referenced
		Moderated,		// Citation is subject to Laws
	) {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Account
		this.name = "Citation"

	}





// GETTERS

	get url() {
		return this.record.get("url")
	}






// ACCOUNT

	get seed() {
		return `citation-of-${this.url}`
	}


	fromURL(url) {

		// Create record
		this.record = this.record.set("url", url)

		// Return account
		return this.fromSeed()

	}



// CREATION

	async cite(url) {

		// Create entity account, if absent
		if (!this.account) this.fromURL(url)

		// Ensure entity is connected
		await this.read()

		// Register citation, if not found
		if (this.empty) await this.register(url)

	}

	

			// Get source entity for this citation
			let source = new Source(this.nation).fromCitation(url)

			// Read from source
			await source.read()

			// Create source, if not yet created
			if (source.empty) await source.register()

			// Get citation metadata
			let metadata = await fetchMetadata(url)

		// 
		await Promise.all([

			// Write citation record
			this.write({
				url,
				source: source.address,
				title: metadata.title,
			})

			// Add to source 

		])

	}

}