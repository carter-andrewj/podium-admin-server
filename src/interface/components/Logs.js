import React from 'react';
import ImmutableComponent from '../utils/component';

import { List } from 'immutable';




const regexJSON = /(")?{.*}(")?/g
const regexError = /(\[ERROR\])/g



class Logs extends ImmutableComponent {

	constructor() {

		// Set default state
		super({
			files: [],
			current: "Master.log",
			history: List(),
			output: undefined,
			box: {
				height: "unset",
				width: "unset"
			}
		})

		// Refs
		this.card = null
		this.header = null

		// Timers
		this.refresh = null

		// Methods
		this.listLogs = this.listLogs.bind(this)
		this.setLog = this.setLog.bind(this)
		this.loadLog = this.loadLog.bind(this)
		this.wrap = this.wrap.bind(this)

	}


	componentDidMount() {

		this.listLogs()

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


	listLogs() {
		const nation = this.props.status.getIn(["nation", "name"]) + "|"
		this.props.api("/logs")
			.then(result => {

				// Exclude Error logs and logs from other nations
				let logs = result.filter(l =>
					!l.includes("_Error") &&
					(l.includes("Master") || l.includes(nation))
				)

				// Store logs in state
				this.updateState(
					state => state.set("files", logs),
					this.loadLog
				)

			})
			.catch(console.error)
	}


	setLog(filename) {
		this.updateState(
			state => state.set("current", filename),
			this.loadLog
		)
	}


	loadLog() {

		// Get current log
		const file = this.getState("current")

		// Load file
		this.props
			.api("/logdata", { file: file })
			.then(log => this.updateState(
				state => state
					.set("history", List())
					.set("output", this.wrap(log, true)),
				this.play
			))
			.catch(console.error)

	}


	play() {
		clearTimeout(this.refresh)
		this.refresh = setTimeout(
			this.listLogs,
			this.props.config.refresh
		)
	}

	pause() {
		clearTimeout(this.refresh)
	}


	loadError() {

		// Stop log refreshing
		this.pause()

		// Get current log
		const file = this.getState("current").replace(".", "_Error.")

		// Get current output
		const output = this.getState("output")

		// Load file
		this.props
			.api("/logdata", { file: file })
			.then(log => this.updateState(state => state
				.update("history", h => h.push(output))
				.set("output", this.wrap(log)),
			))
			.catch(console.error)

	}


	wrap(log, dated=false) {

		// Split log and map
		return log
			.split("\n")
			.filter(line => line.length > 0)
			.map((line, i) => {

				// Handle dated lines
				let date;
				let out;
				if (dated) {

					// Get message date
					date = line.substring(0, 20).replace(",", "")

					// Get message string and handle whitespace
					out = List([{
						content: line.substring(22).replace(/\s/g, '\xa0'),
						type: "text"
					}])

				// Handle undated lines
				} else {
					date = ""
					out = List([{
						content: line.replace(/\s/g, '\xa0'),
						type: "text"
					}])
				}

				// Make key
				const key = `logline-${i}`

				// Build component
				return <p key={key} className="line">
					<span className="date">{date}</span>
					{this.processLine(out)
						.map((l, j) => { switch (l.type) {

							// Output text
							case "text":
								return <span
									key={`${key}-${j}`}
									className="message">
									{l.content}
								</span>

							// Output data
							case "json":
								return <span
									key={`${key}-${j}`}
									className="message">
									{"{"}
									<span
										onClick={() => this.showData(l.content)}
										className="message link data">
										{" DATA "}
									</span>
									{"}"}
								</span>

							// Output errors
							case "error":
								return <span
									key={`${key}-${j}`}
									className="message">
									{"["}
									<span
										onClick={() => this.loadError()}
										className="message link error">
										{" ERROR "}
									</span>
									{"]"}
								</span>

							// Ignore other forms
							default: return undefined

						}})
						.toList()
					}
				</p>

			})

	}


	processLine(line) {
		return line
			.map(span => {

				// Ignore categorized lines
				if (span.type !== "text") {
					return span
				}

				// Handle JSON data
				if (regexJSON.test(span.content)) {

					// Handle text
					let text = List(span.content.split(regexJSON))
						.filter(x => x)
						.map(t => this.processLine(List([{
							content: t,
							type: "text"
						}])))

					// Handle JSON strings
					let json = List(span.content.match(regexJSON))
						.filter(x => x)
						.map(j => List([{
							content: j,
							type: "json"
						}]))

					// Return zipped json and text
					return text.interleave(json)

				// Handle errors
				} else if (regexError.test(span.content)) {

					// Return error with text
					return List([
						{ type: "error" },
						this.processLine(List([{
							type: "text",
							content: span.content.replace(regexError, "")
						}]))
					])

				} else {
					return span
				}

			})
			.flatten()
	}



	showData(data) {

		// Stop log refreshing
		this.pause()

		// Get current output
		const output = this.getState("output")

		// Format data
		let textified = JSON.stringify(JSON.parse(data), null, "\t")

		// Update display
		this.updateState(state => state
			.update("history", h => h.push(output))
			.set("output", this.wrap(textified))
		)

	}


	back() {
		const history = this.getState("history")
		if (history.size > 0) {

			// Get previous output
			const output = history.last()

			// Update display
			this.updateState(
				state => state
					.update("history", h => h.butLast())
					.set("output", output),
				history.size === 1 ? this.play : null
			)

		}
	}


	render() {

		const box = this.getState("box")

		const current = this.getState("current")
		const files = this.getState("files")
		const nation = this.props.status.getIn(["nation", "name"]) + "|"

		const output = this.getState("output")

		return <div
			ref={ref => this.card = ref}
			id="logs"
			className="box right">

			<div
				ref={ref => this.header = ref}
				className="header">
				<p className="title">
					Logs
				</p>
			</div>

			<div
				className="selector"
				style={{
					minWidth: box.width,
					maxWidth: box.width,
				}}>
				<div className="buttons">
					{files.map(f =>
						<div
							key={f}
							onClick={() => this.setLog(f)}
							className={"button toggle " +
								(f === current ? "active" : "inactive")
							}>
							<p>{f.split(".")[0].replace(nation, "")}</p>
						</div>
					)}
				</div>
			</div>

			<div
				className="content"
				style={{
					minHeight: box.height,
					maxHeight: box.height,
					minWidth: box.width,
					maxWidth: box.width,
				}}>
				<div className="output">
					{output}
					{this.getState("history").size > 0 ?
						<div
							onClick={() => this.back()}
							className="button round">
							{"<"}
						</div>
						: null
					}
				</div>
			</div>

		</div>
		
	}

	componentWillUnmount() {
		clearTimeout(this.refresh)
	}

}

export default Logs;