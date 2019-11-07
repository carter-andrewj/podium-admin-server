import React from 'react';
import ImmutableComponent from '../../utils/component';

import { fromJS } from 'immutable';




export default class Populate extends ImmutableComponent {

	constructor() {

		// Set default state
		super({
			mode: "current"
		})

		// Methods
		this.content = this.content.bind(this)

	}


	content() {
		switch (this.getState("mode")) {

			// Display current population
			case "current": return <div class="section">

				<div className="heading">
					<p className="title">
						Current Actors
					</p>
				</div>

			</div>


			// Display available actor templates
			case "templates": return <div class="section">

				<div className="heading">
					<p className="title">
						Select a New Actor
					</p>
				</div>

			</div>


			// Define a new actor template
			case "new": return <div class="section">

				<div className="heading">
					<p className="title">
						Define a New Actor
					</p>
				</div>

			</div>

		}
	}


	render() {
		return <div
			className="content"
			style={{
				minHeight: this.props.box.height,
				maxHeight: this.props.box.height,
			}}>
			{this.content()}
		</div>
	}

}