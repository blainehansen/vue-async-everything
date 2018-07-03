import { createResolverFunction, metaFunctionBuilder } from './core'
import { methodDefaults } from './defaults'

export function resolverForMethod(propName, { metaLoading, metaError }, givenFunction, transformFunction, errorHandler) {
	givenFunction = givenFunction.bind(this)
	transformFunction = transformFunction.bind(this)
	errorHandler = errorHandler.bind(this)

	// instead the value is just returned by the function
	const assignValue = () => {}

	const invocationsName = metaLoading(propName)
	const assignLoading = (val) => {
		if (val) this[invocationsName] += 1
		else this[invocationsName] -= 1
	}

	const errorName = metaError(propName)
	const assignError = (val) => {
		this[errorName] = val
	}

	return createResolverFunction(givenFunction, transformFunction, errorHandler, assignValue, assignLoading, assignError, () => {}, null)
}

export default function AsyncMethodsMixinBuilder(methodGlobalDefaults, meta) {
	const metaError = metaFunctionBuilder('error', meta)
	const metaLoading = metaFunctionBuilder('loading', meta)
	const metaInvocations = metaFunctionBuilder('invocations', meta)

	const metas = { metaLoading: metaInvocations, metaError }

	return {

	beforeCreate() {
		let properties = this.$options.asyncMethods || {}

		let methods = this.$options.methods = this.$options.methods || {}

		let computed = this.$options.computed = this.$options.computed || {}

		for (const [propName, prop] of Object.entries(properties)) {
			const opt = methodDefaults(prop, methodGlobalDefaults)

			if (!opt.get)
				throw `An asyncMethod was created without a get method: ${opt}`

			methods[propName] = resolverForMethod.call(this, propName, metas, opt.get, opt.transform, opt.error)

			const invocationsName = metaInvocations(propName)
			computed[metaLoading(propName)] = function() {
				return this[invocationsName] > 0
			}
		}
	},

	data() {
		const dataObj = {}
		const properties = this.$options.asyncMethods || {}
		for (const [propName, prop] of Object.entries(properties)) {
			dataObj[metaInvocations(propName)] = 0
			dataObj[metaError(propName)] = null
		}

		return dataObj
	}

	}
}
