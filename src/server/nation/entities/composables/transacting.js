import { Map, List } from 'immutable';

import Token from '../token';

import { assert } from '../utils';



export default Child => class Entity extends Child {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// State
		this.wallet = Map()

		// Methods
		this.balance = this.balance.bind(this)
		this.transactions = this.transactions.bind(this)

		this.withTransactions = this.withTransactions.bind(this)

		this.transact = this.transact.bind(this)
		this.faucet = this.faucet.bind(this)

		// Traits
		this.traits = this.traits.add("Transacting")

		// Actions
		this.actions = this.actions
			.set("Transact", this.transact)
			.set("Faucet", this.faucet)

		// Automatically subscribe to transaction
		/// system before connecting to account.
		this.beforeConnect(this.withTransactions)

		// Register exceptions
		this.registerException(25, (b, c, t) => `Insufficient funds (${b}${t}) for transaction (${c}${t})`)

	}




// GETTERS

	get status() {
		return {
			...super.status,
			wallet: this.wallet.toJS()
		}
	}

	@assert("Complete")
	balance(symbol) {
		return this.wallet.get(symbol)
	}

	@assert("Connected")
	transactions(symbol) {
		//TODO: Filter by symbol
		return this.account.transferSystem.transactions
	}




// READ

	@assert("Account")
	async withTransactions() {

		// Log
		this.log("Indexing Transactions", 3)

		// Subscribe for transactions
		this.account.transferSystem.transactionSubject
			.subscribe(({ transaction }) => {

				// Unpack trasaction
				let { tokenUnitsBalance, participants, timestamp, message } = transaction
				let [ _, issuer, symbol ] = Map(tokenUnitsBalance).keySeq().first().split("/")
				let value = Number(Map(tokenUnitsBalance).valueSeq().first())
				let partner = Map(participants).keySeq().first()

				// Add to wallet
				this.wallet = this.wallet.update(symbol, transactions => {

					// Initialize transaction index, if required
					if (!transactions) transactions = List()

					// Add transaction and return
					return transactions.push({
						type: !partner ? "issued" : value < 0 ? "sent" : "received",
						from: value > 0 ? partner : undefined,
						to: value < 0 ? partner : undefined,
						timestamp,
						value,
						metadata: (message && message.length > 0) ?
							JSON.parse(message)
							: {},
					})

				})

			})

		return this

	}




// ACTIONS

	@assert("Account", "Authenticated")
	async transact(amount, token, recipient, meta) {

		// Perform transaction
		await this.nation.ledger
			.storeTransaction(this.identity, recipient, token, amount, meta)
			.catch(this.fail(`Transacting ${amount}${token.symbol} to ${recipient.label}`))

		// Return the entity
		return this
		
	}


	@assert("Account", "Authenticated")
	async faucet(amount, token, meta) {

		// Ensure tokens exist to transfer
		await token.mint(amount)

		// Transfer tokens
		await this.nation.ledger
			.storeTransaction(
				this.nation.founder.identity,
				this,
				token,
				amount,
				meta || { for: "faucet" }
			)
			.catch(this.fail(`Requesting ${amount}${token.symbol} from faucet.`))
	
		// Return the entity
		return this

	}

	
}


