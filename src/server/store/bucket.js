import { Map } from 'immutable';

import Path from './path';




export default class Bucket extends Path {

	constructor(parent, config) {

		// Call parent constructor
		super(parent, config)

		// State
		this.name = config.name

		// Methods
		this.list = this.list.bind(this)
		this.read = this.read.bind(this)
		this.write = this.write.bind(this)
		this.erase = this.erase.bind(this)

	}


	get bucket() {
		return this
	}




// ACTIONS

	list(path) {
		return new Promise((resolve, reject) => {

			// Log action
			this.log(`Listing S3://${this.name}/${path}`, 1)

			// List files
			this.store.root
				.listObjects({
					Bucket: this.name,
					Prefix: path
				})
				.promise()
				.then(result => resolve(result.Contents
					.filter(entry => entry.Size > 0)
					.map(file => file.Key.replace(new RegExp(path), ""))
				))
				.catch(this.fail(reject))

		})
	}



	read(path, file, extension) {
		return new Promise((resolve, reject) => {

			// Make file path
			const key = `${path}${file}.${extension}`

			// Log action
			this.log(`Reading S3://${this.name}/${key}`, 1)

			// Read file
			this.store.root
				.getObject({
					Bucket: this.name,
					Key: key
				})
				.promise()
				.then(item => resolve(item.Body))
				.catch(this.fail(reject))

		})
	}



	write(item, path, file, extension, contentType) {
		return new Promise((resolve, reject) => {

			// Make file path
			const key = `${path}${file}.${extension}`

			// Log action
			this.log(`Writing S3://${this.name}/${key}`, 1)

			// Write file
			this.store.root
				.putObject({
					Bucket: this.name,
					Key: key,
					Body: item,
					ContentType: contentType
				})
				.promise()
				.then(() => resolve(true))
				.catch(this.fail(reject))

		})
	}



	erase(path, file, extension) {
		return new Promise((resolve, reject) => {

			// Make file path
			const key = `${path}${file}.${extension}`

			// Log action
			this.log(`Erasing S3://${this.name}/${key}`, 1)

			// Delete file
			this.store.root
				.deleteObject({
					Bucket: this.name,
					Key: key
				})
				.promise()
				.then(() => resolve(true))
				.catch(this.fail(reject))

		})
	}


}