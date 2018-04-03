import AsyncDataMixinBuilder from './async-data.js'
import AsyncComputedMixinBuilder from './async-computed.js'
import { globalDefaults, dataDefaults, computedDefaults } from './defaults.js'

const AsyncPropertiesPlugin = {
	install(Vue, options = {}) {
		const AsyncDataMixin = AsyncDataMixinBuilder(options)
		const AsyncComputedMixin = AsyncComputedMixinBuilder(options)

		const strategy = Vue.config.optionMergeStrategies.computed
		Vue.config.optionMergeStrategies.asyncData = strategy
		Vue.config.optionMergeStrategies.asyncComputed = strategy

		Vue.mixin(AsyncDataMixin)
		Vue.mixin(AsyncComputedMixin)

		const meta = globalDefaults(options).meta
		const dataGlobalDefaults = dataDefaults(options)
		const computedGlobalDefaults = computedDefaults(options)

		Vue.$asyncPropertiesOptions = { meta, dataGlobalDefaults, computedGlobalDefaults }
	}
}

export default AsyncPropertiesPlugin

if (typeof window !== 'undefined' && window.Vue) {
	// Auto install in dist mode
	window.Vue.use(AsyncPropertiesPlugin)
}
