import AsyncDataMixinBuilder from './async-data.js'
import AsyncComputedMixinBuilder from './async-computed.js'
import AsyncMethodsMixinBuilder from './async-methods.js'
import { globalDefaults, dataDefaults, computedDefaults, methodDefaults } from './defaults.js'

export let asyncPropertiesOptions = null

const AsyncPropertiesPlugin = {
	install(Vue, options = {}) {
		const globalOptions = globalDefaults(options)
		const meta = globalOptions.meta
		const dataGlobalDefaults = dataDefaults(globalOptions)
		const computedGlobalDefaults = computedDefaults(globalOptions)
		const methodGlobalDefaults = methodDefaults(globalOptions)

		const AsyncDataMixin = AsyncDataMixinBuilder(dataGlobalDefaults, meta)
		const AsyncComputedMixin = AsyncComputedMixinBuilder(computedGlobalDefaults, meta)
		const AsyncMethodsMixin = AsyncMethodsMixinBuilder(methodGlobalDefaults, meta)

		const strategy = Vue.config.optionMergeStrategies.computed
		Vue.config.optionMergeStrategies.asyncData = strategy
		Vue.config.optionMergeStrategies.asyncComputed = strategy
		Vue.config.optionMergeStrategies.asyncMethods = strategy

		Vue.mixin(AsyncDataMixin)
		Vue.mixin(AsyncComputedMixin)
		Vue.mixin(AsyncMethodsMixin)

		asyncPropertiesOptions = { meta, dataGlobalDefaults, computedGlobalDefaults, methodGlobalDefaults }
	}
}

export default AsyncPropertiesPlugin

if (typeof window !== 'undefined' && window.Vue) {
	// Auto install in dist mode
	window.Vue.use(AsyncPropertiesPlugin)
}
