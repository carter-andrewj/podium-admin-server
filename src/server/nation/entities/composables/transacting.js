import { Map } from 'immutable';

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

		// Traits
		this.traits = this.traits.add("Transacting")

		// Actions
		this.actions = this.actions
			.set("Transact", this.transact)

		// Automatically subscribe to transaction
		/// system before connecting to account.
		this.beforeConnect(this.withTransactions)

	}




// GETTERS

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

		// Subscribe for balance updates
		this.account.transferSystem
			.getTokenUnitsBalanceUpdates()
			.subscribe(balance => this.domain.tokens
				.map((token, symbol) => {

					// Get current and new balances
					let last = this.wallet.get(symbol)
					let next = balance[symbol]

					// Check if balance has changed
					if (!last || last !== next) {

						// Update balance
						this.wallet = this.wallet.set(symbol, balance[symbol])

						// Dispatch events
						let eventData = {
							token: token.symbol,
							last,
							next
						}
						this.dispatch("onBalanceChange", eventData)
						if (last > next) {
							this.dispatch("onBalanceLoss", eventData)
						} else {
							this.dispatch("onBalanceGain", eventData)
						}

					}

				})
			)

		// Return entity
		return this

	}




// ACTIONS

	@assert("Account", "Authenticated")
	async transact(amount, token, recipient) {

		// Attempt transaction
		

	}
	
}


