import { Map, List } from 'immutable';

import { v4 as uuid } from 'uuid';

import fs from 'fs';
import request from 'request';

import User from '../entities/user';




// CONFIGURATION

// {
// 		alias: <the actors @-id>
// 		mirror: <the @-id of the twitter account to mirror>
// 		profile: {
// 			name: <display name>
// 			about: <actor bio>
// 			picture: <profile picture location on S3, including file extension>
// 		}
// 		behaviours: [
// 			<list of instructions for the actor to follow>
// 			{
// 				type: <type of action to take>
// 				interval: <time between repeating this action>
// 			}
// 		]
//		reactions: {
//			followed: <action to take when the actor is followed>
//			mentioned: <action to take when the actor is mentioned>
//		}
// }




export default class Actor {

	constructor(population) {

		// REFS
		this.population = population
		this.nation = population.nation
		this.podium = population.podium

		// State
		this.user = undefined
		this.activities = Map()
		this.schedule = Map()
		this.loaded = false
		this.active = false

		// Methods
		this.configure = this.configure.bind(this)

		this.create = this.create.bind(this)
		this.signIn = this.signIn.bind(this)
		this.signOut = this.signOut.bind(this)

		this.activate = this.activate.bind(this)
		this.deactivate = this.deactivate.bind(this)

		this.act = this.act.bind(this)
		this.getAction = this.getAction.bind(this)

		this.postFixed = this.postFixed.bind(this)
		this.postRandom = this.postRandom.bind(this)
		this.postCounter = this.postCounter.bind(this)
		this.mirror = this.mirror.bind(this)

	}


// LOGGING

	log(line, level) {
		this.population.log(`ACTOR:${this.label} => ${line}`, line + 1)
	}




// GETTERS

	get address() {
		return this.user.address
	}

	get label() {
		return this.user ?
				this.user.label
			: this.config ?
				this.config.alias ?
					`@${this.config.alias}` :
					`@${this.config.mirror}`
			: "[unknown]"
	}

	get status() {
		return {
			config: this.config,
			created: this.created,
			address: this.address,
			passphrase: this.passphrase,
			keyPair: this.user ? this.user.encryptedKeyPair : undefined,
			activities: this.activities.toJS()
		}
	}

	get store() {
		return this.population.store
	}





// CREATE

	async configure(config) {

		// Unpack config
		this.config = config

		// Check if actor already exists
		await this.load()

		// Sign-in, if actor already exists
		if (this.created) {
			return await this.signIn()
		} else {
			return await this.create()
		}

	}


	async create() {

		// Log
		this.log("Preparing User")

		// Declare variables
		let picture
		let pictureType

		// Pull data from twitter, if required
		if (this.config.mirror) {

			// Fetch subject's twitter profile
			let profile = await this.population.twitter.profileOf(this.config.mirror)

			// Ingest twitter profile
			this.config.alias = profile.screen_name
			this.config.profile = {
				displayName: profile.name,
				about: profile.description
			}
			this.config.firstPost = {
				text: profile.status.text,
				links: profile.status.entities.urls.map(l => l.expanded_url)
			}

			// Download profile picture
			let [ error, data ] = await new Promise(resolve => request(
				{
					url: profile.profile_image_url_https.replace("_normal", ""),
					method: "get",
					encoding: null
				},
				(err, _, body) => resolve([ err, body ])
			))

			// Handle errors
			if (error) throw error

			// Otherwise, handle image
			picture = data.toString("base64")
			const ext = profile.profile_image_url_https.lastIndexOf(".")
			pictureType = profile.profile_image_url_https.substring(ext + 1)

		}

		// Get picture, if provided
		if (this.config.profile.picture) {

			// Deconstruct filename
			const file = this.config.profile.picture.split(".")
			pictureType = file[1]

			// Load image
			picture = await this.podium.templateStore
				.in("media")
				.read(...file)

		}

		// Log
		this.log("Creating User")

		// Store or generate passphrase
		this.passphrase = this.config.passphrase || uuid()

		// Register user
		this.user = await new User(this.nation)
			.create(this.config.alias, this.passphrase)

		// Log
		this.log("Updating Profile")

		// Set profile
		await this.user.profile.update({
			...this.config.profile,
			picture,
			pictureType
		})


		// Create initial post, if specified
		if (this.config.firstPost) {

			// Log
			this.log("Creating Initial Post")

			// Post
			await this.user.compose(this.config.firstPost, "POD")

		}


		// Save
		await this.save()

		// Set created flag
		this.created = true

		// Return actor
		return this

	}


