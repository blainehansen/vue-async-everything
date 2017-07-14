import AsyncDataMixinBuilder from './async-data.js'
import AsyncComputedMixinBuilder from './async-computed.js'

const AsyncPropertiesPlugin = {
	install(Vue, options = {}) {
		const AsyncDataMixin = AsyncDataMixinBuilder(options)
		const AsyncComputedMixin = AsyncComputedMixinBuilder(options)

		Vue.mixin(AsyncDataMixin)
		Vue.mixin(AsyncComputedMixin)
	} 
}

export default AsyncPropertiesPlugin