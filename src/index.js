import AsyncDataMixinBuilder from './async-data.js'
import AsyncComputedMixinBuilder from './async-computed.js'

// Object.prototype[Symbol.iterator] = function*() {
// 	for(let key of Object.keys(this)) {
// 		yield([ key, this[key] ])
// 	}
// }

const AsyncPropertiesPlugin = {
	install(Vue, options = {}) {
		const AsyncDataMixin = AsyncDataMixinBuilder(options)
		const AsyncComputedMixin = AsyncComputedMixinBuilder(options)

		Vue.mixin(AsyncDataMixin)
		Vue.mixin(AsyncComputedMixin)
	} 
}

export default AsyncPropertiesPlugin