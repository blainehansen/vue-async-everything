import Vuex from 'vuex'
import { isNil } from 'lodash'
// import { resolverForGivenFunction, dataObjBuilder, metaFunctionBuilder } from './core.js'
import { dataObjBuilder, metaFunctionBuilder } from './core.js'


export default class AsyncVuex extends Vuex.Store {
	constructor({ asyncState = {}, asyncGetters = {}, asyncStateGuard, asyncStateStartup, state = {}, mutations = {}, actions = {}, modules = {}, plugins = [], ...options }) {

		// const globalOptions = globalDefaults(options)
		// const meta = globalOptions.meta

		// const metaRefresh = metaFunctionBuilder('refresh', meta)
		// const metaLoading = metaFunctionBuilder('loading', meta)
		// const metaError = metaFunctionBuilder('error', meta)
		// const metaDefault = metaFunctionBuilder('default', meta)
		// const metaMore = metaFunctionBuilder('more', meta)


		const asyncStateDispatches = []

		// go through each asyncState and pull off the action and mutation
		for (const [propName, { mutation, action, default }] of Object.entries(asyncState)) {
			// create all state
			const defaultValue = default || null
			state[propName] = defaultValue
			state[`${propName}$loading`] = false
			state[`${propName}$error`] = null
			state[`${propName}$default`] = defaultValue

			// we need to create a mutation
			// this is very simple, since we aren't wrapping anything.
			mutations[`${propName}$commit`] = mutation
			mutations[`${propName}$loading$set`] = (state, value) => { state[`${propName}$loading`] = value }

			// and an action
			actions[`${propName}$dispatch`] = (context) => {
				const commit = context.commit

				// const resolve
				context.asyncCommit = partial(commit, `${propName}$commit`)
				commit(`${propName}$loading$set`, true)
				action(context)
				commit(`${propName}$loading$set`, false)
			}

			asyncStateDispatches.push(`${propName}$dispatch`)
		}


		function runAllDispatches() {
			for (const dispatchName of asyncStateDispatches) {
				this.dispatch(dispatchName)
			}
		}
		runAllDispatches = runAllDispatches.bind(this)

		function asyncPlugin(store) {

			function defaultAsyncStartup(_, runAllDispatches) {
				runAllDispatches()
			}

			asyncStateStartup = asyncStateStartup || defaultAsyncStartup

			// if there's a guard
			if (!isNil(asyncStateGuard)) {
				store.watch(asyncStateGuard, (watcherResults) => {
					asyncStateStartup(watcherResults, runAllDispatches)
				}, { immediate: true })
			}
			else {
				asyncStateStartup(undefined, runAllDispatches)
			}
		}

		plugins.push(asyncPlugin)




		for (const [propName, { mutation, action, default, watch, watchClosely }] of Object.entries(asyncGetters)) {

			// for each of these, create a debounced function
			function coreFunction() {

			}

		}


		plugins.push(asyncPlugin)


		super({ state, mutations, getters, actions, plugins, modules, ...options })
	}
}


export default new AsyncVuex({
	asyncState: {
		totalStoreCount: {
			mutation(state, totalStoreCount) {
				state.totalStoreCount = rollout
			},
			// an action to grab the remote results
			get(context) {
				return api.getRollout()
			}
		}
	},

	asyncGetters: {
		mutation() {

		},

		get() {

		},

		watch:
		watchClosely:
	}
})
