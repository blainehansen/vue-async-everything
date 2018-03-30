import { expect } from 'chai'
import Vue from 'vue'
import { delay } from 'bluebird'
import { reduce } from 'lodash'


import AsyncDataMixinBuilder from '../src/async-data.js'
import AsyncComputedMixinBuilder from '../src/async-computed.js'

const defaultString = 'defaultString'
const oneString = 'oneString'
const twoString = 'twoString'

const transformCompound = 'transformed '
const errorMessage = 'error message'

function mixinAndExtend(options = {}, asyncDataOptions = {}, asyncComputedOptions = {}) {
	return Vue.extend({
		mixins: [
			AsyncDataMixinBuilder({debounce: 5, transform: null, ...options}),
			AsyncComputedMixinBuilder({debounce: 5, transform: null, ...options})
		],
		render(h) {
			return h('div', [h('span', this.member), h('span', this.delayMember), h('span', this.upperMember)])
		},
		data() {
			return {
				member: oneString,
				triggerMember: false,
				triggerCollectionMember: false,

				transformCompound,
				errorMessage,
				otherErrorContainer: null,

			}
		},

		asyncData: {

			delayMember: {
				get() {
					return delay(5).return(this.member)
				},
				...asyncDataOptions
			},

			delayCollection: {
				get() {
					return delay(5).return([1, 2, 3])
				},
				more() {
					return delay(5).return([4, 5, 6])
				},
				...asyncDataOptions
			}

		},

		asyncComputed: {

			upperMember: {
				watch: 'member',
				get() {
					return delay(5).return(this.member.toUpperCase())
				},
				...asyncComputedOptions
			},

			twiceCollection: {
				watch: 'triggerCollectionMember',
				get() {
					return delay(5).return([2, 4, 6])
				},
				more() {
					return delay(5).return([8, 10, 12])
				},
				...asyncComputedOptions
			}
		}
	})
}


const NoneComponent = Vue.extend({
	mixins: [
		AsyncDataMixinBuilder({debounce: 5, transform: null}),
		AsyncComputedMixinBuilder({debounce: 5, transform: null})
	],
	render(h) {
		return h('div', [h('span', this.member)])
	},
	data() {
		return {
			member: oneString,
		}
	}
})

const BaseComponent = mixinAndExtend()

const ValueNotPromiseComponent = mixinAndExtend(undefined,
	{ get() { return this.member } },
	{ get() { return this.member.toUpperCase() } }
)

const LazyEagerComponent = mixinAndExtend(undefined, { lazy: true }, { eager: true })

const WithDefaultComponent = mixinAndExtend(undefined, { default: defaultString }, { default: defaultString })

const ErrorHandlerComponent = mixinAndExtend({
	error(e) {
		this.otherErrorContainer = this.errorMessage
	}
}, {
	get() {
		return delay(5).then(() => {throw new Error(this.member)})
	}
}, {
	get() {
		return delay(5).then(() => {throw new Error(this.member)})
	}
})

const NoDebounceComponent = mixinAndExtend(undefined, undefined, { debounce: null })

const WatchCloselyComponent = mixinAndExtend(undefined, undefined, { watchClosely: 'triggerMember' })

const TransformComponent = mixinAndExtend({
	transform(result) {
		return `${this.transformCompound}${result}`
	}
}, undefined, undefined)

const LoadMoreComponent = mixinAndExtend(undefined, undefined, undefined)

const LoadMoreAppendComponent = mixinAndExtend(undefined, {
	more: {
		get() {
			return delay(5).return([4, 5, 6])
		},
		concat: (collection, newCollection) => {
			return collection.concat([reduce(newCollection, (sum, n) => sum + n, 0)])
		}
	}
}, {
	more: {
		get() {
			return delay(5).return([8, 10, 12])
		},
		concat: (collection, newCollection) => {
			return collection.concat([reduce(newCollection, (sum, n) => sum + n, 0)])
		}
	}
})

let c

describe("component without either asyncData or asyncComputed", function() {
	it ("doesn't error", function() {
		c = new NoneComponent()

		expect(() => { c.$mount() }).to.not.throw()

	})
})

