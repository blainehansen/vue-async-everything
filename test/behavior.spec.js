import { expect } from 'chai'
import Vue from 'vue'
import { delay } from 'bluebird'
import { reduce, cloneDeep } from 'lodash'

import AsyncProperties from '../src/'
Vue.use(AsyncProperties, { debounce: 5, transform: null })

const defaultString = 'defaultString'
const oneString = 'oneString'
const twoString = 'twoString'

const transformCompound = 'transformed'
const errorMessage = 'error message'

function mixinAndExtend(bothOptions = {}, asyncDataOptions = {}, asyncComputedOptions = {}) {
	return Vue.extend({
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
				...bothOptions,
				...asyncDataOptions
			},

			delayCollection: {
				get() {
					return delay(5).return([1, 2, 3])
				},
				more() {
					return delay(5).return([4, 5, 6])
				},
				...bothOptions,
				...asyncDataOptions
			}

		},

		asyncComputed: {

			upperMember: {
				watch: 'member',
				get() {
					return delay(5).return(this.member.toUpperCase())
				},
				...bothOptions,
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
				...bothOptions,
				...asyncComputedOptions
			}
		}
	})
}

const NoneComponent = Vue.extend({
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
		return `${this.transformCompound} ${result}`
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


const conflictingMixin = {
	asyncData: {
		notFoo() {
			return delay(5).return(this.member)
		}
	},
	asyncComputed: {
		notBar: {
			get() {
				return delay(5).return(this.member.toUpperCase())
			},
			watch: 'member'
		}
	}
}
const OverlappingMixinsComponent = Vue.extend({
	mixins: [
		conflictingMixin,
	],
	asyncData: {
		foo() {
			return delay(5).return(this.member)
		}
	},
	asyncComputed: {
		bar: {
			get() {
				return delay(5).return(this.member.toUpperCase())
			},
			watch: 'member'
		}
	},
	render(h) {
		return h('div', [h('span', this.member)])
	},
	data() {
		return {
			member: oneString,
		}
	}
})



let c

describe("component without either asyncData or asyncComputed", function() {
	it("doesn't error", function() {
		c = new NoneComponent()

		expect(() => { c.$mount() }).to.not.throw()

	})
})


describe("component that uses mixins with asyncData or asyncComputed", function() {
	it("has merged options, from current and mixin", function() {
		c = new OverlappingMixinsComponent()

		expect(c).property('member').to.eql(oneString)

		expect(c).property('foo$default').to.be.null
		expect(c).property('foo').to.eql(c.foo$default)
		expect(c).property('foo$error').to.be.null
		expect(c).property('foo$loading').to.be.false
		expect(c).property('foo$refresh').to.be.a('function')

		expect(c).property('bar$default').to.be.null
		expect(c).property('bar').to.eql(c.bar$default)
		expect(c).property('bar$error').to.be.null
		expect(c).property('bar$loading').to.be.false
		expect(c).property('bar$pending').to.be.false
		expect(c).property('bar$cancel').to.be.a('function')
		expect(c).property('bar$now').to.be.a('function')

		expect(c).property('notFoo$default').to.be.null
		expect(c).property('notFoo').to.eql(c.notFoo$default)
		expect(c).property('notFoo$error').to.be.null
		expect(c).property('notFoo$loading').to.be.false
		expect(c).property('notFoo$refresh').to.be.a('function')

		expect(c).property('notBar$default').to.be.null
		expect(c).property('notBar').to.eql(c.notBar$default)
		expect(c).property('notBar$error').to.be.null
		expect(c).property('notBar$loading').to.be.false
		expect(c).property('notBar$pending').to.be.false
		expect(c).property('notBar$cancel').to.be.a('function')
		expect(c).property('notBar$now').to.be.a('function')
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
		expect(c).property('delayMember').to.eql(`${transformCompound} ${oneString}`)
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
		await delay(7)
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

		expect(c).property('upperMember').to.eql(`${transformCompound} ${twoString.toUpperCase()}`)
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
		expect(c).property('member').to.be.eql(twoString)
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


import { createLocalVue } from '@vue/test-utils'
import VueAsyncProperties from '../src/index.js'
import AsyncVuex from '../src/vuex.js'

const firstName = 'first'
const secondName = 'second'
function createVuex(options = {}, asyncGuard = null, asyncStateOptions = {}, asyncGettersOptions = {}) {
	const localVue = createLocalVue()
	localVue.use(VueAsyncProperties, { debounce: 5, transform: null, ...options })
	localVue.use(AsyncVuex)

	return new AsyncVuex.Store({
		state: {
			name: firstName,
			triggerMember: true,
			triggerCollectionMember: true,

			garbage: null,
			guardFlag: false,
		},

		mutations: {
			setName(state, name) {
				state.name = name
			},

			setGuardFlag(state, val) {
				state.guardFlag = val
			},

			garbageMutation(state, garbage) {
				state.garbage = garbage
			}
		},

		actions: {
			async watchThis({ commit }) {
				await delay(5)
				commit('garbageMutation', 'garbage')
			}
		},

		asyncGuard,

		asyncState: {
			delayName: {
				get(state, getters) {
					return delay(5).return(state.name)
				},
				...asyncStateOptions
			},

			delayCollection: {
				get(state, getters) {
					return delay(5).return([1, 2, 3])
				},

				more(state, getters) {
					return delay(5).return([4, 5, 6])
				},
				...asyncStateOptions
			}
		},

		asyncGetters: {
			upperName: {
				watch: (state, getters) => state.name,
				get(state, getters) {
					return delay(5).return(state.name.toUpperCase())
				},
				...asyncGettersOptions
			},

			twiceCollection: {
				watch: (state, getters) => state.triggerCollectionMember,
				get() {
					return delay(5).return([2, 4, 6])
				},
				more() {
					return delay(5).return([8, 10, 12])
				},
				...asyncGettersOptions
			}
		}
	})
}


describe("vuex asyncState", function() {

	it("has the correct base functionality", async function() {
		const store = createVuex()

		expect(store.state.name).to.eql(firstName)
		expect(store.state.delayName).to.eql(null)
		expect(store.state.delayName$loading).to.eql(true)
		await Vue.nextTick()
		await delay(6)

		expect(store.state.delayName).to.eql(firstName)
		expect(store.state.delayName$loading).to.eql(false)

		// doesn't respond to changes
		store.commit('setName', secondName)
		expect(store.state.name).to.eql(secondName)
		expect(store.state.delayName).to.eql(firstName)
		expect(store.state.delayName$loading).to.eql(false)
		await Vue.nextTick()
		await delay(6)
		expect(store.state.delayName).to.eql(firstName)

		// but we can refresh it
		const dispatchPromise = store.dispatch('delayName$refresh')
		expect(store.state.delayName).to.eql(firstName)
		expect(store.state.delayName$loading).to.eql(true)
		await Vue.nextTick()
		await delay(6)
		await dispatchPromise
		expect(store.state.delayName).to.eql(secondName)
		expect(store.state.delayName$loading).to.eql(false)
	})

	it ("waits for a guard", async function() {
		const store = createVuex(undefined, (state, getters) => state.guardFlag)

		expect(store.state.name).to.eql(firstName)
		expect(store.state.delayName).to.eql(null)
		expect(store.state.delayName$loading).to.eql(false)
		await Vue.nextTick()
		await delay(6)

		expect(store.state.delayName).to.eql(null)
		expect(store.state.delayName$loading).to.eql(false)

		store.commit('setGuardFlag', true)
		expect(store.state.guardFlag).to.eql(true)
		await Vue.nextTick()
		expect(store.state.delayName).to.eql(null)
		// expect(store.state.delayName$loading).to.eql(true)
		await Vue.nextTick()
		await delay(6)

		expect(store.state.delayName).to.eql(firstName)
		expect(store.state.delayName$loading).to.eql(false)
	})

	it ("respects lazy", async function() {
		const store = createVuex(undefined, undefined, { lazy: true })

		expect(store.state.name).to.eql(firstName)
		expect(store.state.delayName).to.eql(null)
		expect(store.state.delayName$loading).to.eql(false)
		await Vue.nextTick()
		await delay(6)

		expect(store.state.delayName).to.eql(null)
		expect(store.state.delayName$loading).to.eql(false)

		const dispatchPromise = store.dispatch('delayName$refresh')
		expect(store.state.delayName).to.eql(null)
		expect(store.state.delayName$loading).to.eql(true)
		await Vue.nextTick()
		await delay(6)
		await dispatchPromise
		expect(store.state.delayName).to.eql(firstName)
		expect(store.state.delayName$loading).to.eql(false)
	})
})


describe("vuex asyncGetters", function() {

	it("has the correct base functionality", async function() {
		const store = createVuex()

		expect(store.state.name).to.eql(firstName)
		expect(store.state.upperName).to.eql(null)
		expect(store.state.upperName$loading).to.eql(false)
		await Vue.nextTick()

		expect(store.state.upperName).to.eql(null)
		expect(store.state.upperName$loading).to.eql(false)

		store.commit('setName', secondName)
		expect(store.state.name).to.eql(secondName)
		await Vue.nextTick()
		// pending after change
		expect(store.state.upperName).to.eql(null)
		expect(store.state.upperName$pending).to.eql(true)
		expect(store.state.upperName$loading).to.eql(false)

		await Vue.nextTick()
		await delay(6)
		// loading after pending
		expect(store.state.upperName).to.eql(null)
		expect(store.state.upperName$pending).to.eql(false)
		expect(store.state.upperName$loading).to.eql(true)

		await Vue.nextTick()
		await delay(6)
		// done
		expect(store.state.upperName).to.eql(secondName.toUpperCase())
		expect(store.state.upperName$pending).to.eql(false)
		expect(store.state.upperName$loading).to.eql(false)

	})

	it("waits for a guard", async function() {
		const store = createVuex(undefined, (state, getters) => state.guardFlag)

		expect(store.state.name).to.eql(firstName)
		expect(store.state.upperName).to.eql(null)
		expect(store.state.upperName$pending).to.eql(false)
		expect(store.state.upperName$loading).to.eql(false)
		await Vue.nextTick()
		await delay(6)

		expect(store.state.upperName).to.eql(null)
		expect(store.state.upperName$pending).to.eql(false)
		expect(store.state.upperName$loading).to.eql(false)

		store.commit('setName', secondName)
		expect(store.state.name).to.eql(secondName)
		await Vue.nextTick()
		// the guard isn't satisfied yet
		expect(store.state.upperName).to.eql(null)
		expect(store.state.upperName$pending).to.eql(false)
		expect(store.state.upperName$loading).to.eql(false)

		store.commit('setGuardFlag', true)
		await Vue.nextTick()
		expect(store.state.upperName).to.eql(null)
		expect(store.state.upperName$pending).to.eql(true)
		expect(store.state.upperName$loading).to.eql(false)

		await Vue.nextTick()
		await delay(6)
		expect(store.state.upperName).to.eql(null)
		expect(store.state.upperName$pending).to.eql(false)
		expect(store.state.upperName$loading).to.eql(true)

		await Vue.nextTick()
		await delay(6)
		expect(store.state.upperName).to.eql(secondName.toUpperCase())
		expect(store.state.upperName$pending).to.eql(false)
		expect(store.state.upperName$loading).to.eql(false)
	})

	it("respects eager", async function() {
		const store = createVuex(undefined, undefined, undefined, { eager: true })

		expect(store.state.name).to.eql(firstName)
		expect(store.state.upperName).to.eql(null)
		expect(store.state.upperName$pending).to.eql(false)
		expect(store.state.upperName$loading).to.eql(true)
		await Vue.nextTick()
		await delay(6)

		expect(store.state.upperName).to.eql(firstName.toUpperCase())
		expect(store.state.upperName$pending).to.eql(false)
		expect(store.state.upperName$loading).to.eql(false)
	})

})
