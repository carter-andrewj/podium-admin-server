import { Map } from 'immutable';

import Folder from './folders/folder';
import DataFolder from './folders/dataFolder';
import MediaFolder from './folders/mediaFolder';



export default class Path {

	constructor(parent, { path, children }) {

		// Refs
		this.store = parent.store
		this.parent = parent

		// State
		this.path = `${this.parent.path || ""}${path || ""}`
		this.children = Map()

		// Methods
		this.log = this.log.bind(this)
		this.error = this.error.bind(this)
		this.fail = this.fail.bind(this)

		this.subFolder = this.subFolder.bind(this)
		this.setPath = this.setPath.bind(this)

		this.addChild = this.addChild.bind(this)
		this.removeChild = this.removeChild.bind(this)

		this.in = this.in.bind(this)

		// Add initial paths
		Map(children).map(this.addChild)

	}



// GETTERS

	get bucket() {
		return this.parent.bucket
	}



// LOGGING

	log(line, level) {
		this.store.log(line, level)
	}

	error(error, context) {
		this.store.error(error, context)
	}

	fail(callback) {
		return error => {

			// Report error
			this.error(error)

			// Handle error, if provided a means
			if (callback) {
				callback(error)

			// Otherwise, throw error
			} else {
				throw error
			}
		}
	}




// PATHS

	subFolder(type) {
		switch (type) {

			// Create a data folder
			case "data": return DataFolder(Path)

			// Create a media folder
			case "media": return MediaFolder(Path)

			// Create a typeless folder
			default: return Folder(Path)

		}
	}

	setPath(path) {

		// Set path
		this.path = `${this.parent.path || ""}${path || ""}`

		// Return path
		return this

	}

	addChild(config, id) {

		// Make path
		let SubFolder = this.subFolder(config.type)
		let child = new SubFolder(this, config)

		// Save path
		this.children = this.children.set(id, child)

		// Return new child
		return child

	}


	removeChild(id) {

		// Remove path
		this.children = this.children.delete(id)

	}


	in(key, ...rest) {
		if (rest.length === 0) {
			return this.children.get(key)
		} else {
			return this.children.get(key).in(...rest)
		}
	}


}