describe("asyncData", function() {

	it("has correct base functionality", async function() {
		c = new BaseComponent()

		// after creation
		expect(c).property('member').to.eql(oneString)

		expect(c).property('delayMember$default').to.be.null
		expect(c).property('delayMember').to.eql(c.delayMember$default)

		expect(c).property('delayMember$loading').to.be.false
		expect(c).property('delayMember$error').to.be.null

		expect(c).property('delayMember$refresh').to.be.a('function')

		// after mount
		c.$mount()
		expect(c).property('delayMember$loading').to.be.true

		// after load
		await delay(10)
		expect(c).property('delayMember').to.eql(oneString)
		expect(c).property('delayMember$loading').to.be.false
		expect(c).property('delayMember$error').to.be.null

		// after refresh
		c.delayMember$refresh()
		expect(c).property('delayMember$loading').to.be.true

		// after load
		await delay(10)
		expect(c).property('delayMember').to.eql(oneString)
		expect(c).property('delayMember$loading').to.be.false
		expect(c).property('delayMember$error').to.be.null

		// after change
		c.member = twoString
		expect(c).property('delayMember$loading').to.be.false
		c.delayMember$refresh()
		expect(c).property('delayMember$loading').to.be.true

		// after load
		await delay(10)
		expect(c).property('delayMember').to.eql(twoString)
		expect(c).property('delayMember$loading').to.be.false
		expect(c).property('delayMember$error').to.be.null
	})

	it("respects lazy option", async function() {
		c = new LazyEagerComponent()

		c.$mount()
		expect(c).property('delayMember$loading').to.be.false
		await delay(10)

		expect(c).property('delayMember$loading').to.be.false
		expect(c).property('delayMember').to.eql(c.delayMember$default)

		c.delayMember$refresh()
		expect(c).property('delayMember$loading').to.be.true
		await delay(10)

		expect(c).property('delayMember').to.eql(oneString)
		expect(c).property('delayMember$loading').to.be.false
		expect(c).property('delayMember$error').to.be.null
	})

	// it("default", function() {

	// })

	it("can perform load mores", async function() {
		c = new LoadMoreComponent()

		// after creation
		expect(c).property('delayCollection$default').to.be.null
		expect(c).property('delayCollection').to.eql(c.delayCollection$default)

		expect(c).property('delayCollection$loading').to.be.false
		expect(c).property('delayCollection$error').to.be.null

		expect(c).property('delayCollection$refresh').to.be.a('function')
		expect(c).property('delayCollection$more').to.be.a('function')

		// after mount
		c.$mount()
		expect(c).property('delayCollection$loading').to.be.true

		// can get a limited number first
		// after load
		await delay(10)
		expect(c).property('delayCollection').to.eql([1, 2, 3])
		expect(c).property('delayCollection$loading').to.be.false
		expect(c).property('delayCollection$error').to.be.null


		// can get more and append them
		c.delayCollection$more()
		expect(c).property('delayCollection$loading').to.be.true
		await delay(10)
		expect(c).property('delayCollection').to.eql([1, 2, 3, 4, 5, 6])
		expect(c).property('delayCollection$loading').to.be.false
		expect(c).property('delayCollection$error').to.be.null

		c.delayCollection$more()
		expect(c).property('delayCollection$loading').to.be.true
		await delay(10)
		expect(c).property('delayCollection').to.eql([1, 2, 3, 4, 5, 6, 4, 5, 6])
		expect(c).property('delayCollection$loading').to.be.false
		expect(c).property('delayCollection$error').to.be.null

		// can refresh to a complete reset
		c.delayCollection$refresh()
		expect(c).property('delayCollection$loading').to.be.true
		await delay(10)
		expect(c).property('delayCollection').to.eql([1, 2, 3])
		expect(c).property('delayCollection$loading').to.be.false
		expect(c).property('delayCollection$error').to.be.null


		// can get last response from $more
		let response = await c.delayCollection$more()

		expect(response).to.be.an('array').and.eql([4, 5, 6])

		expect(c).property('delayCollection').to.eql([1, 2, 3, 4, 5, 6])
		expect(c).property('delayCollection$loading').to.be.false
		expect(c).property('delayCollection$error').to.be.null


		c = new LoadMoreAppendComponent()

		c.$mount()

		// can do custom appends
		expect(c).property('delayCollection$loading').to.be.true

		// can get a limited number first
		// after load
		await delay(10)
		expect(c).property('delayCollection').to.eql([1, 2, 3])
		expect(c).property('delayCollection$loading').to.be.false
		expect(c).property('delayCollection$error').to.be.null


		// can get more and append them
		c.delayCollection$more()
		expect(c).property('delayCollection$loading').to.be.true
		await delay(10)
		expect(c).property('delayCollection').to.eql([1, 2, 3, 15])
		expect(c).property('delayCollection$loading').to.be.false
		expect(c).property('delayCollection$error').to.be.null

		c.delayCollection$more()
		expect(c).property('delayCollection$loading').to.be.true
		await delay(10)
		expect(c).property('delayCollection').to.eql([1, 2, 3, 15, 15])
		expect(c).property('delayCollection$loading').to.be.false
		expect(c).property('delayCollection$error').to.be.null

		// triggers event on reset


	})

	it("transforms properly", async function() {
		c = new TransformComponent()

		c.$mount()
		expect(c).property('delayMember$loading').to.be.true

		// after load
		await delay(10)
		expect(c).property('delayMember').to.eql(`${transformCompound}${oneString}`)
	})

	it("has a functioning error handler", async function() {
		c = new ErrorHandlerComponent()

		c.$mount()
		// after load
		await delay(16)

		expect(c).property('delayMember$error').to.have.property('message').that.eql(oneString)
		expect(c).property('otherErrorContainer').to.eql(errorMessage)
	})

	it("doesn't load with a value instead of a promise", function() {
		c = new ValueNotPromiseComponent()

		// after mount
		c.$mount()
		expect(c).property('delayMember').to.eql(oneString)
		expect(c).property('delayMember$loading').to.be.false
		expect(c).property('delayMember$error').to.be.null

		// after refresh
		c.member = twoString
		c.delayMember$refresh()
		expect(c).property('delayMember').to.eql(twoString)
		expect(c).property('delayMember$loading').to.be.false
		expect(c).property('delayMember$error').to.be.null

	})

})