	async signIn() {

		// Ignore if already signed in
		if (this.user && this.user.authenticated) return this

		// Sign in user
		this.user = await new User(this.nation)
			.authenticate
			.withEncryptedKeyPair(this.keyPair, this.passphrase)

		// Return actor
		return this

	}


	async signOut() {

		// Ignore if not signed in
		if (!this.user || !this.user.authenticated) return this

		// Deactivate user behaviour
		await this.deactivate()

		// Sign out user account
		await this.user.signOut()

		// Save user state
		await this.save()

		// Return actor
		return this

	}




// BEHAVIOUR

	async activate() {

		// Ignore if already active
		if (this.active) return this

		// Set active flag
		this.active = true

		// Log
		this.log("Activating")

		// Start behaviours
		if (this.config.activities)
			await Promise.all(this.config.activities.map(this.act))

		// Log
		this.log("Activation Successful")

		// Return actor
		return this

	}


	async act(activity, index) {

		// Ignore if not active
		if (!this.active) return

		// Unpack behaviour
		let lastParams = this.activities.get(index)
		const { params, type, interval } = activity

		// Log
		this.log(`Performing Activity '${type}'`, 1)

		// If no params exist, create them
		if (!lastParams) lastParams = {
			...params,
			index,
			first: new Date().getTime()
		}

		// Take action
		let action = this.getAction(type)
		let nextParams = await action(lastParams)

		// Record action
		if (!nextParams) nextParams = lastParams
		nextParams.last = new Date().getTime()
		this.activities = this.activities.set(index, nextParams)

		// Save state
		await this.save()

		// Schedule next post, if required
		if (interval) {
			let callback = () => this.act(activity, index)
			this.schedule = this.schedule
				.set(index, setTimeout(callback, interval))
		}

		// Log
		this.log("Activity Complete", 1)

	}


	getAction(type) {
		switch (type) {
			case "post-fixed": return this.postFixed
			case "post-random": return this.postRandom
			case "post-counter": return this.postCounter
			case "mirror": return this.mirror
			default: return () => null
		}
	}


	async postFixed({ content }) {
		await this.user.compose(content, "POD")
	}


	async postRandom() {
		await this.user.compose({ text: `${Math.random()}` }, "POD")
	}


	async postCounter(params) {

		// Increment counter
		params.count = (params.count || 0) + 1

		// Post content
		let plural = params.count === 1 ? "" : "s"
		let content = { text: `I have posted ${params.count} time${plural}`}
		await this.user.compose(content, "POD")

		// Return params
		return params

	}


	async mirror(params) {

		// Listen to post stream
		let data = await this.population.twitter.tweetsOf(this.config.alias)

		// Filter posts made before 'last' timestamp and post
		if (!params.last) params.last = 0
		let tweets = data.filter(t => new Date(t.created_at).getTime() > params.last)

		// Post all
		let url = this.nation.constants.regex.url
		await Promise.all(tweets.map(tweet => {

			// Strip out short form links and replace with long form
			let links = tweet.text.match(url) || []
			let longLinks = links.map(link => tweet.entities.urls
				.filter(l => l.url === link)[0].expanded_url
			)

			// Reconstruct text
			let text = List(tweet.text.split(url))
				.interleave(longLinks)
				.toJS()
				.join("")

			// Compose post
			return this.user.compose({ text: text }, "POD")
		
		}))

		// Update params
		params.last = new Date(Math.max(...tweets.map(t => t.created_at))).getTime()

		// Return params
		return params

	}


	async deactivate() {

		// Ignore if not active
		if (!this.active) return this

		// Clear active flag
		this.active = false

		// Log
		this.log("Deactivating")

		// Clear pending behaviours
		this.schedule.map(callback => clearTimeout(callback))
		this.schedule = Map()

		// Return actor
		return this

	}




// SAVE

	async save() {

		// Save the actor's current status
		await this.store.write(this.status, this.config.alias)

		// Set loaded flag
		// (since the actor is now in-sync with the store)
		this.loaded = true

		// Return the actor
		return this

	}


	async load() {

		// Ignore if already loaded
		if (this.loaded) return this

		// Load backup
		let backup = await this.store.read(this.config.alias)

		// Return if no data received (i.e. actor does not exist)
		if (!backup) return this

		// Unpack backup
		const { created, config, passphrase, keyPair, activities } = backup

		// Save in state
		this.config = config
		this.created = created
		this.passphrase = passphrase
		this.keyPair = keyPair
		this.activities = Map(activities)

		// Set loaded flag
		this.loaded = true

		// Return actor
		return this

	}



}