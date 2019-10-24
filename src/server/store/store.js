import s3 from 'aws-sdk/clients/s3';



export default class Store {

	constructor(podium) {

		// Get config
		this.podium = podium

		// State
		this.store = null

		// Methods
		this.log = this.log.bind(this)
		this.error = this.error.bind(this)

		this.connect = this.connect.bind(this)
		this.disconnect = this.disconnect.bind(this)

		this.list = this.list.bind(this)
		this.listTemplates = this.listTemplates.bind(this)
		this.listNations = this.listNations.bind(this)

		this.read = this.read.bind(this)
		this.readJSON = this.readJSON.bind(this)
		this.readTemplate = this.readTemplate.bind(this)
		this.readNation = this.readNation.bind(this)

		this.write = this.write.bind(this)
		this.writeNation = this.writeNation.bind(this)
		this.writeMedia = this.writeMedia.bind(this)

	}



// LOGGING

	log(line, level) {
		this.podium.log(`STORE: ${line}`, level)
	}

	error(error, context) {
		this.podium.error(error, `STORE: ${context}`)
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

			// Resolve
			resolve(this)

		})
	}


	disconnect() {
		return new Promise((resolve, reject) => {

			// Clear variables
			this.config = undefined
			this.store = undefined

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






// READ ITEMS

	read(file, filetype=".json") {
		return new Promise((resolve, reject) => {

			// Get bucket from config
			const bucket = this.config.buckets.files
			const key = `${file}.${filetype}`

			// Log action
			this.log(`Reading S3://${bucket}/${key}`, 1)

			// Read file
			this.store
				.getObject({
					Bucket: bucket,
					Key: key
				})
				.promise()
				.then(item => resolve(item.Body))
				.catch(error => {
					if (error.code = "NoSuchKey") {
						reject(new Error(`STORAGE ERROR: '${key}' not found`))
					} else {
						reject(error)
					}
				})

		})
	}

	readJSON(key) {
		return this.read(key, "json")
			.then(result => JSON.parse(result.toString('utf-8')))
	}

	readTemplate(template) {
		return this.readJSON(`${this.config.paths.templates}${template}`)
	}

	readNation(id) {
		return this.readJSON(`${this.config.paths.nations}${id}/nation`)
	}





// WRITE ITEMS

	write(obj, key, filetype=".json") {
		return new Promise((resolve, reject) => {

			// Get bucket from config
			const bucket = this.config.buckets.files

			// Log action
			this.log(`Writing S3://${bucket}/${key}${filetype}`, 1)

			// Write file
			this.store
				.putObject({
					Bucket: bucket,
					Key: `${key}${filetype}`,
					Body: JSON.stringify(obj),
					ContentType: "json"
				})
				.promise()
				.then(() => resolve(obj))
				.catch(reject)

		})
	}


	writeNation(obj, key) {
		return this.write(obj, `${this.config.paths.nations}${key}`)
	}


	writeMedia(media, key, type="png") {
		return new Promise((resolve, reject) => {

			// Get bucket from config
			const bucket = this.config.buckets.media

			// Log action
			this.log(`Writing ${bucket}/${key}.${type}`, 1)
			
			// Write media
			this.store
				.putObject({
					Bucket: bucket,
					Key: `${key}.${type}`,
					Body: Buffer.from(media, "base64"),
					ContentType: `image/${type}`
				})
				.promise()
				.then(() => resolve(key))
				.catch(reject)

		})
	}

}