describe("asyncComputed", function() {

	it("has correct base functionality", async function() {
		c = new BaseComponent()

		// after creation
		expect(c).property('member').to.eql(oneString)

		expect(c).property('upperMember$default').to.be.null
		expect(c).property('upperMember').to.eql(c.upperMember$default)

		expect(c).property('upperMember$loading').to.be.false

		expect(c).property('upperMember$error').to.be.null

		expect(c).property('upperMember$cancel').to.be.a('function')
		expect(c).property('upperMember$now').to.be.a('function')
		expect(c).property('upperMember$pending').to.be.false

		// after mount
		c.$mount()
		expect(c).property('upperMember$loading').to.be.false
		expect(c).property('upperMember$pending').to.be.false
		expect(c).property('upperMember$error').to.be.null

		// still after mount
		await delay(10)
		expect(c).property('upperMember$loading').to.be.false
		expect(c).property('upperMember$pending').to.be.false

		// after change
		c.member = twoString
		await Vue.nextTick()
		expect(c).property('upperMember$pending').to.be.true
		expect(c).property('upperMember$loading').to.be.false

		// after debounce
		await delay(6)
		expect(c).property('upperMember$pending').to.be.false
		expect(c).property('upperMember$loading').to.be.true

		// after load
		await delay(5)
		expect(c).property('upperMember$pending').to.be.false
		expect(c).property('upperMember$loading').to.be.false

		expect(c).property('upperMember').to.eql(twoString.toUpperCase())
		expect(c).property('upperMember$error').to.be.null

		// after cancel
		c.member = oneString
		await Vue.nextTick()
		expect(c).property('upperMember$pending').to.be.true
		expect(c).property('upperMember$loading').to.be.false
		await delay(1)
		c.upperMember$cancel()
		expect(c).property('upperMember$pending').to.be.false
		expect(c).property('upperMember$loading').to.be.false
		expect(c).property('upperMember$error').to.be.null

		// after now
		c.member = twoString
		await Vue.nextTick()
		expect(c).property('upperMember$pending').to.be.true
		expect(c).property('upperMember$loading').to.be.false
		await delay(1)
		c.upperMember$now()
		expect(c).property('upperMember$pending').to.be.false
		expect(c).property('upperMember$loading').to.be.true

		// after load
		await delay(5)
		expect(c).property('upperMember$pending').to.be.false
		expect(c).property('upperMember$loading').to.be.false

		expect(c).property('upperMember').to.eql(twoString.toUpperCase())
		expect(c).property('upperMember$error').to.be.null

	})


	it("respects the eager option", async function() {
		c = new LazyEagerComponent()

		c.$mount()
		expect(c).property('upperMember$pending').to.be.false
		expect(c).property('upperMember$loading').to.be.true

		// after load
		await delay(6)
		expect(c).property('upperMember$pending').to.be.false
		expect(c).property('upperMember$loading').to.be.false

		expect(c).property('upperMember').to.eql(oneString.toUpperCase())
		expect(c).property('upperMember$error').to.be.null
	})


	it("can perform load mores", async function() {
		c = new LoadMoreComponent()

		// after creation
		expect(c).property('twiceCollection$default').to.be.null
		expect(c).property('twiceCollection').to.eql(c.twiceCollection$default)

		expect(c).property('twiceCollection$loading').to.be.false
		expect(c).property('twiceCollection$error').to.be.null

		expect(c).property('twiceCollection$more').to.be.a('function')

		// after mount
		c.$mount()
		expect(c).property('twiceCollection$loading').to.be.false
		expect(c).property('twiceCollection$pending').to.be.false

		// can get a limited number first
		// after load
		c.triggerCollectionMember = true
		await Vue.nextTick()
		expect(c).property('twiceCollection$loading').to.be.false
		expect(c).property('twiceCollection$pending').to.be.true

		await delay(12)
		expect(c).property('twiceCollection').to.eql([2, 4, 6])
		expect(c).property('twiceCollection$loading').to.be.false
		expect(c).property('twiceCollection$error').to.be.null


		// can get more and append them
		c.twiceCollection$more()
		await Vue.nextTick()
		expect(c).property('twiceCollection$loading').to.be.true
		await delay(12)
		expect(c).property('twiceCollection').to.eql([2, 4, 6, 8, 10, 12])
		expect(c).property('twiceCollection$loading').to.be.false
		expect(c).property('twiceCollection$error').to.be.null

		c.twiceCollection$more()
		await Vue.nextTick()
		expect(c).property('twiceCollection$loading').to.be.true
		await delay(12)
		expect(c).property('twiceCollection').to.eql([2, 4, 6, 8, 10, 12, 8, 10, 12])
		expect(c).property('twiceCollection$loading').to.be.false
		expect(c).property('twiceCollection$error').to.be.null

		// can refresh to a complete reset
		c.triggerCollectionMember = false
		await Vue.nextTick()
		await delay(12)
		expect(c).property('twiceCollection').to.eql([2, 4, 6])
		expect(c).property('twiceCollection$loading').to.be.false
		expect(c).property('twiceCollection$error').to.be.null


		// can get last response from $more
		let response = await c.twiceCollection$more()
		// await Vue.nextTick()

		expect(response).to.be.an('array').and.eql([8, 10, 12])

		expect(c).property('twiceCollection').to.eql([2, 4, 6, 8, 10, 12])
		expect(c).property('twiceCollection$loading').to.be.false
		expect(c).property('twiceCollection$error').to.be.null


		c = new LoadMoreAppendComponent()

		c.$mount()


		// can get a limited number first
		// after load
		c.triggerCollectionMember = true
		await Vue.nextTick()
		await delay(12)
		expect(c).property('twiceCollection').to.eql([2, 4, 6])
		expect(c).property('twiceCollection$loading').to.be.false
		expect(c).property('twiceCollection$error').to.be.null


		// can get more and append them
		c.twiceCollection$more()
		await Vue.nextTick()
		expect(c).property('twiceCollection$loading').to.be.true
		await delay(12)
		expect(c).property('twiceCollection').to.eql([2, 4, 6, 30])
		expect(c).property('twiceCollection$loading').to.be.false
		expect(c).property('twiceCollection$error').to.be.null

		c.twiceCollection$more()
		await Vue.nextTick()
		expect(c).property('twiceCollection$loading').to.be.true
		await delay(12)
		expect(c).property('twiceCollection').to.eql([2, 4, 6, 30, 30])
		expect(c).property('twiceCollection$loading').to.be.false
		expect(c).property('twiceCollection$error').to.be.null

		c.triggerCollectionMember = false
		await Vue.nextTick()
		await delay(12)
		expect(c).property('twiceCollection').to.eql([2, 4, 6])
		expect(c).property('twiceCollection$loading').to.be.false
		expect(c).property('twiceCollection$error').to.be.null


		// triggers event on reset


	})

	// it("default", function() {

	// })

	it("transforms properly", async function() {
		c = new TransformComponent()

		c.$mount()

		// after change
		c.member = twoString
		await Vue.nextTick()
		// after debounce and load
		await delay(12)

		expect(c).property('upperMember').to.eql(`${transformCompound}${twoString.toUpperCase()}`)
	})

	it("has a functioning error handler", async function() {
		c = new ErrorHandlerComponent()

		c.$mount()
		// after change
		c.member = twoString
		await Vue.nextTick()
		// after debounce and load
		await delay(12)

		expect(c).property('delayMember$error').to.have.property('message').that.eql(twoString)
		expect(c).property('otherErrorContainer').to.eql(errorMessage)
	})

	it("doesn't load with a value instead of a promise", async function() {

		c = new ValueNotPromiseComponent()
		c.$mount()

		// after change
		c.member = twoString
		await Vue.nextTick()
		expect(c).property('upperMember$pending').to.be.true
		expect(c).property('upperMember$loading').to.be.false

		// after debounce
		await delay(6)
		expect(c).property('upperMember').to.eql(twoString.toUpperCase())
		expect(c).property('upperMember$loading').to.be.false
		expect(c).property('upperMember$error').to.be.null

	})


	it("doesn't debounce when debounce is null", async function() {

		c = new NoDebounceComponent()

		expect(c).to.not.have.property('upperMember$pending')

		expect(c).to.not.have.property('upperMember$cancel')
		expect(c).to.not.have.property('upperMember$now')

		c.$mount()

		// after change
		c.member = twoString
		await Vue.nextTick()
		expect(c).property('upperMember$loading').to.be.true

		// after load
		await delay(6)
		expect(c).property('upperMember$loading').to.be.false

		expect(c).property('upperMember').to.eql(twoString.toUpperCase())
		expect(c).property('upperMember$error').to.be.null

	})


	it("invokes immediately when watchClosely changes", async function() {

		c = new WatchCloselyComponent()

		c.$mount()

		// after change
		c.triggerMember = true
		await Vue.nextTick()
		expect(c).property('upperMember$loading').to.be.true
		expect(c).property('upperMember$pending').to.be.false

		// after load
		await delay(6)
		expect(c).property('upperMember$loading').to.be.false
		expect(c).property('upperMember$pending').to.be.false

		expect(c).property('upperMember').to.eql(oneString.toUpperCase())
		expect(c).property('upperMember$error').to.be.null

	})

})


