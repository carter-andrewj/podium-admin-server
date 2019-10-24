import React from 'react';
import ImmutableComponent from '../utils/component';

import { fromJS } from 'immutable';

import Status from './controllers/Status';
import Launcher from './controllers/Launcher';
import Resumer from './controllers/Resumer';



const navigation = fromJS({
	"overview": {
		component: Status,
		title: "Overview"
	},
	"launcher": {
		component: Launcher,
		title: "New Nation"
	},
	"resumer": {
		component: Resumer,
		title: "Resume Nation"
	}
})


class Controls extends ImmutableComponent {

	constructor() {

		// Set default state
		super({
			mode: navigation.get("overview"),
			box: {}
		})

		// Refs
		this.card = null
		this.header = null

		// Methods
		this.setMode = this.setMode.bind(this)

	}


	componentDidMount() {
		let headerMargin = window
			.getComputedStyle(this.header)
			.getPropertyValue("margin-bottom")
		let cardPadding = window
			.getComputedStyle(this.card)
			.getPropertyValue("padding")
		this.updateState(state => state.set("box", {
			height: this.card.clientHeight -
				this.header.clientHeight -
				parseInt(headerMargin) -
				(2 * parseInt(cardPadding)),
			width: this.card.clientWidth -
				(2 * parseInt(cardPadding)),
		}))
	}


	setMode(mode) {
		this.updateState(state => state
			.set("mode", navigation.get(mode))
		)
	}


	render() {

		const mode = this.getState("mode")
		let Body = mode.get("component")

		return <div
			ref={ref => this.card = ref}
			id="controls"
			className="box left">

			<div
				ref={ref => this.header = ref}
				className="header">
				<p className="title">
					{mode.get("title")}
				</p>
				{mode.get("title") !== "Overview" ?
					<div
						className="back"
						onClick={() => this.setMode("overview")}>
						{"< back"}
					</div>
					: null
				}
			</div>

			<Body
				box={this.getState("box")}
				config={this.props.config}
				status={this.props.status}
				api={this.props.api}
				setMode={this.setMode}
			/>

		</div>
		
	}

}

export default Controls;