import { each } from 'lodash'
import { resolverForGivenFunction, dataObjBuilder, metaRefresh, metaLoading, metaError, metaDefault } from './core.js'


const AsyncDataMixin = {

	beforeCreate() {
		let properties = this.$options.asyncData

		if (!properties) return

		this.$options.methods = this.$options.methods || {}
		let methods = this.$options.methods

		each(properties, (prop, propName) => {
			// since we're only allowing methods that return either a thing or a promise
			// we just use the prop itself as the method

			// TODO here we probably need to check if the thing is a function
			let givenFunction = prop

			// create the $refresh method on the options.methods object
			methods[metaRefresh(propName)] = resolverForGivenFunction(givenFunction)

		})

	},

	// for all non lazy properties, call refresh methods
	created() {
		let properties = this.$options.asyncData

		each(properties, (prop, propName) => {
			if (prop.lazy != true) {
				this[metaRefresh(propName)]()
			}
		})

	},
	
	data() {
		return dataObjBuilder.call(this)
	}
}

export default AsyncDataMixin