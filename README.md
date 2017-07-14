# vue-async-properties

> Smart asynchronous data and computed properties for vue components.


## **This package is incomplete, and still under active development.**

This package makes dealing with asynchronous data directly in Vue components completely simple and flexible.


## Version `0.0.1`.

This version has:

- debounce setup
- error handlers
- mandatory watch param on computed
- only functions that return promises
- defaults and merging
- component-wide flags
- customizable meta naming
- lazy and eager
- transformation functions, global and local

The basic useage looks like this.

```js
// main.js
import Vue from 'vue'

// simplest if you use axios integrated with vue
// but you can use whatever http library you prefer
import axios from 'axios'
import VueAxios from 'vue-axios'
Vue.use(VueAxios, axios)

Vue.axios.defaults.baseURL = 'http://example.com/v1/'
Vue.axios.defaults.headers.common['Authorization'] = AUTH_TOKEN

import VueAsyncProperties from 'vue-async-properties'
Vue.use(VueAsyncProperties, {
	debounce: 1000
})
```

Now `asyncData` and `asyncComputed` options are available on your components:

```js
// in component
new Vue({
	props: ['articleId'],
	asyncData: {
		// when the component is created
		// a request will be made to http://example.com/v1/articles/articleId
		article() {
			return this.axios.get(`/articles/${this.articleId}`)
		}
	},
	asyncComputed: {
		// whenever article.content changes,
		// a request will be made
		// (debounced by 1000 miliseconds)
		articleContentFeedback: {
			get() {
				return this.axios.get(`/articles/check-content/${this.article.content}`)
			},
			watch: 'article.content'
		}
	}
})
```

```jade
// in template
#article(:class="{ 'loading': article$loading }")
	input(v-model="article.title")

	textarea(v-model="article.content")

	span.content-feedback(v-if="articleContentFeedback$pending") 
		| waiting for you to finish changing the content...
	span.content-feedback(v-else-if="articleContentFeedback$loading")
		| asking the server if your content's okay...
	span.content-feedback.is-error(v-else-if="articleContentFeedback$error")
		| there was an error while asking the server

	span.content-feedback(v-if="articleContentFeedback")
		| {{articleContentFeedback}}
```

As you can see, everything's handled for you.


## Difference between `asyncData` and `asyncComputed`?

`asyncData`: only runs once automatically, during the component's `onCreated` hook.

`asyncComputed`: runs automatically every time any of the things it depends on changes (with debounce).


## General Syntax

For `asyncData`, you can simply pass a function that returns a promise.

```js
new Vue({
	props: ['articleId'],
	asyncData: {
		article() {
			return this.axios.get(`/articles/${this.articleId}`)
		}
	}
})
```

For `asyncComputed`, you have to provide a `get` function that returns a promise, and a `watch` parameter that's either a [string referring to a property on the vue instance, or a function that refers to the properties you want tracked](https://vuejs.org/v2/api/#vm-watch).

```js
new Vue({
	data: {
		query: ''
	},
	asyncComputed: {
		searchResults: {
			// the function that returns a promise
			get() {
				return this.axios.get(`/search/${this.query}`)
			},

			// the thing to watch for changes
			watch: 'query'
			// ... or ...
			watch() {
				this.query
			}
		}
	}
})
```

Why is this necessary? Why not just pass a function that's reactively watched? Well, in order for Vue to reactively track a function, it has to invoke that function up front, when you set up the watcher. Since we have a function that performs an expensive async operation, which we also want to debounce, we can't really do that. The next planned future version of this package will solve this problem.


## Meta Properties

Properties to indicate the status of your requests, and methods to manage them, are automatically added to the component.

- `prop$loading`: if a request currently in progress
- `prop$error`: the error of the last request
- `prop$default`: the default value you passed, if any

**For `asyncData`**

- `prop$refresh()`: perform the request again

**For `asyncComputed`**

- `prop$pending`: if a request is *queued*, but not yet sent because of debouncing
- `prop$cancel()`: cancel any debounced requests
- `prop$now()`: immediately perform the latest debounced request

**Component-Wide**

- `$asyncLoading`
- `$asyncPending`
- `$asyncError`


### Different naming for Meta Properties

The default naming strategy for the meta properties like "loading" and "pending" is `propName$metaName`. You may prefer a different naming strategy, and you can pass a function for a different one in the global config.

```js
Vue.use(VueAsyncProperties, {
	// for "article" and "loading"
	// "article__Loading"
	metaNameFunction: (propName, metaName) => `${propName}__${capitalize(metaName)}`,

	// or ...
	// "$loading_article"
	metaNameFunction: (propName, metaName) => '$' + metaName + '_' + propName,

	// the default is:
	metaNameFunction: (propName, metaName) => `${propName}$${metaName}`,
})
```

## Defaults and Merging

You can provide a default to both `asyncData` and `asyncComputed`, which will be set as the initial value at creation, and used instead of a request result if it's `null` or `undefined`.

```js
new Vue({
	// if articleId is passed as 123
	props: ['articleId'],
	asyncData: {
		article: {
			// and if that id doesn't exist and returns null...
			get() { /* ... */ },
			// this will be used instead
			default: {
				title: "Default Title",
				content: "Default Content"
			}
		}
	}
})
```

