import express from 'express';
import fs from 'fs';
import cors from 'cors';
import path from 'path';

import { v4 as uuid } from 'uuid';

import { Map } from 'immutable';

import Logger from '../utils/logger';



function handler(subject) {

	// Get subject method
	let method = subject.descriptor.value

	// Wrap function
	let wrapped = async function(request, response, next) {

		// Ignore if offline
		if (!this.live) {

			// Tell client to disconnect
			response
				.status(500)
				.send("disconnect")
				.end()

		} else {

			// Unpack the data
			const { key, ...args } = request.body



			// Validate key
			if (key !== process.env.ADMIN_KEY) {

				// Respond with error
				response
					.status(401)
					.end()

			// Otherwise, perform action
			} else {

				// Timeout response before 2 minutes
				let timer = setTimeout(
					() => response
						.status(408)
						.end(),
					1.9 * 60 * 1000
				)


				// Call the subject method
				await new Promise(resolve => resolve(method.apply(this, [args])))
					.then(result => {

						// Cancel timeout
						clearTimeout(timer)

						// Return result
						response
							.status(200)
							.json({ result })
							.end()

					})
					.catch(error => {

						// Cancel timeout
						clearTimeout(timer)

						// Report errors
						response
							.status(500)
							.send(error)
							.end()

					})

			}

		}

	}

	// Replace method
	subject.descriptor.value = wrapped

	// Return subject
	return subject

}







export default class AdminAPI {

	constructor(podium) {

		// Store link to master object
		this.podium = podium

		// State
		this.live = false
		this.config = undefined
		this.router = undefined
		this.clients = Map()

		// Methods
		this.log = this.log.bind(this)
		this.error = this.error.bind(this)

		this.connect = this.connect.bind(this)
		this.disconnect = this.disconnect.bind(this)

		this.authenticate = this.authenticate.bind(this)

		this.getStatus = this.getStatus.bind(this)
		this.getLogs = this.getLogs.bind(this)
		this.getLogData = this.getLogData.bind(this)

		this.getTemplates = this.getTemplates.bind(this)
		this.getNations = this.getNations.bind(this)

		this.launchNation = this.launchNation.bind(this)
		this.stopNation = this.stopNation.bind(this)

	}


// LOGGING

	log(line, level) {
		this.logger.log(line, level)
	}

	error(error, context) {
		this.logger.error(error, context)
	}



// GETTERS

	get port() {
		return this.config.port
	}

	get route() {
		return this.config.route
	}

	get constitutionStore() {
		return this.podium.templateStore.in("constitutions")
	}

	get populationStore() {
		return this.podium.templateStore.in("populations")
	}




// SETUP

	connect(config) {
		return new Promise(async (resolve, reject) => {


			// Store config and server object
			this.config = config


			// Logging
			const { to, path } = this.podium.config.logger
			this.logger = new Logger("Admin").start(to, path)
			await this.logger.clear()


			// Build and configure router
			this.router = express.Router()

			// Set routes for server status
			this.router.post("/", this.getStatus)

			this.router.post("/authenticate", this.authenticate)

			this.router.post("/logs", this.getLogs)
			this.router.post("/logdata", this.getLogData)

			this.router.post("/templates", this.getTemplates)
			this.router.post("/nations", this.getNations)

			this.router.post("/launchNation", this.launchNation)
			this.router.post("/stopNation", this.stopNation)


			// Set up middlware
			this.podium.server.use(express.static(__dirname + '/../../../'))
			this.podium.server.use(express.json())
			this.podium.server.use(cors())
			this.podium.server.use(this.route, this.router)


			// Open port
			this.listener = this.podium.server.listen(this.port, () => {
				
				// Track connections
				this.listener.on("connection", client => {

					// Reject connections if closed/closing
					if (!this.live) {

						// Destroy connection
						client.destroy()

					// Otherwise, store the connection
					} else {

						// Generate a client id
						let id = uuid()

						// Store client
						this.clients = this.clients.set(id, client)

						// Remove client on close
						client.once("close", () => {
							this.clients = this.clients.delete(id)
						})

					}

				})

				// Set active flag
				this.live = true

				// Log
				const message = `Admin Console at https://localhost:${this.port}`
				console.log(" - ", message)
				this.log(message, 2)

				// Resolve
				resolve(this)

			})


		})
	}



	disconnect() {
		return new Promise(async (resolve, reject) => {

			// Close listener
			if (this.live) {

				// Clear active flag
				this.live = false

				// Destroy all connections
				this.clients.map(client => client.destroy())

				// Stop server
				await new Promise(res => this.listener.close(() => {

					// Log
					const message = "Admin Server Offline"
					console.log(" - ", message)
					this.log(message, 2)

					// Resolve
					res()

				}))

			}

			// Clear variables
			this.config = undefined
			this.router = undefined
			this.listener = undefined
			this.clients = Map()

			// Stop logger
			this.logger.stop()
			this.logger = undefined

			// Resolve
			resolve(this)

		})
	}







// ROUTES

	@handler
	authenticate() {
		return true
	}

	@handler
	getStatus() {
		return this.podium.status
	}

	@handler
	getLogs() {
		return fs.readdirSync(this.podium.config.logger.path)
	}

	@handler
	getLogData({ file }) {

		// Get required log
		const filename = `${this.podium.config.logger.path}/${file}`

		// Read log
		return new Promise((resolve, reject) => fs
			.readFile(filename, (error, data) => {
				if (error) {
					reject(error)
				} else {
					resolve(data.toString())
				}
			})
		)

	}



	@handler
	getTemplates() {

		// Log
		this.log("Retreiving Constitution Templates")
		// Read templates
		return this.constitutionStore
			.list()
			.then(result => Promise.all(result
				.filter(f => f.match(/(\.template\.json)/g))
				.map(filename => {
					const l = filename.length
					const file = filename.substring(0, l - 5)
					return this.constitutionStore.read(file)
				})
			))

	}


	@handler
	getNations() {

		// Log
		this.log("Retreiving Nations")

		// Read templates
		return this.podium.nationStore
			.list()
			.then(result => Promise.all(result
				.filter(f => f.match(/(\.json)/g))
				.map(filename => {
					const l = filename.length
					const file = filename.substring(0, l - 5)
					return this.podium.nationStore.read(file)
				})
			))


	}



	@handler
	launchNation({ constitution }) {

		// Log
		this.log("Launching Nation")

		// Create nation (do not wait for result)
		this.podium
			.launchNation(constitution)
			.catch(this.error)

		// Return success
		return true

	}


	@handler
	stopNation() {

		// Log
		this.log("Stopping Nation")

		// Stop nation
		this.podium
			.stopNation()
			.catch(this.error)

		// Return success
		return true

	}



}






