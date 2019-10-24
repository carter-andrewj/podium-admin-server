



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




