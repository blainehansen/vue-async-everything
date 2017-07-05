let data = {
	$hiddenThing: {
		loading: true,
		$internal: 5
	},
	get thing() {
		return this.$hiddenThing.$internal
	},
	set thing(val) {
		this.$hiddenThing.$internal = val
	},
	get [thing.loading]() {
		return this.$hiddenThing.$internal
	},
	set [thing.loading](val) {
		this.$hiddenThing.$internal = val
	}
}

console.log(data.thing)
data.thing = 6
console.log(data.thing)
console.log(data.thing.loading)