import { isNil } from 'lodash'

import { createResolverFunction, metaFunctionBuilder, dataObjBuilder } from './core.js'
import { globalDefaults, dataDefaults, computedDefaults } from './defaults.js'


import Vue from 'vue'
import Vuex from 'vuex'

function doubleMetaFunctionBuilder(metaFunction, firstMetaName, ...metaNames) {
	let builtMetaName = firstMetaName
	for (metaName of metaNames) {
		builtMetaName = metaFunction(builtMetaName, metaName)
	}

	return (propName) => metaFunction(propName, builtMetaName)
}

export default class AsyncVuex extends Vuex.Store {
	constructor({ asyncState = {}, asyncGetters = {}, asyncStateGuard, asyncStateStartup, state = {}, mutations = {}, actions = {}, modules = {}, plugins = [], ...options }) {

		const { meta, dataGlobalDefaults, computedGlobalDefaults } = Vue.$asyncPropertiesOptions
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

		const metaLoadingSet = doubleMetaFunctionBuilder(meta, 'loading', 'set')
		const metaErrorSet = doubleMetaFunctionBuilder(meta, 'error', 'set')

		state = {
			...state,
			...dataObjBuilder(asyncState, { metaPending, metaLoading, metaError, metaDefault }),
			...dataObjBuilder(asyncGetters, { metaPending, metaLoading, metaError, metaDefault }, true)
		}


		const potentiallyImmediateDispatches = []

		for (const [propName, prop] of Object.entries(asyncState)) {
			// TODO probably have a vuex version for any differences
			const opt = dataDefaults(prop, dataGlobalDefaults)
			const defaultValue = opt.default

			// the given function shouldn't be allowed to mutate
			const givenFunction = opt.get
			// certainly the transform should just be static and not allowed to mutate
			const transformFunction = (result, { state, getters }) => opt.transform(result, state, getters)
			// should the error handler be a mutation? then it could post error information to other parts of the store
			const errorHandler = (result, { state, getters }) => opt.error(result, state, getters)

			const loadingName = metaLoadingSet(propName)
			const assignLoading = (val, { commit }) => {
				commit(loadingName), val)
			}
			const errorName = metaErrorSet(propName)
			const assignError = (val, { commit }) => {
				commit(errorName, val)
			}

			// if they've provided a mutation of their own, then that takes precedence
			const setName = metaSet(propName)
			let assignValueTemp
			if (opt.more) {
				const resetName = metaReset(propName)
				const emitReset = (val, { commit }) => {
					commit(resetName, val)
				}

				const concatFunction = opt.more.concat
				const assignValue = assignValueTemp = (result, { state, commit }) => {
					if (!isNil(result)) commit(setName, concatFunction(state[propName], result))
					else commit(setName, defaultValue)
				}

				actions[metaMore(propName)] = createResolverFunction(givenFunction, transformFunction, errorHandler, assignValue, assignLoading, assignError, undefined, emitReset)
			}
			else {
				assignValueTemp = (result, { commit }) => {
					if (!isNil(result)) commit(setName, result)
					else commit(setName, defaultValue)
				}
			}
			const assignValue = assignValueTemp

			const actionName = metaRefresh(propName)
			actions[actionName] = createResolverFunction(givenFunction, transformFunction, errorHandler, assignValue, assignLoading, assignError)
			// this will handle calling it the second it's possible
			potentiallyImmediateDispatches.push([actionName, opt.lazy])
		}


		const watches = []
		const subscribeMutationNames = {}
		const subscribeActionNames = {}

		for (const [propName, prop] of Object.entries(asyncGetters)) {
			const opt = computedDefaults(prop, computedGlobalDefaults)

			actions[metaNow(propName)] = null
			actions[metaCancel(propName)] = null

			potentiallyImmediateDispatches.push([metaNow(propName), !opt.eager])

			const shouldDebounce = !(opt.debounce === false || !opt.watch)
			const defaultWatch = opt.watch || opt.watchClosely

			// if either watch is a function, we push it to watches
			// if either is a string or list of strings, we

			if (defaultWatch instanceof Function) {
				watches.push([defaultWatch, shouldDebounce && opt.watch ? debouncedResolverFunction : resolverFunction])
			}

			if (shouldDebounce && opt.watchClosely) {
				watches.push([opt.watchClosely, resolverFunction])
			}


			// there are potentially six different watches/subscribes we could set up
			// watch and watchClosely for getters, mutations, and actions

			if (defaultWatch instanceof Function) {
				let hasRun = false
				store.watch(defaultWatch, function() {

					if (eager && !hasRun) {
						hasRun = true
						resolverFunction()
					}
					else {
						if (shouldDebounce) {
							store.commit(metaPendingMutation(propName), true)
							debouncedResolverFunction()
						}
						else {
							resolverFunction()
						}
					}

				}, { deep: true, immediate: eager })
			}
			else {
				if (typeof defaultWatch == 'string') defaultWatch = [defaultWatch]
				else if (!(defaultWatch instanceof Array)) throw Error(`Watches must be a function, a string, or an array of strings: ${defaultWatch}`)

				const actionNames = []
				const mutationNames = []

				for (const methodName of defaultWatch) {
					if (actions.hasOwnProperty(methodName)) subscribeActionNames[methodName] = resolverFunction
					else if (mutations.hasOwnProperty(methodName)) subscribeMutationNames[methodName] = resolverFunction
					else throw Error(`A watch or watchClosely was provided that couldn't be mapped to a mutation or action: ${methodName}`)
				}
			}

			// we probably have to do something with opt.more here
		}


		function asyncPlugin(store) {
			function runAllDispatches() {
				for (const [actionName, lazy] of potentiallyImmediateDispatches) {
					if (!lazy) store.dispatch(actionName)
				}
			}

			// if there's a guard
			if (!isNil(asyncGuard)) {
				let hasRun = false
				store.watch(asyncGuard, (guardResults) => {
					if (guardResults && !hasRun) {
						runAllDispatches()
						hasRun = true
					}
				}, { immediate: true })
			}
			else {
				runAllDispatches()
			}


			for (const [watch, handler] of watches) {
				store.watch(watch, handler, { deep: true, immediate: false })
			}

			store.subscribe((mutation, state) => {
				const responseFunction = subscribeMutationNames[mutation]
				if (responseFunction) {
					responseFunction(store)
				}
			})

			store.subscribeAction((action, state) => {
				const responseFunction = subscribeActionNames[action]
				if (responseFunction) {
					responseFunction(store)
				}
			})
		}

		plugins.push(asyncPlugin)


		super({ state, mutations, getters, actions, plugins, modules, ...options })
	}
}
