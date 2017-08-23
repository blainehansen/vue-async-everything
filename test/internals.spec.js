import { expect } from 'chai'

import { globalDefaults, dataDefaults, computedDefaults } from '../src/defaults.js'

describe("defaults system", function() {

	describe("globalDefaults", function() {

		it("returns correct values based on inputs", function() {

			expect(globalDefaults()).property('meta').to.be.a('function')

			expect(globalDefaults({})).property('meta').to.be.a('function')

			let anonFunction = (propName, metaName) => `${propName}---${metaName}`
			expect(globalDefaults({
				meta: anonFunction, 
			}))
				.property('meta')
				.to.be.a('function')
				.that.is.equal(anonFunction)

			let randomObj = globalDefaults({ random: 'stuff' })
			expect(randomObj)
				.property('meta')
				.to.be.a('function')
			expect(randomObj)
				.property('random')
				
		})

	})


	describe("dataDefaults", function() {

		it("returns correct values based on inputs", function() {

			// {
			// 	transform: (result) => result.data,
			// 	error: (e) => { console.error(e) },
			// 	lazy: false,
			// 	debounce: false,
			// }

			let dataDefaultsObj = dataDefaults()
			expect(dataDefaultsObj).property('transform').to.be.a('function')
			expect(dataDefaultsObj).property('error').to.be.a('function')
			

			dataDefaultsObj = dataDefaults({})
			expect(dataDefaultsObj).property('transform').to.be.a('function')
			expect(dataDefaultsObj).property('error').to.be.a('function')


			// whatever we pass in should show up with other defaults
			let sampleValidObj = { transform: (result) => result.data, error: (e) => e.stuff }
			dataDefaultsObj = dataDefaults(sampleValidObj)
			expect(dataDefaultsObj).to.deep.equal({ ...sampleValidObj, lazy: false, debounce: false })

			expect(dataDefaultsObj.transform({data: 'string'})).to.equal('string')
			expect(dataDefaultsObj.error({stuff: 'things'})).to.equal('things')

			
			// passing null should make transform a "pass-along" function
			sampleValidObj.transform = null
			dataDefaultsObj = dataDefaults(sampleValidObj)
			expect(dataDefaultsObj).property('transform').to.be.a('function')

			expect(dataDefaultsObj.transform({result: 'result'})).to.deep.equal({result: 'result'})
			

			// asyncData doesn't support debounce, so no matter what we do it should be false
			dataDefaultsObj = dataDefaults({debounce: 500})
			expect(dataDefaultsObj).property('debounce').to.be.false

			dataDefaultsObj = dataDefaults({debounce: null})
			expect(dataDefaultsObj).property('debounce').to.be.false


			// if we just provide a function it should be moved to the get property
			dataDefaultsObj = dataDefaults((hello) => hello)
			expect(dataDefaultsObj).property('get').to.be.a('function')

		})

	})

	describe("computedDefaults", function() {

		it("returns correct values based on inputs", function() {

			// {
			// 	eager: false,
			// 	debounce: {
			// 		wait: 1000,
			// 		options: {}
			// 	},
			// 	transform: (result) => result.data,
			// 	error: (e) => { console.error(e) },
			// }

			let computedDefaultsObj = computedDefaults()
			expect(computedDefaultsObj)
				.property('transform').to.be.a('function')
			expect(computedDefaultsObj)
				.property('error').to.be.a('function')
			expect(computedDefaultsObj)
				.property('eager').to.be.false
			expect(computedDefaultsObj)
				.property('debounce').to.be.an('object').that.deep.equal({wait: 1000, options: {}})

			computedDefaultsObj = computedDefaults({})
			expect(computedDefaultsObj)
				.property('transform').to.be.a('function')
			expect(computedDefaultsObj)
				.property('error').to.be.a('function')
			expect(computedDefaultsObj)
				.property('eager').to.be.false
			expect(computedDefaultsObj)
				.property('debounce').to.be.an('object').that.deep.equal({wait: 1000, options: {}})

			computedDefaultsObj = computedDefaults({eager: true, debounce: 500})
			expect(computedDefaultsObj)
				.property('transform').to.be.a('function')
			expect(computedDefaultsObj)
				.property('error').to.be.a('function')
			expect(computedDefaultsObj)
				.property('eager').to.be.true
			expect(computedDefaultsObj)
				.property('debounce').to.be.an('object').that.deep.equal({wait: 500, options: {}})

			computedDefaultsObj = computedDefaults({debounce: { wait: 500, maxWait: 1500, leading: true, trailing: false }})
			expect(computedDefaultsObj)
				.property('transform').to.be.a('function')
			expect(computedDefaultsObj)
				.property('error').to.be.a('function')
			expect(computedDefaultsObj)
				.property('eager').to.be.false
			expect(computedDefaultsObj)
				.property('debounce')
				.to.be.an('object')
				.that.deep.equal({ wait: 500, options: {maxWait: 1500, leading: true, trailing: false} })


			// whatever we pass in should show up with other defaults
			let sampleValidObj = { transform: (result) => result.data, error: (e) => e.stuff }
			computedDefaultsObj = computedDefaults(sampleValidObj)
			expect(computedDefaultsObj)
				.property('eager').to.be.false
			expect(computedDefaultsObj)
				.property('debounce').to.be.an('object').that.deep.equal({wait: 1000, options: {}})

			expect(computedDefaultsObj.transform({data: 'string'})).to.equal('string')
			expect(computedDefaultsObj.error({stuff: 'things'})).to.equal('things')

			
			// passing null should make transform a "pass-along" function
			sampleValidObj.transform = null
			computedDefaultsObj = computedDefaults(sampleValidObj)
			expect(computedDefaultsObj).property('transform').to.be.a('function')

			expect(computedDefaultsObj.transform({result: 'result'})).to.deep.equal({result: 'result'})

		})

	})

})



import AsyncPropertiesPlugin from '../src/index.js'

describe("top level", function() {
	const fakeVue = { mixin(mixinObj) {} }

	it("doesn't error with various empty options", function() {

		expect(() => { AsyncPropertiesPlugin.install(fakeVue) }).to.not.throw()
		
		expect(() => { AsyncPropertiesPlugin.install(fakeVue, {
			meta: (propName, metaName) => `${propName}__${myCapitalize(metaName)}`,
		}) }).to.not.throw()

		expect(() => { AsyncPropertiesPlugin.install(fakeVue, {
			debounce: 500
		}) }).to.not.throw()

		expect(() => { AsyncPropertiesPlugin.install(fakeVue, {
			debounce: {
				wait: 500,

				leading: false,
				trailing: true,
				maxWait: null
			}
		}) }).to.not.throw()

		expect(() => { AsyncPropertiesPlugin.install(fakeVue, {
			debounce: {
				wait: 500,

				leading: true,
				trailing: false,
				maxWait: 1500
			}
		}) }).to.not.throw()

	})

})