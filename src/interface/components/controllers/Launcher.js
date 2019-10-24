import { v4 as uuid } from 'uuid';

import React from 'react';
import ImmutableComponent from '../../utils/component';

import { fromJS, Map, List, OrderedMap } from 'immutable';



class Launcher extends ImmutableComponent {

	constructor() {

		// Set default state
		super({
			templates: {},
			selected: null,
			constitution: null,
			focus: undefined
		})

		// References
		this.inputs = Map()

		// Methods
		this.listTemplates = this.listTemplates.bind(this)
		this.select = this.select.bind(this)

		this.makeEditor = this.makeEditor.bind(this)
		this.inputFor = this.inputFor.bind(this)
		this.addItem = this.addItem.bind(this)
		this.edit = this.edit.bind(this)

		this.launch = this.launch.bind(this)

	}

	componentDidMount() {
		this.listTemplates()
	}



// TEMPLATES

	listTemplates() {
		this.props
			.api("/templates")
			.then(templates => this.updateState(
				state => state.set("templates", templates)
			))
			.catch(console.error)
	}


	select(template) {

		// Prepare template
		let constitution = OrderedMap(fromJS(template)).delete("template")

		// Generate a random tag, if non provided
		if (constitution.getIn(["designation", "tags"]).size === 0) {
			const tag = uuid().replace(/\-/g, "").substring(16)
			constitution = constitution
				.setIn(["designation", "tags"], List([tag]))
		}

		// Set state
		this.updateState(state => state
			.set("selected", constitution)
			.set("constitution", constitution)
		)

	}




// EDIT VALUES

	makeEditor(item, keys = List()) {
		return fromJS(item)
			.delete("template")
			.map((v, k) => {

				// Make element key
				const allkeys = keys.push(k)
				const keyname = allkeys.join(".")
				const section = (keys.size === 0) ?
					"section" :
					"section subsection"

				// Handle maps
				if (v instanceof OrderedMap || v instanceof Map) {
					return <div
						key={keyname}
						className={section}>
						{isNaN(k) ?
							<div className="item subtitle">
								<p>{k}</p>
							</div>
							: null
						}
						{this.makeEditor(OrderedMap(v), allkeys)}
						<div className="item">
							<div
								onClick={() => this.addItem(allkeys, "map")}
								className="button">
								<p>+ add item</p>
							</div>
						</div>
						<div className="footer" />
					</div>

				// Handle lists
				} else if (v instanceof List) {
					return <div
						key={keyname}
						className={section}>
						{isNaN(k) ?
							<div className="item subtitle">
								<p>{k}</p>
							</div>
							: null
						}
						{this.makeEditor(v, allkeys)}
						<div className="item">
							<div
								onClick={() => this.addItem(allkeys, "list")}
								className="button">
								<p>+ add item</p>
							</div>
						</div>
						<div className="footer" />
					</div>

				// Handle list values
				} else if (!isNaN(k)) {
					return <div
						key={keyname}
						className="item">
						<p className="bullet" />
						{this.inputFor(allkeys)}
					</div>

				// Handle map values
				} else {
					return <div
						key={keyname}
						className="item">
						<p className="inputkey">{k}</p>
						{this.inputFor(allkeys)}
					</div>
				}
			})
			.toList()
			.flatten()
	}


	setFocus(name) {
		this.updateState(state => state.set("focus", name))
	}


	inputFor(keys) {

		// Name input
		const name = `${keys.join(".")}-input`

		// Get values
		let tempValue = this.getState("selected", ...keys)
		let outValue = this.getState("constitution", ...keys)

		// See if value has been changed
		const changed = tempValue !== outValue
		const focussed = this.getState("focus") === name

		return <input
			ref={ref => this.inputs = this.inputs.setIn(keys, ref)}
			className={`value input ${!changed && !focussed ? "placeholder" : null}`}
			value={outValue}
			onFocus={() => this.setFocus(name)}
			onBlur={() => this.setFocus(undefined)}
			onChange={event => this.edit(keys, event)}
		/>

	}


	addItem(keys, type) {

		// Handle maps
		if (type === "map") {

			// Construct keyname
			let recurName = (k, i) => {
				const keyname = `newKey${i}`
				const current = this.getState("selected", ...keys, keyname)
				if (current) {
					return recur(k, i + 1)
				} else {
					return keyname
				}
			}
			const key = recurName(keys, 0)

			// Add new value
			this.updateState(
				state => state
					.setIn(["selected", ...keys, key], "")
					.setIn(["constitution", ...keys, key], ""),
				() => this.inputs.getIn(keys).focus
			)

		// Handle lists
		} else if (type === "list") {
			this.updateState(
				state => state
					.updateIn(["selected", ...keys], l => l.push(""))
					.updateIn(["constitution", ...keys], l => l.push("")),
				() => this.inputs.getIn(keys).focus
			)
		}

	}


	edit(keys, event) {

		// Get new value
		const value = this.inputs.getIn(keys.toJS()).value

		// Replace current value
		this.updateState(state => state
			.setIn(["constitution", ...keys.toJS()], value)
		)

	}


	validate(keys) {

		// Get current value for this set of keys
		const current = this.getState("constitution", ...keys)

		// Validate
		let result
		const keyname = keys.join(".")
		switch (keyname) {

			case "designation.tags":
				if (tags.length > 0) {
					result = true
				} else {
					result = "must specify at least one tag"
				}

			// All other keys are valid by default
			default: result = true

		}

		// Set/clear errors
		this.updateState(state => state
			.setIn(["errors", keys], result)
		)

	}



// LAUNCH

	launch() {

		// Get current constitution
		const constitution = this.getState("constitution")

		// Ensure constitution is valid
		if (constitution.getIn(["designation", "tags"]).size > 0) {
			this.updateState(

				// Set launching flag
				state => state.set("launching", true),

				// Launch nation
				() => this.props
					.api("/launchNation", { constitution: constitution.toJS() })
					.then(() => this.props.setMode("overview"))
					.catch(console.error)

			)
		}

	}




// RENDER

	render() {

		const selected = this.getState("selected")

		return <div
			className="content"
			style={{
				minHeight: this.props.box.height,
				maxHeight: this.props.box.height,
			}}>

			{selected ?

				<div className="section">

					<div className="heading">
						<p className="title">
							{selected.getIn(["template", "designation", "name"])}
						</p>
						<div className="controls">
							<div
								className="button control"
								onClick={this.launch}>
								<p>launch</p>
							</div>
						</div>
					</div>

					{this.makeEditor(selected)}

				</div>

				:

				<div className="section">

					<div className="heading">
						<p className="title">
							Select a Template Constitution
						</p>
					</div>

					{fromJS(this.getState("templates"))
						.map((temp, i) => <div 
							key={`template-${i}`}
							onClick={() => this.select(temp.toJS())}
							className="item selectable">
							<p className="option">
								{temp.getIn(["template", "name"])}
							</p>
							<p className="description">
								{temp.getIn(["template", "description"])}
							</p>
						</div>)
						.toList()
					}

				</div>

			}

		</div>
		
	}

}

export default Launcher;