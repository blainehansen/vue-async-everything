import { each, debounce } from 'lodash'
import { resolverForGivenFunction, dataObjBuilder, metaFunctionBuilder } from './core.js'
import { globalDefaults, computedDefaults } from './defaults.js'

export default function AsyncComputedMixinBuilder(options) {

	const globalOptions = globalDefaults(options)
	const meta = globalOptions.meta

	const metaCancel = metaFunctionBuilder('cancel', meta)
	const metaNow = metaFunctionBuilder('now', meta)
	const metaPending = metaFunctionBuilder('pending', meta)
	const metaLoading = metaFunctionBuilder('loading', meta)
	const metaError = metaFunctionBuilder('error', meta)
	const metaDefault = metaFunctionBuilder('default', meta)
	const metaDebounce = metaFunctionBuilder('debounce', meta)

	const metas = { metaCancel, metaNow, metaPending, metaLoading, metaError, metaDefault, metaDebounce }

	const computedGlobalDefaults = computedDefaults(options)

	return {

	beforeCreate() {
		let properties = this.$options.asyncComputed
		this.$options.methods = this.$options.methods || {}
		let methods = this.$options.methods

		each(properties, (prop, propName) => {
			const opt = computedDefaults(prop, computedGlobalDefaults)

			const debouncedFunction = debounce(
				resolverForGivenFunction.call(this, propName, metas, opt.get, opt.default, opt.transform, opt.error),
				opt.debounce.wait, opt.debounce.options
			)

			this[metaDebounce(propName)] = debouncedFunction

			// inject the $cancel and $now
			const pendingName = metaPending(propName)
			methods[metaCancel(propName)] = function() {
				this[pendingName] = false
				debouncedFunction.cancel()
			}

			methods[metaNow(propName)] = function() {
				this[pendingName] = false
				debouncedFunction.flush()
			}
		})

	},

	beforeMount() {
		const properties = this.$options.asyncComputed

		each(properties, (prop, propName) => {
			const opt = computedDefaults(prop, computedGlobalDefaults)

			// get the debounced version of it
			const debouncedFunction = this[metaDebounce(propName)]
			// const debouncedFunction = this[metaDebounce(propName)].bind(this)

			let hasRun = false
			const eager = opt.eager
			this.$watch(opt.watch, function() {
				if (eager && !hasRun) {
					hasRun = true
					debouncedFunction()
					debouncedFunction.flush()
				}
				else {
					this[metaPending(propName)] = true
					debouncedFunction()
				}

			}, { deep: true, immediate: eager })
		})

	},

	data() {
		return dataObjBuilder.call(this, metas, false)
	}

	}
}