const basicVuexOptions = {
	state: {
		name: 'first'
	},

	mutations: {
		setName(state, name) {
			state.name = name
		}
	}

	asyncGuard: (state, getters) => state.name == 'second',

	asyncState: {
		delayName(state, getters)  {
			return delay(5).return(state.name)
		},

		delayCollection: {
			get(state, getters) {
				return delay(5).return([1, 2, 3])
			},

			more(state, getters) {
				return delay(5).return([4, 5, 6])
			}
		}
	},

	upperMember: {
		watch: (state, getters) => state.name,
		get(state, getters) {
			return delay(5).return(state.name.toUpperCase())
		},
		// ...asyncComputedOptions
	},

	twiceCollection: {
		watch: 'triggerCollectionMember',
		get() {
			return delay(5).return([2, 4, 6])
		},
		more() {
			return delay(5).return([8, 10, 12])
		},
		...asyncComputedOptions
	}
}

describe("vuex asyncState", function() {

	it("loads immediately", async function() {
		store = new AsyncVuex(basicVuexOptions)

	})

	it ("doesn't respond to mutations")

	it ("waits for a guard")

	it ("respects lazy")


	// check state and delay and everything
	// probably wait and check

	// perform mutation

	// check wait check
	//
})


// const allGlobalConfig = {
// 	meta: (propName, metaName) => `${propName}_${metaName}`,
// 	error(e) {
// 		expect
// 	},
// 	transform() {
// 		expect
// 	},
// 	debounce: {

// 	}
// })

// describe("global config", function() {

// 	describe("meta naming", function() {

// 	})

// 	describe("transform", function() {

// 	})

// 	describe("error handler", function() {

// 	})

// 	describe("debounce", function() {

// 	})

// })
