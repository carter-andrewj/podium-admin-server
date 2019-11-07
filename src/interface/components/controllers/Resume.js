import React from 'react';
import ImmutableComponent from '../../utils/component';

import { fromJS } from 'immutable';



class Resume extends ImmutableComponent {

	constructor() {

		// Set default state
		super({
			nations: []
		})

		// Methods
		this.listNations = this.listNations.bind(this)
		this.resume = this.resume.bind(this)

	}

	componentDidMount() {
		this.listNations()
	}

	listNations() {
		this.props
			.api("/nations")
			.then(nations => this.updateState(
				state => state.set("nations", nations)
			))
			.catch(console.error)
	}


	resume(constitution) {
		this.props
			.api("/launchNation", { constitution })
			.then(() => this.props.setMode("overview"))
			.catch(console.error)
	}



	render() {
		return <div
			className="content"
			style={{
				minHeight: this.props.box.height,
				maxHeight: this.props.box.height,
			}}>

			<div className="section">

				<div className="heading">
					<p className="title">
						Select a Nation to Resume
					</p>
				</div>

				{fromJS(this.getState("nations"))
					.filter(n => n.get("creator") ===
						this.props.status.getIn(["admin", "name"]))
					.sort((a, b) => a.get("last") < b.get("last") ? 1 : -1)
					.map((nation, i) => <div 
						key={`nation-${i}`}
						onClick={() => this.resume(nation.toJS())}
						className="item selectable">
						<p className="option">
							{nation.get("name")}
						</p>
						<p className="description">
							{new Date(nation.get("last"))
								.toString()
								.substring(0, 24)
							}
						</p>
					</div>)
					.toList()
				}

			</div>

		</div>
		
	}

}

export default Resume;