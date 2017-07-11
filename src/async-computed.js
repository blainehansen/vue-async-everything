import { each, debounce } from 'lodash'
import { resolverForGivenFunction, dataObjBuilder, metaCancel, metaNow, metaPending, metaLoading, metaError, metaDefault } from './core.js'


const AsyncComputedMixin = {
	
	beforeCreate() {
		let properties = this.$options.asyncComputed
		this.$options.methods = this.$options.methods || {}
		let methods = this.$options.methods

		each(properties, (prop, propName) => {
			// get the actual method that needs to be called
			let givenFunction = prop.get
			
			// create a debounced version of it
			let debouncedFunction = debounce(resolverForGivenFunction(givenFunction), 750)

			// set up the watcher on it
			let watch = prop.watch
			this.$watch(watch, function() {
				this[metaPending(propName)] = true

				debouncedFunction()
			}, { deep: true, immediate: !prop.lazy })

			// inject the $cancel and $now
			methods[metaCancel(propName)] = function() {
				debouncedFunction.cancel()
			}

			methods[metaNow(propName)] = function() {
				debouncedFunction.flush()
			}

		})

	},

	data() {
		return dataObjBuilder.call(this, false)
	}

	// maybe have a thing that tears down the watchers?
}

export default AsyncComputedMixin