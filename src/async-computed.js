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
	const metaResolver = metaFunctionBuilder('resolver', meta)

	const metas = { metaCancel, metaNow, metaPending, metaLoading, metaError, metaDefault, metaDebounce, metaResolver }

	const computedGlobalDefaults = computedDefaults(options)

	return {

	beforeCreate() {
		let properties = this.$options.asyncComputed
		this.$options.methods = this.$options.methods || {}
		let methods = this.$options.methods

		each(properties, (prop, propName) => {
			const opt = computedDefaults(prop, computedGlobalDefaults)

			let resolverFunction = resolverForGivenFunction.call(this, propName, metas, opt.get, opt.default, opt.transform, opt.error)

			if (opt.debounce !== false) {
				let debouncedResolverFunction = debounce(
					resolverFunction,
					opt.debounce.wait, opt.debounce.options
				)

				// inject the $cancel and $now
				const pendingName = metaPending(propName)
				methods[metaCancel(propName)] = function() {
					this[pendingName] = false
					debouncedResolverFunction.cancel()
				}

				methods[metaNow(propName)] = function() {
					this[pendingName] = false
					debouncedResolverFunction.flush()
				}

				this[metaDebounce(propName)] = debouncedResolverFunction
			}

			this[metaResolver(propName)] = resolverFunction
		})

	},

	beforeMount() {
		const properties = this.$options.asyncComputed

		each(properties, (prop, propName) => {
			const opt = computedDefaults(prop, computedGlobalDefaults)

			const resolverFunction = this[metaResolver(propName)]
			// get the debounced version of it
			const debouncedResolverFunction = this[metaDebounce(propName)]

			let hasRun = false
			const eager = opt.eager
			const shouldDebounce = !(opt.debounce === false || !opt.watch)

			const defaultWatch = opt.watch || opt.watchClosely

			this.$watch(defaultWatch, function() {

				if (eager && !hasRun) {
					hasRun = true
					resolverFunction()
				}
				else {
					if (shouldDebounce) {
						this[metaPending(propName)] = true
						debouncedResolverFunction()
					}
					else {
						resolverFunction()
					}
				}

			}, { deep: true, immediate: eager })

			if (shouldDebounce) {
				// if there's no debouncing set up, then watchClosely is ignored
				this.$watch(opt.watchClosely, resolverFunction, { deep: true, immediate: false })
			}

		})

	},

	data() {
		return dataObjBuilder.call(this, metas, false)
	}

	}
}