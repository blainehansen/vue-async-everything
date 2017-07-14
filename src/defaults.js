import { get, pick, defaultsDeep, cloneDeep } from 'lodash'

const globalDefaultObject = {
	metaNameFunction: (propName, metaName) => `${propName}$${metaName}`,
}

const commonLocalDefaultObject = {
	// merge: false
	// mergeFunction: () => {}, // ?
	transform: (result) => result.data,
	// transformJoin: false,
	error: (e) => { console.log('default'); console.error(e) },
	// errorTakeover: false,
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
			wait: options.debounce
		}
	}
	if (options.transform === null) options.transform = (result) => result

	return defaultsDeep(options, bigOptions, commonLocalDefaultObject, computedLocalDefaultObject)
}