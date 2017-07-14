import { each, isNil } from 'lodash'


export function metaFunctionBuilder(metaName, metaFunction) {
	return (propName) => metaFunction(propName, metaName)
}


export function resolverForGivenFunction(propName, { metaPending, metaLoading, metaError }, givenFunction, defaultValue, transformFunction, errorHandler) {

	const assignFinalValue = function(result) {
		// TODO this needs to account for merging

		if (!isNil(result)) this[propName] = result
		else this[propName] = defaultValue

	}.bind(this)

	return function() {
		let givenResult = givenFunction.call(this)

		if (!isNil(givenResult) && typeof givenResult.then === 'function') {
			this[metaLoading(propName)] = true
			if (metaPending) {
				this[metaPending(propName)] = false
			}
			this[metaError(propName)] = null
			
			// place a then on the promise
			givenResult
			.then((result) => {
				assignFinalValue(transformFunction(result))
			})
			.catch((error) => {
				// TODO check if they want it cleared on error
				this[propName] = null
				this[metaError(propName)] = error

				errorHandler(error)
				// this will trigger a save of default
				assignFinalValue(null)
			})
			.then(() => {
				this[metaLoading(propName)] = false
			})

		}
		else {
			this[metaError(propName)] = null
			assignFinalValue(givenResult)
		}
	}

}

export function dataObjBuilder({ metaPending, metaLoading, metaError, metaDefault }, forData = true) {
	let properties
	if (forData) {
		properties = this.$options.asyncData
	}
	else {
		properties = this.$options.asyncComputed
	}

	let dataObj = {}
	each(properties, (prop, propName) => {
		// the property itself
		const defaultValue = prop.default || null
		dataObj[propName] = defaultValue

		if (!forData) {
			// pending
			dataObj[metaPending(propName)] = false
		}
		// loading
		dataObj[metaLoading(propName)] = false
		// error
		dataObj[metaError(propName)] = null
		// default
		dataObj[metaDefault(propName)] = prop.default || null
		
	})

	return dataObj
}