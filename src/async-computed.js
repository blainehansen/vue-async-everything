import { each, debounce } from 'lodash'
import { resolverForGivenFunction, dataObjBuilder, metaFunctionBuilder } from './core.js'
import { globalDefaults, computedDefaults } from './defaults.js'

export default function AsyncComputedMixinBuilder(options) {

	const globalOptions = globalDefaults(options)
	const metaNameFunction = globalOptions.metaNameFunction

	const metaCancel = metaFunctionBuilder('cancel', metaNameFunction)
	const metaNow = metaFunctionBuilder('now', metaNameFunction)
	const metaPending = metaFunctionBuilder('pending', metaNameFunction)
	const metaLoading = metaFunctionBuilder('loading', metaNameFunction)
	const metaError = metaFunctionBuilder('error', metaNameFunction)
	const metaDefault = metaFunctionBuilder('default', metaNameFunction)
	const metaDebounce = metaFunctionBuilder('debounce', metaNameFunction)

	const metas = { metaCancel, metaNow, metaPending, metaLoading, metaError, metaDefault, metaDebounce }

	const computedGlobalDefaults = computedDefaults(options)

	return {

	beforeCreate() {
		let properties = this.$options.asyncComputed
		this.$options.methods = this.$options.methods || {}
		let methods = this.$options.methods

		each(properties, (prop, propName) => {

			const opt = computedDefaults(prop, computedGlobalDefaults)

			console.log(opt.debounce)
			const debouncedFunction = debounce(
				resolverForGivenFunction.call(this, propName, metas, opt.get, opt.default, opt.transform, opt.error),
				opt.debounce.wait, opt.debounce.options
			)

			this[metaDebounce(propName)] = debouncedFunction

			// inject the $cancel and $now
			methods[metaCancel(propName)] = function() {
				this[metaPending(propName)] = false
				debouncedFunction.cancel()
			}

			methods[metaNow(propName)] = function() {
				debouncedFunction.flush()
			}
		})

	},

	created() {
		const properties = this.$options.asyncComputed

		each(properties, (prop, propName) => {
			const opt = computedDefaults(prop, computedGlobalDefaults)

			// create a debounced version of it
			// const debouncedFunction = this[metaDebounce(propName)].bind(this)
			const debouncedFunction = this[metaDebounce(propName)]

			let hasRun = false
			const eager = opt.eager
			this.$watch(opt.watch, function() {
				if (eager && !hasRun) {
					hasRun = true
					debouncedFunction.call(this)
					debouncedFunction.flush()
				}
				else {
					this[metaPending(propName)] = true
					debouncedFunction.call(this)
				}

			}, { deep: true, immediate: eager })

		})

	},

	data() {
		return dataObjBuilder.call(this, metas, false)
	}

	}
}