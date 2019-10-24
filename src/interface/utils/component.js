import { Component } from 'react';

import { Map, fromJS } from 'immutable'


export default class ImmutableComponent extends Component {

	constructor(state) {
		super()
		this.state = {
			state: fromJS(state),
		}
		this.getState = this.getState.bind(this)
		this.updateState = this.updateState.bind(this)
	}

	getState(...args) {
		if (args.length === 1) {
			return this.state.state.get(args[0])
		} else {
			return this.state.state.getIn([...args])
		}
	}

	updateState(fn, callback) {
		this.setState(
			last => {
				let next = fn(last.state)
				return { state: next }
			},
			callback
		)
	}

}