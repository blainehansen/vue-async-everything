import { expect } from 'chai'
import Vue from 'vue'
import { delay } from 'bluebird'

// for (let [key, value] of {key: 'value', thing: 'other'}) {
Object.prototype[Symbol.iterator] = function*() {
	for(let key of Object.keys(this)) {
		yield([ key, this[key] ])
	}
}


import AsyncDataMixinBuilder from '../src/async-data.js'
import AsyncComputedMixinBuilder from '../src/async-computed.js'

const defaultString = 'defaultString'
const oneString = 'oneString'
const twoString = 'twoString'

function mixinAndExtend(options = {debounce: 5, transform: null}, asyncDataOptions = {}, asyncComputedOptions = {}) {
	return Vue.extend({
		mixins: [AsyncDataMixinBuilder(options), AsyncComputedMixinBuilder(options)],
		render(h) {
			return h('div', [h('span', this.member), h('span', this.delayMember), h('span', this.upperMember)])
		},
		data() {
			return {
				member: oneString
			}
		},
		asyncData: {
			delayMember: {
				get() {
					return delay(5).return(this.member)
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
			}
		}
	})
}


const BaseComponent = mixinAndExtend()

const ValueNotPromiseComponent = mixinAndExtend(undefined,
	{ get() { return this.member } },
	{ get() { return this.member.toUpperCase() } }
)

const LazyEagerComponent = mixinAndExtend(undefined, { lazy: true }, { eager: true })

const WithDefaultComponent = mixinAndExtend(undefined, { default: defaultString }, { default: defaultString })

const ErrorHandlerComponent = mixinAndExtend(undefined, { error: (e) => e }, { error: (e) => e })

let c

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

	// it("transform", function() {

	// })

	// it("error handler", function() {

	// })

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
		expect(c).property('upperMember$pending').to.be.false

		expect(c).property('upperMember$error').to.be.null

		expect(c).property('upperMember$cancel').to.be.a('function')
		expect(c).property('upperMember$now').to.be.a('function')

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


	// it("eager", function() {

	// })

	// it("default", function() {

	// })

	// it("transform", function() {

	// })

	// it("error handler", function() {

	// })

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