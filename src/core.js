const metaNameFunction = (propName, metaName) => `${propName}$${metaName}`

const exportObject = {
	metaRefresh: (propName) => metaNameFunction(propName, 'refresh'),

	metaLoading: (propName) => metaNameFunction(propName, 'loading'),
	metaError: (propName) => metaNameFunction(propName, 'error'),
	metaDefault: (propName) => metaNameFunction(propName, 'default'),

	metaPending: (propName) => metaNameFunction(propName, 'pending'),
	metaCancel: (propName) => metaNameFunction(propName, 'cancel'),
	metaNow: (propName) => metaNameFunction(propName, 'now'),
}

exportObject.resolverForGivenFunction = function(givenFunction) {

	return function() {
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
			this[metaError(propName)] = null
			this[propName] = givenResult
		}
	}

}

exportObject.dataObjBuilder = function(forData = true) {
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
		// this needs to account for merging
		// dataObj[propName] = prop.default || null
		dataObj[propName] = null

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


export default exportObject