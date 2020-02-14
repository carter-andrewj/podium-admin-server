





export default class Nation {

	constructor() {

	}


	entity(type) {
		switch (type) {
			case "citizen": return new Citizen(this)
			case "post": return new Post(this)
			case "domain": return new Domain(this)
			default: this.throw()
		}
	}

}