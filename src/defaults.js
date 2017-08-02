import { get, pick, defaultsDeep, cloneDeep, isNil } from 'lodash'

const globalDefaultObject = {
	meta: (propName, metaName) => `${propName}$${metaName}`,
}

const commonLocalDefaultObject = {
	// merge: false
	// mergeFunction: () => {}, // ?
	transform: (result) => result.data,
	// transformCombine: false,
	error: (e) => { console.error(e) },
	// errorCombine: false,
}

const dataLocalDefaultObject = {
	lazy: false,
	debounce: false,
}

const computedLocalDefaultObject = {
	eager: false,
	debounce: {
		wait: 1000,
		options: {}
	}
}


export function globalDefaults(options) {
	options = cloneDeep(options)
	return defaultsDeep(options, globalDefaultObject)
}

export function dataDefaults(options, bigOptions = {}) {
	options = cloneDeep(options)

	if (typeof options === 'function') {
		options = { get: options }
	}
	if (options.transform === null) options.transform = (result) => result

	return defaultsDeep(options, bigOptions, commonLocalDefaultObject, dataLocalDefaultObject)
}

export function computedDefaults(options, bigOptions = {}) {
	options = cloneDeep(options)

	if (typeof options.debounce === 'number') {
		options.debounce = {
			wait: options.debounce,
			options: {}
		}
	}
	else if (isNil(options.debounce)) options.debounce = {}
	else options.debounce = {wait: options.debounce.wait, options: pick(options.debounce, 'leading', 'trailing', 'maxWait')}

	if (options.transform === null) options.transform = (result) => result

	return defaultsDeep(options, bigOptions, commonLocalDefaultObject, computedLocalDefaultObject)
}