import s3 from 'aws-sdk/clients/s3';

import Logger from '../utils/logger';




export default class Store {

	constructor(podium) {

		// Get config
		this.podium = podium

		// State
		this.store = null
		this.logger = undefined

		// Methods
		this.log = this.log.bind(this)
		this.error = this.error.bind(this)

		this.connect = this.connect.bind(this)
		this.disconnect = this.disconnect.bind(this)

		this.list = this.list.bind(this)
		this.listTemplates = this.listTemplates.bind(this)
		this.listNations = this.listNations.bind(this)
		this.listActors = this.listPopulation.bind(this)

		this.read = this.read.bind(this)
		this.readJSON = this.readJSON.bind(this)
		this.readTemplate = this.readTemplate.bind(this)
		this.readNation = this.readNation.bind(this)
		this.readActor = this.readFromPopulation.bind(this)

		this.write = this.write.bind(this)
		this.writeJSON = this.writeJSON.bind(this)
		this.writeNation = this.writeNation.bind(this)
		this.writeMedia = this.writeMedia.bind(this)
		this.writeActor = this.writeActor.bind(this)

		this.erase = this.erase.bind(this)
		this.eraseJSON = this.eraseJSON.bind(this)
		this.eraseNation = this.eraseNation.bind(this)
		this.eraseActor = this.eraseActor.bind(this)

	}



// LOGGING

	log(line, level) {
		this.logger.log(line, level)
	}

	error(error, context) {
		this.logger.error(error, context)
	}




// CONNECT

	connect(config) {
		return new Promise((resolve, reject) => {

			// Store config
			this.config = config

			// Connect to S3
			this.store = new s3({
				apiVersion: this.config.apiVersion,
				region: this.config.region,
				accessKeyId: process.env.AWS_ACCESS_KEY,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
			})

			// Logging
			const { to, path } = this.podium.config.logger
			this.logger = new Logger("Store").start(to, path)

			// Reset long and resolve
			this.logger
				.clear()
				.then(resolve)
				.catch(reject)

		})
	}


	disconnect() {
		return new Promise((resolve, reject) => {

			// Clear variables
			this.config = undefined
			this.store = undefined

			// Stop logger
			this.logger.stop()
			this.logger = undefined

			// Resolve
			resolve(this)

		})
	}




// LIST ITEMS

	list(path) {
		return new Promise((resolve, reject) => {

			// Get bucket from config
			const bucket = this.config.buckets.files

			// Log action
			this.log(`Listing S3://${bucket}/${path}`, 1)

			// List files
			this.store
				.listObjects({
					Bucket: bucket,
					Prefix: path
				})
				.promise()
				.then(result => resolve(
					result.Contents.map(file => file.Key)
				))
				.catch(reject)

		})
	}


	listTemplates() {
		return this.list(this.config.paths.templates)
	}

	listNations() {
		return this.list(this.config.paths.nations)
	}

	listActors(nation) {
		return this.list(`${this.config.paths.nations}${nation}`)
	}






// READ ITEMS

	read(key, filetype, allowMissing = false) {
		return new Promise((resolve, reject) => {

			// Get bucket from config
			const bucket = this.config.buckets.files

			// Log action
			this.log(`Reading S3://${bucket}/${key}.${filetype}`, 1)

			// Read file
			this.store
				.getObject({
					Bucket: bucket,
					Key: `${file}.${filetype}`
				})
				.promise()
				.then(item => resolve(item.Body))
				.catch(error => {
					if (error.code = "NoSuchKey" && allowMissing) {
						resolve(undefined)
					} else {
						reject(error)
					}
				})

		})
	}

	readJSON(key) {
		return this.read(key, "json", true)
			.then(result => result ? 
				JSON.parse(result.toString('utf-8'))
				: undefined
			)
	}

	readTemplate(template) {
		return this.readJSON(`${this.config.paths.templates}${template}`)
	}

	readNation(id) {
		return this.readJSON(`${this.config.paths.nations}${id}/nation`)
	}

	readActor(obj, key) {
		const { nations, actors } = this.config.paths
		return this.readJSON(obj, `${nations}${actors}${key}`)
	}





// WRITE ITEMS

	write(obj, key, filetype) {
		return new Promise((resolve, reject) => {

			// Get bucket from config
			const bucket = this.config.buckets.files

			// Log action
			this.log(`Writing S3://${bucket}/${key}.${filetype}`, 1)

			// Write file
			this.store
				.putObject({
					Bucket: bucket,
					Key: `${key}.${filetype}`,
					Body: obj,
					ContentType: filetype
				})
				.promise()
				.then(() => resolve(obj))
				.catch(reject)

		})
	}


	writeJSON(obj, key) {
		return this.write(JSON.stringify(obj), key, "json")
	}


	writeNation(obj, key) {
		return this.writeJSON(obj, `${this.config.paths.nations}${key}`)
	}


	writeActor(obj, key) {
		const { nations, actors } = this.config.paths
		return this.writeJSON(obj, `${nations}${actors}${key}`)
	}


	writeMedia(media, key, filetype="png") {
		return new Promise((resolve, reject) => {

			// Get bucket from config
			const bucket = this.config.buckets.media

			// Log action
			this.log(`Writing ${bucket}/${key}.${filetype}`, 1)
			
			// Write media
			this.store
				.putObject({
					Bucket: bucket,
					Key: `${key}.${filetype}`,
					Body: Buffer.from(media, "base64"),
					ContentType: `image/${filetype}`
				})
				.promise()
				.then(() => resolve(key))
				.catch(reject)

		})
	}




// DELETE

	erase(key, filetype, allowMissing = false) {
		return new Promise((resolve, reject) => {

			// Get bucket from config
			const bucket = this.config.buckets.files

			// Log action
			this.log(`Erasing ${bucket}/${key}.${filetype}`, 1)

			// Delete file
			this.store
				.deleteObject({
					Bucket: bucket,
					Key: `${key}.${filetype}`
				})
				.promise()
				.then(() => resolve(true))
				.catch(error => {
					if (error.code = "NoSuchKey" && allowMissing) {
						resolve(undefined)
					} else {
						reject(error)
					}
				})

		})
	}


	eraseJSON(key) {
		return this.erase(key, "json", true)
	}


	eraseNation(key) {
		return this.eraseJSON(`${this.config.paths.nations}${key}`)
	}


	eraseActor(key) {
		const { nations, actors } = this.config.paths
		return this.eraseJSON(`${nations}${actors}${key}`)
	}



}