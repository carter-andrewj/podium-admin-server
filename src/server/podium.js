import fs from 'fs';
import path from 'path';
import express from 'express';

import { fromJS } from 'immutable';

import Store from './store/store';
import AdminAPI from './admin/admin';
import Logger from './utils/logger';

import Nation from './nation/nation';



export default class Podium {

	constructor(config) {

		// Unpack config
		this.config = config

		// State
		this.live = false
		this.nation = null

		// Services
		this.server = null
		this.store = null
		this.admin = null

		// Logging
		const { to, path } = this.config.logger
		this.logger = new Logger("Master").start(to, path)

		// Methods
		this.log = this.log.bind(this)
		this.error = this.error.bind(this)

		this.start = this.start.bind(this)
		this.stop = this.stop.bind(this)

		this.launchNation = this.launchNation.bind(this)
		

	}


	log(line, level) {
		this.logger.out(line, level)
	}

	error(error, context) {
		this.logger.error(error, context)
	}


	get status() {
		return {

			live: this.live,
			since: this.started,

			admin: {
				name: process.env.ADMIN_NAME,
				live: this.admin.live
			},

			nation: this.nation ? this.nation.status : null

		}
	}


	async start() {

		// Log
		await this.logger.clear()
		this.log("STARTING PODIUM SERVER", 0)
		this.log("Connecting to File Store", 1)

		// Set up store
		this.store = new Store(this)
		await this.store
			.connect(this.config.store)
			.catch(console.error)

		// Log
		this.log("Launching Server", 1)

		// Launch admin API
		this.server = express()
		this.admin = new AdminAPI(this)
		await this.admin
			.connect(this.config.admin)
			.catch(console.error)

		// Set live flag
		this.live = true
		this.started = new Date().getTime()

		// Log
		this.log("SERVER ONLINE", 0)

		// Return
		return this

	}


	async stop() {

		// Log
		this.log("Closing Podium Server", 0)

		// Clear flag
		this.live = false

		// Close services
		await Promise.all([

			// Disconnect store
			this.store
				.disconnect()
				.then(() => {
					this.log("Disconnected from File Store", 1)
					this.store = undefined
				}),

			// Disconnect admin server
			this.admin
				.disconnect()
				.then(() => {
					this.log("Disconnected Admin Server", 1)
					this.admin = undefined
				})

		])

		// Log
		this.log("SERVER OFFLINE", 0)

		// Stop logger
		this.logger.stop()

		// Return
		return this

	}




// NATION

	async launchNation(constitution) {

		// Log
		this.log(`Launching Nation with ${JSON.stringify(constitution)}`, 1)

		// Create nation
		this.nation = new Nation(this)

		// Launch nation
		await this.nation.launch(constitution)

		// Return nation
		return this.nation

	}


	async stopNation() {

		// Log
		this.log("Stopping Nation", 1)

		// Stop nation
		await this.nation.stop()

		// Clear variables
		this.nation = undefined

	}


}
