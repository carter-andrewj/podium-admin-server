import React from 'react';
import { render } from 'react-dom';
import Root from './components/Root';

import { fromJS } from 'immutable';

import './styles/styles.scss';

import * as config from '../../config.json'

render(
	<Root config={config.default.admin} />,
	document.getElementById('root')
)