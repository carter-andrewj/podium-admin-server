import { List } from 'immutable';



export function assert(...args) {

	// Build assertions
	let requirements = args.map(a => {

		// Unpack requirement
		const req = a.split(":").reverse()

		// Get target
		let getTarget
		if (req.length === 1) {
			getTarget = function(context) {
				return context
			}
		} else {
			getTarget = function(context) {
				let target = context.attributes.getIn([req[1], "entity"])
				if (!target) {
					const keys = context.attributes
						.keySeq()
						.toJS()
						.join("', '")
					throw new Error(`Unknown Assertion Target '${req[1]}' from '${keys}'`)
				}
				return target
			}
		}

		// Handle type of requirement
		switch (req[0]) {

			// Require entity to have an account defined
			case "Account": return function(context, message) {
				let target = getTarget(context)
				if (!target.account) {
					throw new Error(`${message} Entity '${target.label}' has no Account`)
				}
			}

			// Require entity to be connected
			case "Connected": return function(context, message) {
				let target = getTarget(context)
				if (!target.connected) {
					throw new Error(`${message} Entity '${target.label}' is not Connected`)
				}
			}

			// Require master to be authorised
			case "Authenticated": return function(context, message) {
				let target = getTarget(context)
				if (!target.master) {
					throw new Error(`${message} Entity '${target.master.label}' has no master`)
				} else if (!target.master.authenticated) {
					throw new Error(`${message} Entity '${target.master.label}' is not Authenticated`)
				}
			}

			// Require entity to be blank
			case "Blank": return (context, message) => {
				let target = getTarget(context)
				if (!target.empty) {
					throw new Error(`${message} Entity '${target.label}' is already populated`)
				}
			}

			// Require entity to have data
			case "Populated": return (context, message) => {
				let target = getTarget(context)
				if (!target.state.size > 0 && !target.complete) {
					throw new Error(`${message} Entity '${target.label} has no data`)
				} 
			}

			// Require entity to be up-to-date
			case "Complete": return function(context, message) {
				let target = getTarget(context)
				if (!target.complete) {
					throw new Error(`${message} Entity '${target.label}' is not complete`)
				}
			}

			// Throw error for unknown requirement
			default: throw new Error(`Unknown Assertion: '${a}'`)

		}

	})


	// Create decorator
	let decorator = function(subject) {

		// Extract subject method
		let method
		if (subject.descriptor.get) {
			method = subject.descriptor.get
		} else {
			method = subject.descriptor.value
		}

		// Get current context
		const context = `Calling '${subject.key.toUpperCase()}()' >`

		// Create wrapped function
		let wrapped = function(...args) {

			// Check requirements
			requirements.map(assert => assert(this, context))

			// Call subject method
			return method.apply(this, args)

		}

		// Replace subject method
		if (subject.descriptor.get) {
			subject.descriptor.get = wrapped
		} else {
			subject.descriptor.value = wrapped
		}

		// Return subject
		return subject

	}


	// Return decorator
	return decorator

}




export function cached(subject) {

	// Get decorated method
	let method = subject.descriptor.value

	// Defined wrapper function
	let wrapped = function(...args) {

		// Execute the generating method
		let result = method.apply(this, args)

		// Cache the result and return
		// (The Nation will return the cached version
		// of the entity, if it already exists, and
		// ignore the new one. Otherwise, it will
		// cache the new entity before returning it.)
		return this.nation.cache(result)

	}

	// Set the new method
	subject.descriptor.value = wrapped

	// Return the new function
	return subject

}




export function buffer(subject) {

	// Get decorated method
	let name = subject.name
	let method = subject.descriptor.value

	// Defined wrapper function
	let wrapped = async function(...args) {

		if (!this) console.log("what?", subject)

		// Check if this function is already captured
		if (this.buffering.get(name)) {

			// Return a promise that will resolve once
			// this instance of the buffered method has
			// been completed
			return await new Promise((resolve, reject) => {
				let recipe = {
					nextArgs: args,
					resolve: resolve,
					reject: reject
				}
				this.buffered = this.buffered.update(
					name,
					q => q ? q.push(recipe) : List([ recipe ])
				)
			})

		} else {

			// Capture the method
			this.buffering = this.buffering.set(name, true)

			// Execute the generating method
			let result = await method.apply(this, args)

			// Clear captured flag
			this.buffering = this.buffering.set(name, false)

			// If queued methods exist, execute next
			let buffered = this.buffered.get(name)
			if (buffered && buffered.size > 0) {

				// Unpack next call
				let { nextArgs, resolve, reject } = buffered.first()

				// Update queue
				this.buffered = this.buffered.update(name, q => q.rest())

				// Call next in buffer asynchronously
				wrapped.apply(this, nextArgs)
					.then(resolve)
					.catch(reject)

			}

			// Return the result
			return result

		}

	}

	// Set the new method
	subject.descriptor.value = wrapped

	// Return the new function
	return subject

}





export async function fetchMetadata(url) {

	// Fetch url
	let response = await fetch(url, { redirect: "follow" })

	// Make metadata object
	let meta = {}

	console.log("response", response)

	// Unpack response
	let text = await response.text()

	// Sanitize html string
	let html = text.replace(/\&amp;/g, "&")

	// Extract HTML title
	let title = html.match(/((\<title>).+?(?=\<\/title\>))/gi)
	if (title) meta.title = HTML.decode(title[0].substring(7))

	// Extract HTML favicon

	// Extract HTML meta tags
	let tags = html.match(/((\<meta ).+?(?=\>))/gi)
	if (tags.length > 0) {
		tags.map(tag => {
			let name = tag.match(/(( name\=\").+?(?=\"))/gi)
			let prop = tag.match(/(( property\=\").+?(?=\"))/gi)
			if (name || prop) {
				key = name ? name[0].substring(7) : prop[0].substring(11)
				let content = tag.match(/(( content\=\").+?(?=\"))/gi)
				if (content) meta[key] = HTML.decode(content[0].substring(10))
			}
		})
	}

	// Return metadata
	return meta

}
