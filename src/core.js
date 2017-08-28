import { each, isNil } from 'lodash'


export function metaFunctionBuilder(metaName, metaFunction) {
	return (propName) => metaFunction(propName, metaName)
}


export function resolverForGivenFunction(propName, { metaPending, metaLoading, metaError }, givenFunction, defaultValue, transformFunction, errorHandler) {

	const assignValue = (result) => {
		// TODO this needs to account for merging

		if (!isNil(result)) this[propName] = result
		else this[propName] = defaultValue
	}

	let assignPending
	if (metaPending) {
		const pendingName = metaPending(propName)
		assignPending = (val) => {
			this[pendingName] = val
		}
	}
	else {
		assignPending = (val) => {}
	}

	const loadingName = metaLoading(propName)
	const assignLoading = (val) => {
		this[loadingName] = val
	}

	const errorName = metaError(propName)
	const assignError = (val) => {
		this[errorName] = val
	}

	return () => {
		assignPending(false)
		let givenResult = givenFunction.call(this)

		if (!isNil(givenResult) && typeof givenResult.then === 'function') {
			assignLoading(true)
			assignError(null)
			
			// place a then on the promise
			givenResult
			.then((result) => {
				assignValue(transformFunction(result))
			})
			.catch((error) => {
				// TODO check if they want it cleared on error
				assignError(error)
				errorHandler(error)

				// this will trigger a save of default
				assignValue(null)
			})
			.then(() => {
				assignLoading(false)
			})

		}
		else {
			assignError(null)
			assignValue(givenResult)
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

		if (!forData && prop.debounce !== null) {
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