import Entity from './composables/entity';
import Merged from './composables/merged';
import Profiled from './composables/profiled';
import Ownable from './composables/ownable';
import Collective from './composables/collective';
import Economic from './composables/economic';
import Moderated from './composables/moderated';
import Governing from './composables/governing';

import { assert } from './utils';





export default class Domain extends Entity(
		Governing,		// Domain hosts Laws, Sanctions, & Rights
		Moderated,		// Domain is subject to Laws
		Economic,		// Domain can create and manage tokens
		Ownable,		// TODO - REPLACE THIS WITH A COLLECTIVE OWNERSHIP
		//Collective,		// Domain ownership is shared
		Profiled,		// Domain has a profile
		Merged,			// Domain record is a key-value map
	) {


	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Account
		this.name = "Domain"
		this.markup = "//"

		// State
		this.domain = this

		// Methods
		this.create = this.create.bind(this)

		// Actions
		this.actions = this.actions
			.set("Create", this.create)

	}



// GETTERS

	get id() {
		return this.record.get("id", "[BLANK]")
	}



// READ

	get seed() {
		return `domain-${this.id}`
	}




// ACTIONS

	@assert("Blank", "Authenticated")
	async create(id, tokens, articles) {

		// Log
		this.log(`Creating Domain ${this.markup}${id}`, 2)

		// Generate domain account from seed
		await this.fromIdentifier(id)
			.read()
			.catch(this.fail("Reading Domain", id))

		// Attempt to claim domain
		await this.claim()

		// Log
		this.log("Building Domain", 3)

		// Create domain
		await Promise
			.all([

				// Issue tokens
				...tokens.map(({ designation, seedVolume, ...definition }) =>
					this.issueToken(designation, seedVolume, definition)
				),

				// Create articles

				// Add to database
				this.nation.database
					.addSearch("domain", id, this.address)
					.catch(this.fail("Adding Domain to Database", id))

			])
			.catch(this.fail("Creating Domain", id))

		// Return domain
		return this

	}

}



