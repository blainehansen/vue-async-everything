import { isNil } from 'lodash'


export function metaFunctionBuilder(metaName, metaFunction) {
	return (propName) => metaFunction(propName, metaName)
}


export function resolverForGivenFunction(propName, { metaPending, metaLoading, metaError }, givenFunction, defaultValue, transformFunction, errorHandler, concatFunction = null) {
	givenFunction = givenFunction.bind(this)
	transformFunction = transformFunction.bind(this)
	errorHandler = errorHandler.bind(this)
	if (concatFunction) concatFunction = concatFunction.bind(this)

	const loadMoreVersion = !!concatFunction

	// create the assignValue function
	// if this is a load more resolver, it has to use the concat function
	let assignValueTemp
	if (loadMoreVersion) {
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
	else {
		assignPendingTemp = (val) => {}
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

	return () => {
		assignPending(false)
		let givenResult = givenFunction()

		if (!isNil(givenResult) && typeof givenResult.then === 'function') {
			assignLoading(true)
			assignError(null)

			// place a then on the promise
			givenResult
			.then((result) => {
				// TODO here we'd call any load more things
				// we'd probably also have to branch based on whether we're resetting or not

				assignValue(transformFunction(result))
				return result
			})
			.catch((error) => {
				// TODO check if they want it cleared on error
				assignError(error)
				errorHandler(error)

				// this will trigger a save of default
				assignValue(null)
			})
			.then((result) => {
				assignLoading(false)

				if (!loadMoreVersion) {
					this.$emit(`${propName}$reset`, result)
				}

				return result
			})

			// here's the real result that should bubble
			// TODO only do this if loadingMore?
			return givenResult

		}
		else {
			assignError(null)
			assignValue(givenResult)
		}
	}

}

export function dataObjBuilder(properties = {}, { metaPending, metaLoading, metaError, metaDefault }, shouldDebounce = false) {
	let dataObj = {}
	for (const [propName, prop] of Object.entries(properties)) {
		// the property itself
		const defaultValue = prop.default || null
		dataObj[propName] = defaultValue

		if (!shouldDebounce && prop.debounce !== null) {
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
