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
		this.server = undefined
		this.store = undefined
		this.admin = undefined

		// Logging
		const { to, path } = this.config.logger
		this.logger = new Logger("Master").start(to, path)

		// Methods
		this.log = this.log.bind(this)
		this.error = this.error.bind(this)
		this.fail = this.fail.bind(this)

		this.start = this.start.bind(this)
		this.stop = this.stop.bind(this)

		this.launchNation = this.launchNation.bind(this)

		this.setRestore = this.setRestore.bind(this)
		this.clearRestore = this.clearRestore.bind(this)
		this.restore = this.restore.bind(this)
		

	}



// LOGGING

	log(line, level) {
		this.logger.out(line, level)
	}

	error(error, context) {
		this.logger.error(error, context)
	}

	fail(callback) {
		return error => {
			this.error(error)
			if (callback) {
				callback(error)
			} else {
				throw error
			}
		}
	}




// GETTERS

	get status() {
		return {

			live: this.live,
			since: this.started,

			admin: {
				name: process.env.ADMIN_NAME,
				live: this.admin.live
			},

			nation: this.nation ? this.nation.report : null

		}
	}

	get dataStore() {
		return this.store.in("data")
	}

	get nationStore() {
		return this.store.in("data", "nations")
	}

	get templateStore() {
		return this.store.in("data", "templates")
	}

	get credentialStore() {
		return this.store.in("data", "credentials")
	}

	get mediaStore() {
		return this.store.in("media")
	}





// SETUP

	async start() {

		// Log
		await this.logger.clear()
		this.log("STARTING PODIUM SERVER", 0)




		// Connect to store
		this.store = await new Store(this)
			.connect(this.config.store)
			.catch(this.error)

		// Log
		this.log("Connected to Store", 1)




		// Start admin server
		this.server = express()
		this.admin = await new AdminAPI(this)
			.connect(this.config.admin)
			.catch(this.error)

		// Log
		this.log("Admin Server Online", 1)




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

		// Stop nation processes
		await this.stopNation()

		// Close services
		await Promise.all([

			// Disconnect store
			!this.store ? null : this.store
				.disconnect()
				.then(() => {
					this.log("Disconnected from Store", 1)
					this.store = undefined
				})
				.catch(this.fail),

			// Disconnect admin server
			!this.admin ? null : this.admin
				.disconnect()
				.then(() => {
					this.log("Disconnected Admin Server", 1)
					this.admin = undefined
				})
				.catch(this.fail),

		])

		// Clear variables
		this.started = undefined
		this.server = undefined

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

		// Ignore if nation is not live
		if (!this.nation) return

		// Log
		this.log("Stopping Nation", 1)

		// Stop nation
		await this.nation.stop()

		// Clear variables
		this.nation = undefined

	}




// RESTORE

	async setRestore() {

		// Ignore if no nation is live
		if (!this.nation || !this.nation.live) return

		// Log
		this.log("Setting Auto-Restore", 1)

		// Create local backup
		return await new Promise(resolve => fs.writeFile(
			this.config.nations.restore,
			`${this.nation.filename}${this.nation.saveName}`,
			resolve
		))

	}


	async clearRestore() {
		
		// Ignore if store file does not exist
		if (!fs.existsSync(this.config.nations.restore)) return

		// Log
		this.log("Clearing Auto-Restore", 2)

		// Clear local backup
		await new Promise(resolve => fs.unlink(
			this.config.nations.restore,
			resolve
		))


	}


	async restore() {

		// Check if restore file exists
		let exists = await fs.promises
			.access(this.config.nations.restore)
			.then(() => true)
			.catch(() => false)

		// Ignore if restore file not found
		if (!exists) return

		// Log
		this.log("Restoring Nation", 1)

		// Read restore file
		let nation = await fs.promises
			.readFile(this.config.nations.restore)
			.then(buffer => buffer.toString())

		// Log
		this.log(`Loading Nation: ${nation}`, 2)

		// Read constitution
		let constitution = await this.nationStore.read(nation)

		// Check if constitution exists
		if (!constitution) {
			this.log(`No Constitution found for ${nation}`)
			await this.clearRestore()
			return
		}

		// Create nation
		this.nation = new Nation(this)

		// Load nation
		await this.nation.launch(constitution)

		// Return nation
		return this.nation

	}





}
