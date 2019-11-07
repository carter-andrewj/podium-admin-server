import Folder from './folder';




export default Child => class DataFolder extends Folder(Child) {

	constructor(...args) {
		super(...args)
	}


	onError(error) {
		if (error.code = "NoSuchKey") {
			return undefined
		} else {
			throw error
		}
	}

	ingress(item) {
		return JSON.stringify(item)
	}

	egress(item) {
		return item ?
			JSON.parse(item.toString("utf-8"))
			: item
	}

	get extension() {
		return "json"
	}

	contentType() {
		return "json"
	}


}