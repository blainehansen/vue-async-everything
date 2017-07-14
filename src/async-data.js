import { each } from 'lodash'
import { resolverForGivenFunction, dataObjBuilder, metaFunctionBuilder } from './core.js'
import { globalDefaults, dataDefaults } from './defaults.js'


export default function AsyncDataMixinBuilder(options) {

	const globalOptions = globalDefaults(options)
	const metaNameFunction = globalOptions.metaNameFunction

	const metaRefresh = metaFunctionBuilder('refresh', metaNameFunction)
	const metaLoading = metaFunctionBuilder('loading', metaNameFunction)
	const metaError = metaFunctionBuilder('error', metaNameFunction)
	const metaDefault = metaFunctionBuilder('default', metaNameFunction)

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
	created() {
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