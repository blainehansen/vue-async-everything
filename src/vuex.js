import { isNil, createResolverFunction, metaFunctionBuilder, dataObjBuilder } from './core.js'
import { globalDefaults, vuexStateDefaults, vuexGetterDefaults } from './defaults.js'

import Vuex from 'vuex'
import { debounce } from 'lodash'


function vuexResolver(opt, propName, mutations, actions, { metaSet, metaLoading, metaLoadingSet, metaPending = null, metaPendingSet = null, metaError, metaErrorHandler, metaErrorSet, metaMore = null, metaReset = null }) {

	const givenFunction = opt.get
	const defaultValue = opt.default

	// transform is static and not a mutation
	const transformFunction = (result, { state, getters }) => opt.transform(result, state, getters)

	const loadingName = metaLoading(propName)
	const loadingSetName = metaLoadingSet(propName)
	mutations[loadingSetName] = (state, val) => {
		state[loadingName] = val
	}
	const assignLoading = (val, { commit }) => {
		commit(loadingSetName, val)
	}

	let assignPendingTemp
	if (metaPending) {
		const pendingName = metaPending(propName)
		const pendingSetName = metaPendingSet(propName)
		mutations[pendingSetName] = (state, val) => {
			state[pendingName] = val
		}
		assignPendingTemp = (val, { commit }) => {
			commit(pendingSetName, val)
		}
	}
	const assignPending = assignPendingTemp

	const errorHandlerName = metaErrorHandler(propName)
	const errorFunction = opt.error
	// errorHandler is a mutation
	mutations[errorHandlerName] = (vuexContext, error) => {
		errorFunction(error)
	}
	const errorHandler = (error, { commit }) => commit(errorHandlerName, error)

	const errorName = metaError(propName)
	const errorSetName = metaErrorSet(propName)
	mutations[errorSetName] = (state, val) => {
		state[errorName] = val
	}
	const assignError = (val, { commit }) => {
		commit(errorSetName, val)
	}

	const setName = metaSet(propName)
	const defaultMutation = (state, val) => {
		state[propName] = val
	}
	mutations[setName] = opt.mutation || defaultMutation
	if (metaMore) {
		const concatFunction = opt.more.concat
		const resetName = metaReset(propName)

		mutations[resetName] = opt.more.reset
		const emitReset = (val, { commit }) => {
			commit(resetName, val)
		}

		const assignValue = (result, { state, commit }) => {
			if (!isNil(result)) commit(setName, concatFunction(state[propName], result))
			else commit(setName, defaultValue)
		}

		actions[metaMore(propName)] = createResolverFunction(givenFunction, transformFunction, errorHandler, assignValue, assignLoading, assignError, assignPending, emitReset)
	}
	const assignValue = (result, { commit }) => {
		if (!isNil(result)) commit(setName, result)
		else commit(setName, defaultValue)
	}

	return createResolverFunction(givenFunction, transformFunction, errorHandler, assignValue, assignLoading, assignError, assignPending)
}


import { asyncPropertiesOptions } from './index.js'

