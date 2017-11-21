import { debounce } from 'lodash'
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
	const metaMore = metaFunctionBuilder('more', meta)


	const metas = { metaPending, metaLoading, metaError, metaDefault }

	const computedGlobalDefaults = computedDefaults(options)

	return {

	beforeCreate() {
		let properties = this.$options.asyncComputed
		this.$options.methods = this.$options.methods || {}
		let methods = this.$options.methods

		for (const [propName, prop] of Object.entries(properties)) {
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

			// load more stuff
			if (opt.more) {
				methods[metaMore(propName)] = resolverForGivenFunction.call(this, propName, metas, opt.more.get, opt.default, opt.transform, opt.error, opt.more.concat)
			}

		}

	},

	beforeMount() {
		const properties = this.$options.asyncComputed

		for (const [propName, prop] of Object.entries(properties)) {
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


			if (shouldDebounce && opt.watchClosely) {
				// if there's no debouncing set up, then watchClosely is ignored
				this.$watch(opt.watchClosely, function() {

					this[metaPending(propName)] = false
					debouncedResolverFunction.cancel()
					resolverFunction()

				}, { deep: true, immediate: false })
			}

		}

	},

	data() {
		return dataObjBuilder.call(this, metas, false)
	}

	}
}
