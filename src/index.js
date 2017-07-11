import AsyncDataMixin from './async-data.js'
import AsyncComputedMixin from './async-computed.js'

const AsyncPropertiesPlugin = {}
AsyncPropertiesPlugin.install = function(Vue, options) {
	Vue.mixin(AsyncDataMixin)
	Vue.mixin(AsyncComputedMixin)
}

export default AsyncPropertiesPlugin