class AsyncVuex extends Vuex.Store {
	constructor({ asyncState = {}, asyncGetters = {}, asyncGuard, asyncStateStartup, state = {}, getters = {}, mutations = {}, actions = {}, modules, plugins = [], ...options }) {

		if (!asyncPropertiesOptions) throw Error("there aren't any global options")
		const { meta, dataGlobalDefaults, computedGlobalDefaults } = asyncPropertiesOptions
		const metaRefresh = metaFunctionBuilder('refresh', meta)
		const metaCancel = metaFunctionBuilder('cancel', meta)
		const metaNow = metaFunctionBuilder('now', meta)
		const metaLoading = metaFunctionBuilder('loading', meta)
		const metaPending = metaFunctionBuilder('pending', meta)
		const metaError = metaFunctionBuilder('error', meta)
		const metaDefault = metaFunctionBuilder('default', meta)
		const metaMore = metaFunctionBuilder('more', meta)
		const metaReset = metaFunctionBuilder('reset', meta)
		const metaSet = metaFunctionBuilder('set', meta)

		const metaLoadingSet = metaFunctionBuilder('loadingSet', meta)
		const metaPendingSet = metaFunctionBuilder('pendingSet', meta)
		const metaErrorSet = metaFunctionBuilder('errorSet', meta)
		const metaErrorHandler = metaFunctionBuilder('errorHandler', meta)
		const metaDispatch = metaFunctionBuilder('dispatch', meta)
		const metaDebounceDispatch = metaFunctionBuilder('debounceDispatch', meta)

		let metas

		state = {
			...state,
			...dataObjBuilder(asyncState, { metaLoading, metaError, metaDefault }),
			...dataObjBuilder(asyncGetters, { metaPending, metaLoading, metaError, metaDefault }, true)
		}


		const immediateDispatches = []

		metas = { metaLoading, metaLoadingSet, metaError, metaErrorHandler, metaErrorSet, metaSet }
		for (const [propName, prop] of Object.entries(asyncState)) {
			const opt = vuexStateDefaults(prop, dataGlobalDefaults)

			if (opt.more) {
				metas.metaReset = metaReset
				metas.metaMore = metaMore
			}

			const actionName = metaRefresh(propName)
			actions[actionName] = vuexResolver(opt, propName, mutations, actions, metas)

			if (!opt.lazy) immediateDispatches.push(actionName)
		}


		const watches = []
		const subscribeMutationNames = {}
		const subscribeActionNames = {}

		metas = { metaPending, metaPendingSet, metaLoading, metaLoadingSet, metaError, metaErrorHandler, metaErrorSet, metaSet }
		for (const [propName, prop] of Object.entries(asyncGetters)) {
			const opt = vuexGetterDefaults(prop, computedGlobalDefaults)

			if (opt.more) {
				metas.metaReset = metaReset
				metas.metaMore = metaMore
			}

			const actionName = metaDispatch(propName)
			actions[actionName] = vuexResolver(opt, propName, mutations, actions, metas)

			if (opt.eager) immediateDispatches.push(actionName)

			const debouncedResolverFunction = debounce(
				(store) => store.dispatch(actionName),
				opt.debounce.wait, opt.debounce.options
			)

			const pendingSetName = metaPendingSet(propName)
			actions[metaNow(propName)] = (vuexContext) => {
				vuexContext.commit(pendingSetName, false)
				debouncedResolverFunction.flush()
			}
			actions[metaCancel(propName)] = (vuexContext) => {
				vuexContext.commit(pendingSetName, false)
				debouncedResolverFunction.cancel()
			}


			// basically, the watch and the watchClosely have to have the same thing done with them, where the watch has debouncing and the watchClosely doesn't
			// if the watch param is a function, it's added to the watches
			// if it's a string or an array of strings, it's added to the response function manifests
			// those response functions will take the store, and then dispatch an action

			function addWatch(watch, shouldDebounce) {
				if (!watch) return

				const responseFunction = shouldDebounce
					? (store) => {
						store.commit(pendingSetName, true)
						return debouncedResolverFunction(store)
					}
					: (store) => store.dispatch(actionName)

				const watchType = typeof watch
				if (watchType == 'function') {
					watches.push([watch, responseFunction])
				}
				else {
					if (watchType == 'string') watch = [watch]
					else if (!(watch instanceof Array)) throw Error(`Watches must be a function, a string, or an array of strings: ${watch}`)

					for (const methodName of watch) {
						// TODO this will have huge problems with namespaced actions and mutations. right now this will only work with actions and mutations in the current module
						if (actions.hasOwnProperty(methodName)) subscribeActionNames[methodName] = responseFunction
						else if (mutations.hasOwnProperty(methodName)) subscribeMutationNames[methodName] = responseFunction
						else throw Error(`A watch or watchClosely was provided that couldn't be mapped to a mutation or action: ${methodName}`)
					}
				}
			}

			addWatch(opt.watch, true)
			addWatch(opt.watchClosely, false)
		}


		function asyncPlugin(store) {
			let hasRun = false
			function runAllDispatches() {
				for (const actionName of immediateDispatches) {
					store.dispatch(actionName)
				}
				hasRun = true
			}

			if (asyncGuard) {
				store.watch(asyncGuard, (guardResults) => {
					if (guardResults && !hasRun) {
						runAllDispatches()
					}
				}, { deep: true, immediate: true })
			}
			else runAllDispatches()


			for (const [watch, responseFunction] of watches) {
				let fullWatch
				if (asyncGuard) {
					fullWatch = (state, getters) => asyncGuard(state, getters) && watch(state, getters)
				}
				else fullWatch = watch

				store.watch(fullWatch, () => responseFunction(store), { deep: true, immediate: false })
			}

			if (asyncGuard) {
				store.subscribe((mutationName, state) => {
					const responseFunction = subscribeMutationNames[mutationName]
					if (responseFunction && asyncGuard(store.state, store.getters)) responseFunction(store)
				})

				store.subscribeAction((actionName, state) => {
					const responseFunction = subscribeActionNames[actionName]
					if (responseFunction && asyncGuard(store.state, store.getters)) responseFunction(store)
				})
			}
			else {
				store.subscribe((mutationName, state) => {
					const responseFunction = subscribeMutationNames[mutationName]
					if (responseFunction) responseFunction(store)
				})

				store.subscribeAction((actionName, state) => {
					const responseFunction = subscribeActionNames[actionName]
					if (responseFunction) responseFunction(store)
				})
			}
		}

		plugins.push(asyncPlugin)


		super({ state, mutations, getters, actions, plugins, modules, ...options })
	}
}

export default {
	...Vuex,
	Store: AsyncVuex
}
