import Twit from 'twit';




export default class Twitter {

	constructor(population) {

		// Refs
		this.population = population
		this.nation = population.nation
		this.podium = population.podium

		// State
		this.api = undefined

		// Methods
		this.connect = this.connect.bind(this)

		this.fetch = this.fetch.bind(this)

		this.profileOf = this.profileOf.bind(this)
		this.tweetsOf = this.tweetsOf.bind(this)

	}



// SETUP

	async connect() {

		// Read twitter credentials
		let { consumer, access } = await this.podium.credentialStore.read("twitter")

		// Connect to twitter api
		this.api = new Twit({
			consumer_key: consumer.key,
			consumer_secret: consumer.secret,
			access_token: access.token,
			access_token_secret: access.secret,
			timeout_ms: 60 * 1000,
			strictSSL: true,
		})

		return this

	}




// DATA RETREIVAL

	async fetch(route, params) {

		// Fetch data
		let { error, data } = await new Promise(
			resolve => this.api
				.get(route, params)
				.then(resolve)
				.catch(err => resolve({ error: err }))
		)

		// Throw errors
		if (error) throw error

		// Otherwise, return the result
		return data

	}




// HELPERS

	profileOf(userID) {
		return this.fetch(
			"users/show",
			{ screen_name: userID }
		)
	}

	tweetsOf(userID, count = 5) {
		return this.fetch(
			"statuses/user_timeline",
			{
				screen_name: userID,
				tweet_mode: "extended",
				count
			}
		)
	}

}




