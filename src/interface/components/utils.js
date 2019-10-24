


const s = 1000
const m = 60 * s
const h = 60 * m
const d = 24 * h

export function timeForm(t) {

	let x = 0

	let days = Math.floor(t / d)
	x = x + (days * d)
	let hours = Math.floor((t - x) / h)
	x = x + (hours * h)
	let minutes = Math.floor((t - x) / m)
	x = x + (minutes * m)
	let seconds = Math.floor((t - x) / s)

	let dayString = (x >= d) ? `${days}d ` : ""
	let hourString = (x >= h) ? `${hours}h ` : ""
	let minuteString = (x >= m) ? `${minutes}m ` : ""
	let secondString = `${seconds}s`

	return dayString + hourString + minuteString + secondString

}