The normal behavior when a request is performed and returns a non-empty value is to ignore the default and set the value as the result of the request. But you might want the result to have its empty fields filled in by those values on the default. To do this, set the `merge` option.

```js
new Vue({
	asyncData: {
		article: {
			get() { /* ... */ },
			default: articleObject

			// any fields the default has that the result doesn't
			// will be copied over to the result
			merge: true,

			// you can supply a custom merging function with the signature:
			// (defaultValue, resultValue, key, defaultObject, resultObject)
			// https://lodash.com/docs/#mergeWith
			merge: myMergeFunc,
		}
	}
})
```

When both the default value and the result are arrays, the default merge strategy will be to combine the two arrays.

```js
new Vue({
	asyncData: {
		numbers: {
			default: [1, 2]
			// let's say this returns [3, 4, 5]
			get() { /* ... */ },
			merge: true,
			// after the request, the numbers property will contain [1, 2, 3, 4, 5]
		}
	}
})
```


## Returning a Value Rather Than a Promise

If you don't want a request to be performed, you can directly return a value instead of a promise.

```js
new Vue({
	props: ['articleId'],
	asyncData: {
		article: {
			get() {
				// if you return either null or undefined
				// the default will be used
				// and no request will be performed
				if (!this.articleId) return null

				// ... or ...

				// doing this will directly set the value
				// and no request will be performed
				if (!this.articleId) return {
					title: "No Article ID!",
					content: "There's nothing there."
				}
				else return this.axios.get(`/articles/${this.articleId}`)
			},
			// this will be used if null or undefined
			// are returned by the method or the request
			default: {
				title: "Default Title",
				content: "Default Content"
			}
		}
	}
})
```


## Debouncing

It's always a good idea to debounce asynchronous functions that rely on user input. You can configure this both globally and at the property level.

By default, anything you pass to `debounce` only applies to `asyncComputed` since it's the only one that directly relies on input.

```js
// global configuration
Vue.use(VueAsyncProperties, {
	// if the value is just a number, it's used as the wait time
	debounce: 500,

	// you can pass an object for more complex situations
	debounce: {
		wait: 500,

		// these are the same options used in lodash debounce
		// https://lodash.com/docs/#debounce
		leading: false, // default
		trailing: true, // default
		maxWait: null // default
	}
})

// property level configuration
new Vue({
	asyncComputed: {
		searchResults: {
			get() { /* ... */ },
			watch: '...'
			// this will be 1000 instead of the default globally configured 500
			debounce: 1000
		}
	}
})
```

However, since an `asyncData` property has a `$refresh` method, it could be useful to have *leading edge* debouncing on that method, to prevent a user from accidentally sending multiple refresh requests in a short time. Use the `debounceData` param for that.

```js
Vue.use(VueAsyncProperties, {
	debounceData: 250,

	// you can of course have full complex control
	debounceData: {
		wait: 250,

		leading: true, // default
		trailing: false, // default
		maxWait: null // default
	}
})
```



## Lazy and Eager Requests

`asyncData` allows the `lazy` param, which tells it to not perform its request immediately on creation, and instead set the property as `null` or the default if you've provided one. It will instead wait for the `$refresh` method to be called.

```js
new Vue({
	asyncData: {
		article: {
			get() { /* ... */ },
			// won't be triggered until article$refresh is called
			lazy: true, // default 'false'

			// if a default is provided,
			// it will be used until article$refresh is called
			default: {
				title: "Default Title",
				content: "Default content"
			}
		}
	}
})
```

`asyncComputed` allows an `eager` param, which tells it to immediately perform its request on creation, rather than waiting for some user input.

```js
new Vue({
	data: {
		query: 'initial query'
	},
	asyncComputed: {
		searchResults: {
			get() { /* ... */ },
			watch: '...',
			// will be triggered right away with 'initial query'
			eager: true // default 'false'
		}
	}
})
```


## Transformation Functions

Pass a `transform` function if you have some processing you'd always like to do with request results. You can provide this globally and locally.

**Note:** this function will only be called if a request is actually made. So if you directly return a value rather than a promise from your `get` function, `transform` won't be called.

```js
Vue.use(VueAsyncProperties, {
	// this is the default,
	// which simply returns the data value from result
	transform(result) {
		return result.data
	}

	// ... or ...
	// doing this will prevent any transforms
	// from being applied
	transform: null
})

new Vue({
	props: ['articleId'],
	asyncData: {
		article: {
			get() { /* ... */ },
			// this will override the global transform
			transform(result) {
				return doSomeTransforming(result)
			},

			// ... or ...
			// doing this will prevent any transforms
			// from being applied to this property
			transform: null
		}
	}
})
```

<!-- ## Clear on Request??? -->


## Error Handling

You can set up error handling, either globally (maybe you have some sort of notification tray or alerts), or at the property level.

```js
Vue.use(VueAsyncProperties, {
	error(error) {
		Notification.error({ title: "error", message: error.message })
	}
})

new Vue({
	props: ['articleId'],
	asyncData: {
		article: {
			get() { /* ... */ },

			error(error) {
				this.doErrorStuff(error)
			},

			// this flag causes this local handler
			// to suppress the global handler
			// so the global handler WON'T be called
			errorTakeover: true // default 'false'
		}
	}
})
```

There is a global default, which simply logs the error to the console:

```js
Vue.use(VueAsyncProperties, {
	error(error) {
		console.error(error)
	}
})
```
