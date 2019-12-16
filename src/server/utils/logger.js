import fs from 'fs';

import { Map } from 'immutable';





export default class Logger {


	constructor(name) {

		// Set logger details, if provided
		this.name = name || "podium"

		// Set defaults
		this.open = false
		this.prefix = ""
		this.path = undefined
		this.level = undefined
		this.observers = Map()
		this.throw = false

		// Methods
		this.clear = this.clear.bind(this)

		this.start = this.start.bind(this)
		this.stop = this.stop.bind(this)

		this.toConsole = this.toConsole.bind(this)
		this.toFile = this.toFile.bind(this)
		this.toNone = this.toNone.bind(this)

		this.errorToConsole = this.errorToConsole.bind(this)
		this.errorToFile = this.errorToFile.bind(this)
		this.errorToNone = this.errorToNone.bind(this)

		this.out = this.out.bind(this)

		this.throwOnError = this.throwOnError.bind(this)
		this.continueOnError = this.continueOnError.bind(this)
		this.error = this.error.bind(this)

		this.withPrefix = this.withPrefix.bind(this)
		this.withoutPrefix = this.withoutPrefix.bind(this)

		this.setLevel = this.setLevel.bind(this)
		this.clearLevel = this.clearLevel.bind(this)

		this.addListener = this.addListener.bind(this)
		this.clearListener = this.clearListener.bind(this)
		this.toListeners = this.toListeners.bind(this)

		// Set default logger output
		this.log = this.toNone

	}

	get timestamp() {
		return new Date().toLocaleString('en-GB')
	}



// ANNOTATION

	withPrefix(prefix) {
		if (prefix.length > 0) {
			this.log(`[SETTING PREFIX: ${prefix}]`)
			this.prefix = prefix + ": "
		}
		return this
	}

	withoutPrefix() {
		if (this.prefix.length > 0) {
			this.prefix = ""
			this.log("[CLEARED PREFIX]")
		}
		return this
	}



// LOGGING LEVEL

	setLevel(n) {
		if (n >= 0) {
			this.level = n
			this.log(this.levelLine)
		} else {
			this.clearLevel()
		}
		return this
	}

	clearLevel() {
		this.level = undefined
		this.log(this.levelLine)
		return this
	}

	get levelLine() {
		return `[LOGGING LEVEL = ${this.level || "ALL"}]`
	}



// SETUP

	clear() {
		return new Promise((resolve, reject) => {
			switch (this.current) {

				// Clear the console
				case "console":
					console.clear()
					resolve(true)
					break

				// Empty the file
				case "file":
					Promise
						.all([

							// Reset log file
							new Promise((res, rej) => {
								if (fs.existsSync(`${this.path}.log`)) {
									fs.unlink(
										`${this.path}.log`,
										error => {
											if (error) {
												rej(error)
											} else {
												fs.openSync(`${this.path}.log`, "w")
												res(true)
											}
										}
									)
								} else {
									res(true)
								}
							}),

							// Reset error file
							new Promise((res, rej) => {
								if (fs.existsSync(`${this.path}_Error.log`)) {
									fs.unlink(
										`${this.path}_Error.log`,
										error => {
											if (error) {
												rej(error)
											} else {
												fs.openSync(`${this.path}_Error.log`, "w")
												res(true)
											}
										}
									)
								} else {
									res(true)
								}
							})

						])
						.then(resolve)
						.catch(reject)
					break

				case "s3":
					resolve(true)
					break

				default: resolve(false)

			}
		})
	}



// OUTPUT

	start(destination, path) {

		// Ignore if logger is already outputting to this destination
		if (destination !== this.current) {

			// Close current log
			if (this.open) {
				this.log(`[SWITCHING TO ${desgination.toUpperCase()}]`)
				this.close()
			}


			// Check desired output destination
			switch (destination) {


				// Log to console
				case "console":

					// Set logger to console
					this.log = this.toConsole
					this.logError = this.errorToConsole

					// Break
					break


				// Log to file
				case "file":

					// Set logger to file
					this.log = this.toFile
					this.logError = this.errorToFile

					// Set file path
					this.path = `${path || "./logs"}/${this.name}`

					// Create files, if they don't already exist
					if (!fs.existsSync(`${this.path}.log`)) {
						fs.closeSync(fs.openSync(`${this.path}.log`, "w"))
					}
					if (!fs.existsSync(`${this.path}_Error.log`)) {
						fs.closeSync(fs.openSync(`${this.path}_Error.log`, "w"))
					}

					break


				// Reject bad instruction
				default:
					this.log(`\n[ERROR]\nUnknown logging destination ${destination}\n`)

			}

			// Store current destination and return success
			this.current = destination
			this.open = true

			// Log
			this.log("[OPENING LOG]")

		}

		// Return logger
		return this

	}


	stop() {

		// Ignore if logger is not open
		if (this.open) {

			// Close out current log
			this.log("[CLOSING LOG]")

			// Stop output
			this.log = this.toNone
			this.logError = this.errorToNone

			// Clear variables
			this.path = undefined
			this.current = undefined

			// Clear flag
			this.open = false

		}

		// Return
		return this

	}




// OUTPUTS

	toConsole(line) {
		console.log(line)
		return true
	}


	toFile(line) {
		fs.appendFileSync(
			`${this.path}.log`,
			`${this.timestamp}: ${line}\n`
		)
		return true
	}


	toNone() {
		return false
	}


	out(line, level=0) {

		let result

		// Write result
		if (!this.level || level < this.level) {
			const output = `${" ".repeat(3 * level)}${this.prefix}${line}`
			result = this.log(output)

		// Or ignore
		} else {
			result = false
		}

		// Run callbacks
		this.toListeners(line, result)

		// Return result
		return this

	}



// ERRORS

	errorToConsole(error) {
		console.error(error)
	}

	errorToFile(error) {
		fs.appendFileSync(
			`${this.path}_Error.log`,
			`${error.stack}\n\n`
		)
	}

	errorToS3(error) {}

	errorToNone() {}



	throwOnError() {
		this.throw = true
		return this
	}

	continueOnError() {
		this.throw = false
		return this
	}


	error(error, context) {

		const output = `[ERROR] ${context || ""}`
		const result = this.log(output) && this.log(` > ${error.message}`)
		this.logError(error)

		this.toListeners(output, result, error)

		if (this.throw) { throw error }
		return error

	}



// OBSERVERS

	addListener(id, callback) {
		this.observers = this.observers.set(id, callback)
		return this
	}

	clearListener(id) {
		this.observers = this.observers.delete(id)
		return this
	}

	toListeners(output, result, error=null) {
		this.observers.map((cb, id) => cb({
			output: output,
			written: result,
			error: error,
			logger: this,
			me: id
		}))
		return this
	}



}


