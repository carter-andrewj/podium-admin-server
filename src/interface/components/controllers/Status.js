import React from 'react';
import ImmutableComponent from '../../utils/component';

import { fromJS } from 'immutable';

import { timeForm } from '../utils';




class Status extends ImmutableComponent {

	constructor() {
		super()
		this.stopNation = this.stopNation.bind(this)
	}

	stopNation() {
		this.props.api("/stopNation")
	}


	render() {

		const status = this.props.status.toJS()
		const uptime = new Date().getTime() - status.since

		let nationTime;
		if (status.nation) {
			nationTime = new Date().getTime() - status.nation.created
		}

		return <div id="status" className="content">

			<div className="section">

				<div className="heading">
					<p className="title">Status</p>
				</div>

				<div className="item">
					<p className="key">Live</p>
					<p className={`value boolean ${status.live ? "true" : "false"}`}>
						{status.live ? "true" : "false"}
					</p>
				</div>

				<div className="item">
					<p className="key">Launched</p>
					<p className="value">
						{new Date(status.since)
							.toString()
							.substring(0, 24)
						}
					</p>
				</div>

				<div className="item">
					<p className="key">Lifetime</p>
					<p className="value">
						{timeForm(uptime)}
					</p>
				</div>

			</div>


			<div className="section">

				<div className="heading">

					<p className="title">Nation</p>

					<div className="controls">

						{!status.nation ?
							<div
								className="button control"
								onClick={() => this.props.setMode("launcher")}>
								<p>new</p>
							</div>
							: null
						}

						{!status.nation ?
							<div
								className="button control"
								onClick={() => this.props.setMode("resumer")}>
								<p>resume</p>
							</div>
							: null
						}

						{status.nation && status.nation.live ?
							<div
								className="button control danger"
								onClick={this.stopNation}>
								<p>stop</p>
							</div>
							: null
						}

					</div>

				</div>

				<div className="item">
					<p className="key">Live</p>
					<p className={`value boolean ${(status.nation && status.nation.live) ? "true" : "false"}`}>
						{!status.nation ? "false" :
							status.nation.live ? "true" : "false"}
					</p>
				</div>

				{status.nation ?
					<div className="container">

						<div className="item">
							<p className="key">Name</p>
							<p className={`value`}>
								{status.nation.name}
							</p>
						</div>

						<div className="item">
							<p className="key">Connected</p>
							<p className={`value boolean ${status.nation.connected ? "true" : "false"}`}>
								{status.nation.connected ? "true" : "false"}
							</p>
						</div>

						<div className="item">
							<p className="key">Launched</p>
							<p className={`value boolean ${status.nation.launched ? "true" : "false"}`}>
								{status.nation.launched ? "true" : "false"}
							</p>
						</div>

						<div className="item">
							<p className="key">Created</p>
							<p className="value">
								{status.nation.creating ?
									"now" :
									status.nation.created ?
										new Date(status.nation.created)
											.toString()
											.substring(0, 24)
										: "-"
								}
							</p>
						</div>

						<div className="item">
							<p className="key">Lifetime</p>
							<p className="value">
								{!status.nation.created ?
									"-" :
									timeForm(nationTime)
								}
							</p>
						</div>

					</div>
					:
					null
				}

			</div>

		</div>
		
	}


}

export default Status;