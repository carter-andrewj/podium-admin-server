import { Map } from 'immutable';

import Authenticating from './composables/authenticating';
import Alertable from './composables/alertable';
import Voting from './composables/voting';
import Moderated from './composables/moderated';
import Moderating from './composables/moderating';
import Certified from './composables/certified';
import Owning from './composables/owning';
import Transacting from './composables/transacting';
import Reputable from './composables/reputable';
import Empowered from './composables/empowered';
import Reactive from './composables/reactive';
import Posting from './composables/posting';
import Following from './composables/following';
import Followable from './composables/followable';
import Profiled from './composables/profiled';
import Merged from './composables/merged';
import Entity from './composables/entity';

import Alias from './alias';

import { assert, cached } from './utils';






export default class User extends Entity(
		Authenticating,	// User can write to ledger
		Alertable,		// User can receive alerts
		Voting,			// User takes part in governance
		Moderated,		// User is subject to Laws and can be Reported
		Moderating,		// User takes part in enforcing Laws
		Certified,		// User can have Emblems/Proofs
		Owning,			// User can own NFTs
		Transacting,	// User can own and transfer Tokens
		Reputable,		// User has Reputation
		Empowered,		// User has Unlockable Rights
		Reactive,		// User can React to content
		Posting,		// User can create new posts
		Following,		// User can follow other entities
		Followable,		// User can be followed by other entities
		Profiled,		// User has and can update their profile
		Merged,			// User's state is a key-value map
	) {


	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Account
		this.name = "User"

		// Methods
		this.fromAlias = this.fromAlias.bind(this)
		this.withAlias = this.withAlias.bind(this)

		this.create = this.create.bind(this)

		// Actions
		this.actions = this.actions
			.set("Create", this.create)

		// Attributes
		this.attribute("Alias", this.withAlias)

	}




// GETTERS

	get label() {
		if (this.alias && !this.alias.empty) {
			return `${this.name}:${this.alias.label}`
		} else {
			return super.label
		}
	}

	get alias() {
		return this.attributes.getIn(["Alias", "entity"])
	}





// READ

	@assert("Blank")
	fromAlias(alias) {

		// Check if alias is connected
		if (alias.connected) {
			throw new Error("Alias is not connected")
		}

		// Check if alias exists
		if (alias.empty) {
			throw new Error("No data received for Alias")
		}

		// Log
		this.log(`Retreiving User from Alias ${alias.label}`, 2)

		// Connect to user account
		return this.fromAddress(alias.owner)

	}





// ATTRIBUTES

	async withAlias() {
		return await new Alias(this)
			.fromIdentifier(this.record.get("alias"))
			.read()
			.catch(this.fail("Reading Alias"))
	}




// CREATE

	@assert("Blank")
	async create(alias, passphrase) {

		// Log
		this.log(`Creating New User: @${alias}`, 2)

		// Set user record
		this.record = Map({ alias })

		// Generate new user identity
		await this.authenticate
			.withNew(alias, passphrase)
			.catch(this.fail("Authenticating New User", alias))

		// Start reading from user
		await this.read()

		// Reject if alias is already taken
		// (Read will automatically connect to the Ownable
		// account corresponding to the user's chosen alias.
		// If it is available, that account will be empty.)
		if (!this.alias.empty) {
			throw new Error(`Alias '${this.alias.label}' is not Available`)
		}		

		// Cache this user
		this.nation.cache(this)

		// Setup user
		await Promise
			.all([

				// Write user record
				this.write(this.record.toJS())
					.catch(this.fail("Writing User Data")),

				// Save user keys
				this.keyStore
					.save()
					.catch(this.fail("Saving User Keys")),

				// Claim alias
				this.alias
					.claim()
					.catch(this.fail("Claiming Alias")),

				// Add uase to database
				this.nation.database
					.addSearch("user", alias, this.address)
					.catch(this.fail("Adding user to Database"))

			])
			.catch(this.fail("Writing User Support Data"))

		// Log
		this.log(`Created New User: ${this.label}`, 2)

		// Return user
		return this

	}



}


