import Folder from './folder';



export default Child => class MediaFolder extends Folder(Child) {

	constructor(...args) {
		super(...args)
	}

	ingress(item) {
		return Buffer.from(item, "base64")
	}

	egress(item) {
		return item
	}

	extension() {
		throw new Error("STORAGE ERROR: Calls to Media Routes must always specify a file type.")
	}

	contentType(extension) {
		return `image/${extension}`
	}


}