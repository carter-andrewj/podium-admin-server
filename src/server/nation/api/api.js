import express from 'express';
import http from 'http';
import socketio from 'socket.io';

import { Map } from 'immutable';

import Session from './session';



export default class API {

	constructor(nation) {

		// Store link to parent
		this.nation = nation

		// Set up state
		this.config = undefined		// Configuration object
		this.connection = undefined	// Socket object
		this.live = false			// Connection open flag

		this.sessions = Map()		// Active session storage

		// Methods
		this.log = this.log.bind(this)
		this.error = this.error.bind(this)

		this.connect = this.connect.bind(this)
		this.open = this.open.bind(this)
		this.close = this.close.bind(this)

		this.startSession = this.startSession.bind(this)
		this.endSession = this.endSession.bind(this)
		this.rejectSession = this.rejectSession.bind(this)

	}




// GETTERS

	get activeSessions() {
		return this.sessions.size
	}




// LOGGING

	log(line, level) {
		this.logger.log(line, level)
	}

	error(error, context) {
		this.logger.error(error, context)
	}




// SETUP

	connect(config) {
		return new Promise(async (resolve, reject) => {

			// Store config
			this.config = config

			// Create logger
			this.logger = await this.nation.makeLogger("API")
			this.log(`Connecting API to Nation '${this.nation.fullname}'`)

			// Build server
			await new Promise(resolve => {
				this.server = http
					.Server(this.nation.podium.server)
					.listen(this.config.port, () => {
						this.log("Websocket Server Online", 1)
						resolve()
					})
			})

			// Create websocket service
			this.connection = socketio(this.server)

			// Reject new connections
			this.connection.on("connection", this.rejectSession)

			// Resolve
			resolve(this)

		})
	}


	disconnect() {
		return new Promise(async (resolve, reject) => {

			// Log
			this.log("Disconnecting API", 1)
			
			// Close all connections
			if (this.live) await this.close()



			// Log
			this.log("Closing Websocket Server", 2)

			// Close websocket
			await new Promise(r => this.connection.close(r))


			// Log
			this.log("Stopping Server", 2)

			// Close server
			await new Promise(r => this.server.close().once("close", r))


			// Log
			this.log("Cleaing Up", 2)

			// Clear variables
			this.config = undefined
			this.server = undefined
			this.connection = undefined

			// Log
			this.log("API Offline", 1)

			// Stop logger
			this.logger.stop()
			this.logger = undefined

			// Resolve
			resolve(this)

		})

	}


	open() {
		return new Promise(resolve => {

			// Log
			this.log("Opening Websocket", 1)

			// Accept connections
			this.connection.on("connection", this.startSession)

			// Set flag
			this.live = true

			// Log
			this.log("Websocket Open", 1)

			// Resolve
			resolve(this)

		})
	}


	close() {
		return new Promise(async resolve => {

			// Log
			this.log("Closing Websocket", 1)

			// Clear live flag
			this.live = false

			// Reject new connections
			this.connection.on("connection", this.rejectSession)

			// Terminate active sessions
			await Promise.all(this.sessions.map(s => s.disconnect()))

			// Log
			this.log("Websocket Closed", 1)

			// Close websocket server
			resolve(this)

		})
	}




// SESSIONS

	startSession(socket) {

		// Log
		this.log(`New Session: ${socket.id}`, 2)

		// Create session
		let session = new Session(this).connect(socket)

		// Store session
		this.sessions = this.sessions.set(socket.id, session)

	}


	endSession(id) {
		this.sessions = this.sessions.delete(id)
	}


	rejectSession(socket) {
		socket.emit("connection", { error: "offline" })
	}





}