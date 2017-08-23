import { each } from 'lodash'
import { resolverForGivenFunction, dataObjBuilder, metaFunctionBuilder } from './core.js'
import { globalDefaults, dataDefaults } from './defaults.js'


export default function AsyncDataMixinBuilder(options) {

	const globalOptions = globalDefaults(options)
	const meta = globalOptions.meta

	const metaRefresh = metaFunctionBuilder('refresh', meta)
	const metaLoading = metaFunctionBuilder('loading', meta)
	const metaError = metaFunctionBuilder('error', meta)
	const metaDefault = metaFunctionBuilder('default', meta)

	const metas = { metaRefresh, metaLoading, metaError, metaDefault }

	const dataGlobalDefaults = dataDefaults(options)

	return {

	beforeCreate() {
		let properties = this.$options.asyncData
		this.$options.methods = this.$options.methods || {}
		let methods = this.$options.methods

		each(properties, (prop, propName) => {
			const opt = dataDefaults(prop, dataGlobalDefaults)

			methods[metaRefresh(propName)] = resolverForGivenFunction.call(this, propName, metas, opt.get, opt.default, opt.transform, opt.error)

		})

	},

	// for all non lazy properties, call refresh methods
	beforeMount() {
		const properties = this.$options.asyncData

		each(properties, (prop, propName) => {

			const opt = dataDefaults(prop, dataGlobalDefaults)

			if (!opt.lazy) {
				this[metaRefresh(propName)]()
			}
		})

	},
	
	data() {
		return dataObjBuilder.call(this, metas)
	}
}}