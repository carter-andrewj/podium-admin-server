


export default Child => class Folder extends Child {

	constructor(...args) {

		// Call parent constructor
		super(...args)

		// Methods
		this.onError = this.onError.bind(this)
		this.ingress = this.ingress.bind(this)
		this.egress = this.egress.bind(this)
		this.contentType = this.contentType.bind(this)

		this.list = this.list.bind(this)
		this.read = this.read.bind(this)
		this.write = this.write.bind(this)
		this.erase = this.erase.bind(this)

	}





// OVERRIDES

	onError(error) { throw error }

	ingress(item) { return item }

	egress(item) { return item }

	contentType() { return "text" }

	get extension() { return "txt" }




// STORE

	async list() {
		return await this.bucket
			.list(this.path)
			.catch(this.fail(this.onError))
	}

	async read(file, extension = this.extension) {
		return await this.bucket
			.read(this.path, file, extension)
			.then(this.egress)
			.catch(this.fail(this.onError))
	}

	async write(item, file, extension = this.extension) {
		return await this.bucket
			.write(
				this.ingress(item),
				this.path, file, extension,
				this.contentType(extension)
			)
			.catch(this.fail(this.onError))
	}

	async erase(file, extension = this.extension) {
		return await this.bucket
			.erase(this.path, file, extension)
			.catch(this.fail(this.onError))
	}



}