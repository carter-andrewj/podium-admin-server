import s3 from 'aws-sdk/clients/s3';

import { Map } from 'immutable';

import Bucket from './bucket';

import Logger from '../utils/logger';






export default class Store {

	constructor(podium) {

		// Refs
		this.podium = podium

		// State
		this.store = this
		this.config = undefined
		this.buckets = Map()
		this.logger = undefined

		// Methods
		this.log = this.log.bind(this)
		this.error = this.error.bind(this)

		this.connect = this.connect.bind(this)
		this.disconnect = this.disconnect.bind(this)

		this.addBucket = this.addBucket.bind(this)
		this.removeBucket = this.removeBucket.bind(this)
		this.in = this.in.bind(this)

	}



// LOGGING

	log(line, level) {
		this.logger.out(line, level)
	}

	error(error, context) {
		this.logger.error(error, context)
	}




// CONNECT

	async connect(config) {

		// Store config
		this.config = config

		// Connect to S3
		this.root = new s3({
			apiVersion: this.config.apiVersion,
			region: this.config.region,
			accessKeyId: process.env.AWS_ACCESS_KEY,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
		})

		// Construct file structure
		Map(this.config.buckets).map(this.addBucket)

		// Logging
		const { to, path } = this.podium.config.logger
		this.logger = new Logger("Store").start(to, path)

		// Reset long and resolve
		await this.logger.clear().catch(this.error)

		// Start log
		this.log(`Connected Store`)

		// Return store
		return this

	}


	async disconnect() {

		// Clear variables
		this.config = undefined
		this.root = undefined
		this.buckets = Map()

		// end log
		this.log(`Disconnected ${this.name}Store`)

		// Stop logger
		this.logger.stop()
		this.logger = undefined

		// Resolve
		return this

	}




// FILE STRUCTURE
	
	addBucket(config, id) {

		// Create bucket
		let bucket = new Bucket(this, config)

		// Store bucket
		this.buckets = this.buckets.set(id, bucket)

		// Return store
		return this

	}

	in(key, ...rest) {
		if (rest.length === 0) {
			return this.buckets.get(key)
		} else {
			return this.buckets.get(key).in(...rest)
		}
	}

	removeBucket(id) {

		// Remove bucket
		this.buckets = this.buckets.delete(id)

		// Return store
		return this

	}





}