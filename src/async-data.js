import { each } from 'lodash'


let metaNameFunction = (propName, metaName) => `${propName}$${metaName}`

let metaRefresh = (propName) => metaNameFunction(propName, 'refresh')

let metaLoading = (propName) => metaNameFunction(propName, 'loading')
let metaError = (propName) => metaNameFunction(propName, 'error')
let metaDefault = (propName) => metaNameFunction(propName, 'default')

let metaPending = (propName) => metaNameFunction(propName, 'pending')
let metaCancel = (propName) => metaNameFunction(propName, 'cancel')
let metaNow = (propName) => metaNameFunction(propName, 'now')


// // if prop is a string
// let resolveRefreshFunc = function() {
// 	let typeofProp = typeof prop

// 	if (typeofProp === 'string') {
// 		// do prefixed replacement
// 		// bundle a function to be used as the refresh
// 		refreshFunc = function() {
// 			return prefixReplacement.call(this, prop)
// 		}
// 	}

// 	// if prop is a function
// 	if (typeofProp === 'function') {
// 		// we can't know what it returns without invoking it, so we just have to let the refresh method itself
// 		refreshFunc = prop
// 	}

// 	// if prop is an object
// 	if (typeofProp === 'object') {
// 		if (prop.request && prop.endpoint) {
// 			// throw
// 		}

// 		if (prop.endpoint) {
// 			let endpoint = prop.endpoint
// 			endpoint = typeof endpoint === 'function' ? endpoint() : endpoint

// 			refreshFunc = function() {
// 				return endpoint
// 			}
// 		}
// 	}

// 	return refreshFunc
// }


let AsyncDataMixin = {

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
			const refreshMethod = function() {
				let givenResult = givenFunction()

				if (typeof givenResult.then === 'function') {
					this[metaLoading(propName)] = true
					this[metaError(propName)] = null
					
					// place a then on the promise
					givenResult
					.then((result) => {
						// TODO this[propName] = transformResult(result)
						this[propName] = result
					})
					.catch((error) => {
						// TODO check if they want it cleared on error
						this[propName] = null
						// TODO call custom error handlers
						this[metaError(propName)] = error
					})
					.then(() => {
						this[metaLoading(propName)] = false
					})

				}
				else {
					this[propName] = givenResult
				}
			}

			methods[metaRefresh(propName)] = refreshMethod

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
	// set up the properties and meta properties
	data() {
		let properties = this.$options.asyncData

		let dataObj = {}
		each(properties, (prop, propName) => {
			// the property itself
			// this needs to account for merging
			// dataObj[propName] = prop.default || null
			dataObj[propName] = null

			// loading
			dataObj[metaLoading(propName)] = false
			// error
			dataObj[metaError(propName)] = null
			// default
			dataObj[metaDefault(propName)] = prop.default || null
			
		})

		return dataObj
	}
}

let AsyncDataPlugin = {}
AsyncDataPlugin.install = function(Vue, options) {
	Vue.mixin(AsyncDataMixin)
}


export default AsyncDataPlugin