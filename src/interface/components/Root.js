import React from 'react';
import ImmutableComponent from '../utils/component';

import { fromJS } from 'immutable';

import Main from './Main';
import Auth from './Auth';



class Root extends ImmutableComponent {

	constructor() {

		// Set default state
		super({
			key: null,
			status: { live: false },
			live: true
		})

		this.ticker = null

		// Methods
		this.getStatus = this.getStatus.bind(this)
		this.api = this.api.bind(this)
		this.setKey = this.setKey.bind(this)

	}


	componentDidMount() {

		// Unpack config
		const port = this.props.config.port
		const path = this.props.config.path

		// Store in state
		this.updateState(state => state
			.set("api", `http://localhost:${port}${path}`),
			this.tick
		)

	}



	tick() {
		clearInterval(this.ticker)
		this.ticker = setInterval(this.getStatus, 1000)
	}


	getStatus() {
		if (this.getState("key")) {
			this.api("/")
				.then(status => this.updateState(
					state => state.set("status", fromJS(status))
				))
				.catch(console.error)
		}
	}




// API

	api(route, params = {}) {
		return new Promise((resolve, reject) => {

			// Build payload
			let payload = {
				method: "POST",
				headers: {
					"Accept": "application/json",
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					key: this.getState("key"),
					...params,
				})
			}

			// Send to API
			fetch(`${this.getState("api")}${route}`, payload)
				.then(response => {

					// Handle success
					if (response.ok) {
						
						// Unpack json
						response
							.json()
							.then(result => resolve(result.result))

					// Handle disconnect
					} else if (response.statusText === "disconnect") {

						// Disconnect
						this.setDisconnected()

						// Reject
						reject(new Error("SERVER OFFLINE"))
						
					// Handle errors
					} else {

						// Reject with error
						reject(new Error(`SERVER ERROR: ${response.statusText}`))

					}

				})
				.catch(error => {
					if (error.message === "Failed to fetch") {
						this.setDisconnected()
						reject(new Error("SERVER OFFLINE"))
					} else {
						reject(error)
					}
				})

		})
	}


	setDisconnected() {

		// Stop tick
		clearInterval(this.ticker)

		// Switch to offline page
		this.updateState(state => state.set("live", false))

	}


	setKey(key) {
		return new Promise((resolve, reject) => {
			this.api("/authenticate", { key })
				.then(() => this.updateState(
					state => state.set("key", key),
					resolve(true)
				))
				.catch(() => resolve(false))
		})
	}




// RENDER

	render() {

		const status = this.getState("status")

		return <div id="page">

			<div className="banner">
				<div className="logo">
					<img src="public/logo.png" />
				</div>
				<p className="title">
					Admin Console
				</p>
				<div className="logo" />
			</div>

			<div className="spacer">
				{!this.getState("live") ?
					<div className="offline">
						SERVER OFFLINE
					</div>
				: this.getState("key") ?
					<Main
						status={status}
						config={this.props.config}
						api={this.api}
					/>
				:
					<Auth
						status={status}
						api={this.api}
						setKey={this.setKey}
					/>
				}
			</div>
		</div>
	}



	componentWillUnmount() {
		clearInterval(this.ticker)
	}

}

export default Root;