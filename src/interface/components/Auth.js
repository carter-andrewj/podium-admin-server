import React from 'react';
import ImmutableComponent from '../utils/component';



class Auth extends ImmutableComponent {

	constructor() {

		// Set default state
		super({
			validating: false,
			valid: undefined,
		})

		this.input = null

		this.detectSubmit = this.detectSubmit.bind(this)
		this.validateKey = this.validateKey.bind(this)
		this.invalid = this.invalid.bind(this)

	}

	componentDidMount() {
		this.input.focus()
	}

	detectSubmit(event) {
		if (event.key === "Enter") {
			event.preventDefault() 
			this.updateState(
				state => state
					.set("validating", true)
					.set("valid", undefined),
				this.validateKey
			)
		} else {
			this.updateState(
				state => state.set("valid", undefined),
			)
		}
	}

	validateKey() {
		this.input.blur()
		const key = this.input.value
		this.props.setKey(key)
			.then(result => { if (!result) this.invalid() })
			.catch(console.error)
	}

	invalid() {
		this.updateState(
			state => state
				.set("validating", false)
				.set("valid", false),
			() => this.input.focus()
		)
	}


	render() {

		const validating = this.getState("validating")
		const invalid = this.getState("valid") === false

		return <div id="auth">

			<div className="header">
				<p className="title">
					Enter Admin Key
				</p>
			</div>

			<div className="body">
				<div className="row">
					<input
						ref={ref => this.input = ref}
						type="password"
						onFocus={validating ? this.input.blur : null}
						className={`input ${validating ? "inactive" : ""}`}
						onKeyDown={this.detectSubmit}
					/>
				</div>
				<div className="error">
					{invalid ?
						<p className="message">
							invalid admin key
						</p>
						: null
					}
				</div>
			</div>

		</div>
	}

}

export default Auth;