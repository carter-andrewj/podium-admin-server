import React from 'react';
import ImmutableComponent from '../utils/component';

import Controls from './Controls';
import Logs from './Logs';




class Main extends ImmutableComponent {

	render() {
		return <div className="main">

			<div className="column">
				<Controls
					config={this.props.config}
					status={this.props.status}
					api={this.props.api}
				/>
			</div>

			<div className="column">
				<Logs
					config={this.props.config}
					status={this.props.status}
					api={this.props.api}
				/>
			</div>

		</div>
	}

}

export default Main;