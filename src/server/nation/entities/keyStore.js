import { RadixKeyStore } from 'radixdlt';

import { Map, fromJS } from 'immutable';

import Entity from './composables/entity';

import { assert } from './utils';


export default class KeyStore extends Entity() {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Set name
		this.name = "Keys"

		// State
		this.locator = null			// Determines where keys are stored
		this.encryptor = null		// Encrypts/decrypts keys

		this.encrypted = undefined	// Encrypted keypair
		this.keyPair = undefined	// Decrypted keypair

		// Methods
		this.fromCredentials = this.fromCredentials.bind(this)
		this.fromEncrypted = this.fromEncrypted.bind(this)

		this.decrypt = this.decrypt.bind(this)
		this.save = this.save.bind(this)

	}



// GETTERS

	get state() {
		return Map({
			keyPair: this.keyPair,
			encrypted: this.encrypted,
			locator: this.locator,
			encryptor: this.encryptor
		})
	}




// ACCOUNT GENERATION

	get seed() {
		return `keystore-for-${this.locator}-${this.encryptor}`
	}


	@assert("Blank")
	fromCredentials(alias, passphrase) {

		// Set state data
		this.locator = alias
		this.encryptor = passphrase

		// Create and return account
		return this.fromSeed()

	}


	@assert("Blank")
	fromEncrypted(keyPair, passphrase) {

		// Add data to state
		this.encryptor = passphrase
		this.history = this.history.set("init", {
			keys: keyPair,
			created: new Date().getTime()
		})

		// Return keystore
		return this

	}



// READ

	async decrypt() {

		// Check if data has been received
		if (this.history.size > 0) {

			// Get current encrypted keypair
			this.encrypted = this.latest["keys"]

			// Decrypt and store keyPair
			this.keyPair = await RadixKeyStore
				.decryptKey(this.encrypted, this.encryptor)

		// Otherwise, clear keypair
		} else {
			this.encrypted = undefined
			this.keyPair = undefined
		}

	}

	async addAtom() { await this.decrypt() }

	async deleteAtom() { await this.decrypt() }




// WRITE

	@assert("Account", "Authenticated")
	async save() {

		// Set keypair
		this.keyPair = this.master.identity.address.keyPair

		// Encrypt keypair
		//TODO - Correct this dumb setup once radix fixes
		//		 the encryptKey method to actually take
		//		 what decryptKey returns instead of the
		//		 address object
		let encrypted = await RadixKeyStore
			.encryptKey(this.master.identity.address, this.encryptor)

		// Write encrypted keypair
		return this.write({ keys: encrypted })
			.catch(this.fail("Writing to KeyStore", encrypted))

	}




}