import { debounce } from 'lodash'
import { resolverForGivenFunction, dataObjBuilder, metaFunctionBuilder } from './core.js'
import { computedDefaults } from './defaults.js'

export default function AsyncComputedMixinBuilder(computedGlobalDefaults, meta) {
	const metaCancel = metaFunctionBuilder('cancel', meta)
	const metaNow = metaFunctionBuilder('now', meta)
	const metaLoading = metaFunctionBuilder('loading', meta)
	const metaPending = metaFunctionBuilder('pending', meta)
	const metaError = metaFunctionBuilder('error', meta)
	const metaDefault = metaFunctionBuilder('default', meta)
	const metaDebounce = metaFunctionBuilder('debounce', meta)
	const metaResolver = metaFunctionBuilder('resolver', meta)
	const metaMore = metaFunctionBuilder('more', meta)
	const metaReset = metaFunctionBuilder('reset', meta)

	const metas = { metaPending, metaLoading, metaError, metaDefault, metaReset }

	return {

	beforeCreate() {
		let properties = this.$options.asyncComputed || {}

		let methods = this.$options.methods = this.$options.methods || {}

		for (const [propName, prop] of Object.entries(properties)) {
			const opt = computedDefaults(prop, computedGlobalDefaults)

			if (!opt.get)
				throw `An asyncComputed was created without a get method: ${opt}`

			let resolverFunction = resolverForGivenFunction.call(this, propName, metas, opt.get, opt.default, opt.transform, opt.error)

			if (opt.debounce !== false) {
				const debouncedResolverFunction = debounce(
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
		const properties = this.$options.asyncComputed || {}

		for (const [propName, prop] of Object.entries(properties)) {
			const opt = computedDefaults(prop, computedGlobalDefaults)

			if (!opt.watch && !opt.watchClosely)
				throw `A computed was created without any kind of watch: ${opt}`

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
				else if (shouldDebounce) {
					this[metaPending(propName)] = true
					debouncedResolverFunction()
				}
				else {
					resolverFunction()
				}

			}, { deep: true, immediate: eager })


			// if there's no debouncing set up, then watchClosely is ignored
			if (shouldDebounce && opt.watchClosely) {
				this.$watch(opt.watchClosely, function() {

					this[metaPending(propName)] = false
					debouncedResolverFunction.cancel()
					resolverFunction()

				}, { deep: true, immediate: false })
			}
		}
	},

	data() {
		return dataObjBuilder(this.$options.asyncComputed, metas, true)
	}

	}
}
