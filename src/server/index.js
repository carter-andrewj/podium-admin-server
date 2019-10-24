import dotenv from 'dotenv';

import Podium from './podium.js';
import * as config from '../../config.json'


// SET UP ENVIRONMENT

// Load .env file
dotenv.config()

// Ensure global variables are set
if (!process.env.AWS_ACCESS_KEY) {
	throw "AWS ACCESS KEY not found"
}
if (!process.env.AWS_SECRET_ACCESS_KEY) {
	throw "AWS SECRET KEY not found"
}

// Swallow listener warnings
require('events').EventEmitter.prototype._maxListeners = 1000000

// Declare podium variable
let podium
let live = false

// Auto-resume
process.stdin.resume()





// STOP SERVER
async function exit(n) {

	// Ignore if not live
	if (live) {

		// Log
		console.log("STOPPING PODIUM SERVER")

		// Clear flag
		live = false

		// Stop server
		await podium.stop()

		// Log
		console.log("SERVER OFFLINE")

	}

	// Report errors
	if (n instanceof Error) console.error(n)

	// Exit process
	process.exit()

}



// START SERVER
async function enter() {

	// Ignore if already live
	if (!live) {

		// Log	
		console.log("STARTING PODIUM SERVER")

		// Set flag
		live = true

		// Create
		podium = await new Podium(config).start()

		// Handle exit
		process.on("exit", exit)
		process.on("SIGINT", exit)
		process.on("SIGUSR1", exit)
		process.on("SIGUSR2", exit)
		process.on("uncaughtException", exit)

		// Log
		console.log("SERVER ONLINE")

	}

}




// RUN
enter()


