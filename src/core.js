export function isNil(value) {
	return value === null || value === undefined
}

export function metaFunctionBuilder(metaName, metaFunction) {
	return (propName) => metaFunction(propName, metaName)
}


export function resolverForGivenFunction(propName, { metaPending = null, metaLoading, metaError, metaReset = null }, givenFunction, defaultValue, transformFunction, errorHandler, concatFunction = null) {
	givenFunction = givenFunction.bind(this)
	transformFunction = transformFunction.bind(this)
	errorHandler = errorHandler.bind(this)

	// create the assignValue function
	// if this is a load more resolver, it has to use the concat function
	let assignValueTemp
	let emitReset
	if (concatFunction) {
		concatFunction = concatFunction.bind(this)
		const resetName = metaReset(propName)
		emitReset = (result) => { this.$emit(resetName, result) }
		assignValueTemp = (result) => {
			if (!isNil(result)) this[propName] = concatFunction(this[propName], result)
			else this[propName] = defaultValue
		}
	}
	// otherwise it just overwrites
	else {
		assignValueTemp = (result) => {
			// TODO this needs to account for merging

			if (!isNil(result)) this[propName] = result
			else this[propName] = defaultValue
		}
	}
	const assignValue = assignValueTemp


	let assignPendingTemp
	if (metaPending) {
		const pendingName = metaPending(propName)
		assignPendingTemp = (val) => {
			this[pendingName] = val
		}
	}
	const assignPending = assignPendingTemp


	const loadingName = metaLoading(propName)
	const assignLoading = (val) => {
		this[loadingName] = val
	}

	const errorName = metaError(propName)
	const assignError = (val) => {
		this[errorName] = val
	}

	return createResolverFunction(givenFunction, transformFunction, errorHandler, assignValue, assignLoading, assignError, assignPending, emitReset)
}


export function createResolverFunction(givenFunction, transformFunction, errorHandler, assignValue, assignLoading, assignError, assignPending = () => {}, emitReset = null) {

	return (vuexContext) => {
		assignPending(false, vuexContext)
		assignError(null, vuexContext)
		const givenResult = vuexContext ? givenFunction(vuexContext.state, vuexContext.getters) : givenFunction()

		if (!isNil(givenResult) && typeof givenResult.then === 'function') {
			assignLoading(true, vuexContext)

			// place a then on the promise
			givenResult
			.then((result) => {
				// we'd probably also have to branch based on whether we're resetting or not

				// console.log('result', result)
				assignValue(transformFunction(result, vuexContext), vuexContext)
				return result
			})
			.catch((error) => {
				assignError(error, vuexContext)
				errorHandler(error, vuexContext)

				// this will trigger a save of default
				// TODO check if they want it cleared on error
				assignValue(null, vuexContext)
			})
			.then((result) => {
				assignLoading(false, vuexContext)

				if (emitReset) {
					emitReset(result, vuexContext)
				}

				return result
			})

		}
		else {
			assignValue(givenResult, vuexContext)
		}

		// here's the real result that should bubble
		// whether promise or real, return it
		return givenResult
	}
}


export function dataObjBuilder(properties = {}, { metaPending, metaLoading, metaError, metaDefault }, shouldDebounce = false) {
	let dataObj = {}
	for (const [propName, prop] of Object.entries(properties)) {
		// the property itself
		const defaultValue = prop.default || null
		dataObj[propName] = defaultValue

		if (shouldDebounce && prop.debounce !== null) {
			// pending
			dataObj[metaPending(propName)] = false
		}
		// loading
		dataObj[metaLoading(propName)] = false
		// error
		dataObj[metaError(propName)] = null
		// default
		dataObj[metaDefault(propName)] = defaultValue
	}

	return dataObj
}
