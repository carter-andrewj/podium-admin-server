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




// Declare variables
let podium
let live = false




// CATCH ERRORS ON EXIT
function fail(error) {
	console.log(`ROOT ERROR => ${error.message}`)
	console.error(error)
	process.exit("done")
}



// STOP SERVER
async function exit(msg) {

	// Exit safely
	if (msg === "done") return

	// Prevent automatic exit
	process.stdin.resume()

	// Ignore if not live
	if (live) {

		// Log
		console.log("STOPPING PODIUM SERVER")

		// Clear flag
		live = false

		// Schedule auto-resume, if applicable
		if (msg !== "ok" && msg !== "sigint") {

			// Make backup file
			await podium.setRestore().catch(fail)

		} else {

			// Clear backup file
			await podium.clearRestore().catch(fail)

		}

		// Stop server
		await podium.stop().catch(fail)

		// Log
		console.log("SERVER OFFLINE")

	}

	// Report errors
	if (msg instanceof Error) console.error(msg)

	// Exit safely
	process.exit("done")

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
		podium = await new Podium(config).start().catch(fail)

		// Handle exit
		process.on("exit", x => x ? exit(x) : exit("ok"))
		process.on("SIGINT", exit)
		process.on("SIGUSR1", exit)
		process.on("SIGUSR2", exit)
		process.on("uncaughtException", exit)

		// Restore from backup, if available
		await podium.restore().catch(fail)

		// Log
		console.log("SERVER ONLINE")

	}

}




// RUN
enter()


