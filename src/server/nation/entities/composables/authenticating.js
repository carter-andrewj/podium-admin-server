import { v4 as uuid } from 'uuid';

import KeyStore from '../keyStore';

import { assert } from '../utils';



export default Child => class Entity extends Child {


	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Set as a master entity
		this.master = this

		// State
		this.keyStore = null
		this.identity = undefined
		this.authenticated = false
		this.auth = undefined

		// Methods
		this.signOut = this.signOut.bind(this)
		this.save = this.save.bind(this)
		this.commit = this.commit.bind(this)

		// Set trait data
		this.traits = this.traits.add("Authenticating")

		// Actions
		this.actions = this.actions.set("signOut", this.signOut)

		// Disconnect Keystore on master disconnect
		this.beforeDisconnect(this.signOut)

		// Register exceptions
		this.registerException(7, "Authentication", "KeyPair not found")

	}





// GETTERS

	get keyPair() {
		return this.keyStore.keyPair
	}

	get encryptedKeyPair() {
		return this.keyStore.encrypted
	}

	get passphrase() {
		return this.keyStore.encryptor
	}

	get access() {
		return {
			address: this.address,
			keyPair: this.encryptedKeyPair,
			auth: this.auth,
			passphrase: this.passphrase
		}
	}





// AUTHENTICATE

	get authenticate () {
		return {



			// Create a new identity
			withNew: async (alias, passphrase) => {

				// Log
				this.log("Generating New Identity", 3)

				// Generate new identity
				this.identity = this.nation.ledger.identityForNew()
				this.account = this.identity.account

				// Read from account
				await this.read()

				// Set authenticated flag
				this.authenticated = true

				// Generate auth token for remote access
				this.auth = uuid()

				// Read from keystore
				this.keyStore = await new KeyStore(this)
					.fromCredentials(alias, passphrase)
					.read()
					.catch(this.fail("Reading New KeyStore", alias))

				// Return entity
				return this

			},



			// Sign in with passphrase
			withCredentials: async (alias, passphrase) => {

				// Log
				this.log("Retreiving KeyPair from Credentials", 3)

				// Open keystore and pass keypair to
				// next authenticator
				this.keyStore = await new KeyStore(this)
					.fromCredentials(alias, passphrase)
					.read()
					.catch(this.fail("Reading from KeyStore", alias))

				// Ensure keystore exists
				if (this.keyStore.empty) throw this.exception[7]()

				// Pass keypair to authenticator
				return this.authenticate
					.withKeyPair(this.keyStore.keyPair)
					.catch(this.fail("Authenticating with KeyPair"))

			},



			// Sign in with encrypted keypair
			withEncryptedKeyPair: async (keyPair, passphrase) => {

				// Log
				this.log("Decrypting KeyPair", 3)

				// Set up keystore
				this.keyStore = new KeyStore(this)
					.fromEncrypted(keyPair, passphrase)

				// Decrypt keys
				await this.keyStore.decrypt()

				// Pass decrypted keypair to authenticator
				return this.authenticate
					.withKeyPair(this.keyPair)
					.catch(this.fail("Authenticating with Keypair"))

			},



			// Sign in with keypair
			withKeyPair: async keyPair => {

				// Log
				this.log("Authenticating with KeyPair", 3)

				// Regenerate identity from keypair
				this.identity = this.nation.ledger
					.identityForKeyPair(keyPair)
				this.account = this.identity.account

				// Connect user account
				await this.read()

				// Set authenticated flag
				this.authenticated = true

				// Generate auth token for remote access
				this.auth = uuid()

				// Return entity
				return this

			},



		}
	}



	async signOut() {

		// Disconnect keystore
		if (this.keyStore && this.keyStore.connected) {
			await this.keyStore
				.disconnect()
				.catch(this.fail("Disconnecting Keystore"))
		}

		// Clear variables
		this.identity = undefined
		this.authenticated = false
		this.auth = undefined

		// Return entity
		return this

	}




// WRITE TO LEDGER

	@assert("KeyStore:Account")
	save() {
		return this.keyStore
			.save()
			.catch(this.fail("Saving Keystore"))
	}


	@assert("Account", "Authenticated")
	commit(account, data) {

		// Write to the ledger
		return this.nation.ledger
			.storeRecord(this.identity, [account], data)
			.catch(this.fail("Storing Record", account.address, data))

	}


}



