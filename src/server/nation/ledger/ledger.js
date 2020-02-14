import { v4 as uuid } from 'uuid';

import { radixUniverse, RadixUniverse, RadixLogger,
		 RadixAccount, RadixUtil, RadixKeyPair,
		 RadixSimpleIdentity, RadixIdentityManager,
		 RadixKeyStore, RadixTransactionBuilder,
		 RadixNEDBAtomCache } from 'radixdlt';

import { Map, List, fromJS } from 'immutable';






export default class Ledger {


	constructor(nation) {

		// Store nation
		this.nation = nation

		// Set up state
		this.config = Map()
		this.logger = null
		this.connected = false
		this.identityManager = undefined

		// Methods
		this.connect = this.connect.bind(this)

		this.log = this.log.bind(this)
		this.error = this.error.bind(this)

		this.identityForNew = this.identityForNew.bind(this)
		this.identityForKeyPair = this.identityForKeyPair.bind(this)
		this.accountForSeed = this.accountForSeed.bind(this)
		this.accountForAddress = this.accountForAddress.bind(this)
		this.cacheFor = this.cacheFor.bind(this)

		this.storeRecord = this.storeRecord.bind(this)
		this.storeToken = this.storeToken.bind(this)
		this.storeTransaction = this.storeTransaction.bind(this)

	}




// SETUP

	async connect(config) {

		// Unpack config
		this.config = config

		// Create logger
		this.logger = this.nation.makeLogger("Ledger")
		this.log(`Connected Ledger to Nation '${this.nation.fullname}'`)

		// Connect to Decentralized Ledger
		return new Promise((resolve, reject) => {

			// Connect to Radix
			switch (this.config.universe) {

				// Connect to a locally running Emulator Node
				case ("local"):
					radixUniverse.bootstrap(RadixUniverse.LOCALHOST_SINGLENODE);
					break;
				
				// Connect to the Live Betanet
				case ("betanet"):
					radixUniverse.bootstrap(RadixUniverse.BETANET);
					break;

				// Connect to the Sunstone testnet
				case ("sunstone"):
					radixUniverse.bootstrap(RadixUniverse.SUNSTONE);
					break;

				// Connect to the Highgarden testnet
				case ("highgarden"):
					radixUniverse.bootstrap(RadixUniverse.HIGHGARDEN);
					break;

				// Connect to the Original Alphanet
				case ("alphanet"):
					radixUniverse.bootstrap(RadixUniverse.ALPHANET);
					break;

				// Connect to the latest Alphanet
				case ("alphanet2"):
					radixUniverse.bootstrap(RadixUniverse.ALPHANET2);
					break

				// Default to the betanet
				default: 
					radixUniverse.bootstrap(RadixUniverse.BETANET);

			}

			// Create identity manager
			this.identityManager = new RadixIdentityManager()

			//TODO - Test radix connection

			// Set connected flag
			this.connected = true

			// Resolve
			resolve(this)

		})
	}


	disconnect() {
		return new Promise((resolve, reject) => {

			// Log
			this.log("Disconnecting Ledger", 1)

			// Clear flag
			this.connected = false


			// Log
			this.log("Closing Connections", 2)

			// Close connections
			radixUniverse.closeAllConnections()


			// Log
			this.log("Cleaning Up", 2)

			// Clear variables
			this.config = undefined
			this.identityManager = undefined


			// Log
			this.log("Ledger Offline", 1)

			// Stop logger
			this.logger.stop()
			this.logger = undefined


			// Resolve
			resolve(this)

		})
	}




// LOGGING

	log(line, level=0) {
		try {
			this.logger.out(line, level)
		} catch {
			console.log("FAILED TO LOG: ", line)
		}
	}

	error(error, context) {
		try {
			this.logger.error(error, context)
		} catch {
			console.log("FAILED TO LOG ERROR: ", context)
			console.error(error)
		}
	}





// GENERATORS

	identityForNew() {
		return this.identityManager.generateSimpleIdentity()
	}

	identityForKeyPair(keyPair) {
		return new RadixSimpleIdentity(keyPair)
	}

	accountForSeed(seed) {
		return RadixAccount.fromSeed(`${this.nation.fullname}/${seed}`)
	}

	accountForAddress(address) {
		return RadixAccount.fromAddress(address)
	}

	cacheFor(address) {
		const file = `${this.config.cache}/${address}.cache`
		return new RadixNEDBAtomCache(file)
	}





// WRITE TO LEDGER

	storeRecord(identity, accounts,	data, encrypted=false) {
		return new Promise((resolve, reject) => {

			// Generate payload id
			const id = `DAT-${uuid().replace(/\-/g, "").substring(0, 6)}`

			// Serialize payload
			const payload = JSON.stringify(data)

			// Log
			const recipients = accounts
				.map(a => `${a.getAddress().substring(0, 6)}…`)
				.join(", ")
			this.log(`${id} => Writing data to ${recipients}: ${payload}`, 1)
				
			// Build transaction
			RadixTransactionBuilder
				.createPayloadAtom(
					identity.account,			// Owning account
					accounts,					// Destination accounts
					this.nation.fullname,		// Nation ID
					payload,					// Record data
					encrypted					// Encryption of record
				)
				.signAndSubmit(identity)
				.subscribe({
					next: status => this.log(`${id} => ${status}`, 2),
					complete: () => resolve(true),
					error: reject
				})

		})
	}


	storeToken(identity, token, amount) {
		return new Promise((resolve, reject) => {

			// Generate payload if
			const id = `TOK-${uuid().replace(/\-/g, "").substring(0, 6)}`

			// Log
			this.log(`${id} => Minting Token: ${token.name} (${token.symbol})`, 1)

			// Check if token has already been minted
			let transaction;
			if (token.empty) {

				// Issue new token
				transaction = new RadixTransactionBuilder()
					.createTokenMultiIssuance(
						identity.account,
						token.name,
						token.symbol,
						token.description,
						token.granularity,
						amount,
						token.icon
					)

			} else {

				// Mint more tokens
				transaction = RadixTransactionBuilder
					.createMintAtom(
						identity.account,
						token.reference,
						amount
					)

			}

			// Send transaction
			transaction
				.signAndSubmit(identity)
				.subscribe({
					next: status => this.log(`${id} => ${status}`, 2),
					complete: () => resolve(true),
					error: reject
				})


		})
	}


	storeTransaction(identity, recipient, token, amount, meta) {
		return new Promise((resolve, reject) => {

			// Generate payload if
			const id = `TXN-${uuid().replace(/\-/g, "").substring(0, 6)}`

			// Log
			this.log(`${id} => Transfering ${amount}${token.symbol} ` +
					 `from ${identity.address} ` +
					 `to ${recipient.address}`, 1)

			// Create and submit transaction
			RadixTransactionBuilder
				.createTransferAtom(
					identity.account,
					recipient.account,
					token.reference,
					amount,
					JSON.stringify(meta)
				)
				.signAndSubmit(identity)
				.subscribe({
					next: status => this.log(`${id} > ${status}`, 2),
					complete: () => resolve(true),
					error: reject
				})

		})
	}





}