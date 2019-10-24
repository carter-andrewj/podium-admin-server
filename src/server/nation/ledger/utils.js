


// Shortens addresses for output
export function curtail(address) {
	if (!address) {
		return "[unknown]"
	} else {
		const l = address.length
		return `${address.substring(0, 3)}...${address.substring(l-3,l-1)}`
	}
}