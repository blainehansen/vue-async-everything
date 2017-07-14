# vue-async-properties

> Smart asynchronous data and computed properties for vue components.


## **This package is incomplete, and still under active development.**


This package makes dealing with asynchronous data directly in Vue components completely simple and flexible.

The basic useage looks like this.


## quick and dirty versions

only takes function that returns a thing or a promise

eager for computed, lazy for data


here's how it could work in the future:

```js
// main.js
import Vue from 'vue'

// simplest if you use axios integrated with vue
import axios from 'axios'
import VueAxios from 'vue-axios'
Vue.use(VueAxios, axios)

Vue.axios.defaults.baseURL = 'http://example.com/v1/'
Vue.axios.defaults.headers.common['Authorization'] = AUTH_TOKEN

// since in this version the library never actually makes requests on its own
import VueAsyncProperties from 'vue-async-properties'
Vue.use(VueAsyncProperties, {
	httpMethod: Vue.axios.get,
	debounce: 1000
})


// in component
new Vue({
	data: () => ({
		query: ''
	})
	asyncComputed: {
		reversed() {
			// we place an $async function on the prototype, that is a wrapper of the httpMethod they gave us.
			// this returns a *function* that returns a promise
			return this.$async(this.query)
		}
	}
})
```




```js
// main.js
import Vue from 'vue'

// simplest if you use axios integrated with vue
import axios from 'axios'
import VueAxios from 'vue-axios'
Vue.use(VueAxios, axios)

Vue.axios.defaults.baseURL = 'http://example.com/v1/'
Vue.axios.defaults.headers.common['Authorization'] = AUTH_TOKEN

import VueAsyncProperties from 'vue-async-properties'
Vue.use(VueAsyncProperties, {
	httpMethod: Vue.axios.get,
	debounce: 1000
})
```

Now `asyncData` and `asyncComputed` options are available on your components:

```js
// in component
new Vue({
	props: ['articleId'],
	asyncData: {
		// this will use the articleId prop
		// and when the component is created
		// make a request to http://example.com/v1/articles/:articleId
		article: '/articles/:articleId'
	},
	asyncComputed: {
		// whenever article.content changes,
		// a request will be made
		// (debounced by 1000 miliseconds)
		articleContentFeedback: '/articles/check?c=:article.content'
	}
})
```

```jade
// in template
#article(:class="{ 'loading': article$loading }")
	input(v-model="article.title")

	textarea(v-model="article.content")

	span.content-feedback(v-if="articleContentFeedback$pending") waiting for you to finish changing the content...
	span.content-feedback(v-else-if="articleContentFeedback$loading") asking the server if your content's okay...
	span.content-feedback.is-error(v-else-if="articleContentFeedback$error") there was an error while asking the server

	span.content-feedback(v-if="articleContentFeedback") {{articleContentFeedback}}
```

As you can see, everything's handled for you.


## Difference between `asyncData` and `asyncComputed`?

`asyncData`: only runs once automatically, during the component's `onCreated` hook.

`asyncComputed`: runs automatically every time any of the things it depends on changes (with debounce).


## General Syntax

When you create a property on `asyncData` or `asyncComputed`, you can pass in the following:

- A string. Any segment of the url prefixed by a `:` will be replaced with that property's value on the vue instance (so whatever `this.whatever` is).

```js
new Vue({
	// if this is 123
	props: ['articleId'],
	asyncData: {
		// this will be resolved to '/articles/123'
		article: '/articles/:articleId'
	}
})

```

- A function that returns a string. That string *won't* have colon prefixed segments replaced. Filling in the right values is up to you.

```js
new Vue({
	props: ['articleId'],
	asyncData: {
		article() {
			return `/articles/${this.articleId}`
		}
	}
})
```

- A function that returns a promise, or a normal value if you don't want a request to be made. If you're not using vue-axios, this is probably what you'll have to do all of the time.

```js
new Vue({
	props: ['articleId'],
	asyncData: {
		article() {
			if (this.articleId) {
				// make an unusual request
				return this.$http.post('/articles/', {data: { id: this.articleId }})
			}
			else {
				// any value (other than a string) that doesn't have a `.then` function
				// will be directly set as the property value without a request being made
				return { title: "Let's create a new article!" }
			}
		}
	}
})
```

- An options object.

The most important option is either the `endpoint` or a `request` function.

```js
new Vue({
	props: ['articleId'],
	asyncData: {
		article: {
			// endpoint can be a string
			endpoint: '/articles/:articleId',

			// or a function that returns a string.
			endpoint() {
				return `/articles/${this.articleId}`
			},

			// request must return a promise or a value (which can be a string!)
			request() {
				return this.axios.get(`/articles/${this.articleId}`)
			}
		}
	}
})
```

Read on to find out all the possible options.


## Defaults and Undefined/Null Colon Prefixed Values

If you refer to a property that returns `undefined` in a colon prefixed value, an error will be thrown.

```js
new Vue({
	props: ['articleId'],
	asyncData: {
		// ERROR: undefined colon-prefixed value in endpoint
		article: '/articles/:fakeId'
	}
})
```

If you refer to a property that is `null`, no request will be performed, and the value will be set to either `null` or the default if you defined one.


```js
new Vue({
	// no articleId is passed, so this is null
	props: ['articleId'],
	asyncData: {
		article: {
			endpoint: '/articles/:articleId',
			// article will be set as whatever articleObject is
			default: articleObject
		}
	}
})
```


## Defaults and Merging

The normal behavior when a request is performed and returns a non-empty value is to ignore the default and set the value as the result of the request. But you might want the result to have its empty fields filled in by those values on the default. To do this, set the `merge` option.

```js
new Vue({
	props: ['articleId'],
	asyncData: {
		article: {
			endpoint: '/articles/:articleId',
			default: articleObject

			// any fields that the default has that the result doesn't have
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

If you've turned on event emitting for the entire appication, some properties are also added to indicate status across the entire application, and for the children of the component.

**At the `$root` component level**

- `$rootAsyncLoading`
- `$rootAsyncPending`
- `$rootAsyncError`

**For the children of the current component**

- `$childrenAsyncLoading`
- `$childrenAsyncPending`
- `$childrenAsyncError`


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


## Debouncing

It's always a good idea to debounce asynchronous functions that rely on user input. You can configure this both globally and at the property level.

```js
// global configuration
Vue.use(VueAsyncProperties, {
	// if the value is just a number, it's used as the wait time
	debounce: 500,

	// or ...
	// you can pass an object for more complex situations
	debounce: {
		wait: 500,

		// these are the same options used in lodash debounce
		// https://lodash.com/docs/#debounce
		leading: false, // default
		trailing: true, // default
		maxWait: null, // default
	}
})

// property level configuration
new Vue({
	data: {
		searchQuery: ''
	},
	asyncComputed: {
		searchResults: {
			endpoint: '/search/:searchQuery',
			// this will be 1000 instead of the default globally configured 500
			debounce: {
				wait: 1000,
				maxWait: 3000
			}
		}
	}
})
```


## Lazy Requests

If you don't want the requests to go out immediately when the component is created for the first time, but instead to wait for a model change or a `prop$refresh` call, set the lazy option to true at the property level.

```js
new Vue({
	props: ['articleId'],
	asyncData: {
		article: {
			lazy: true
			// won't be triggered until article$refresh is called
			endpoint: '/articles/:articleId',
		}
	},

	data: {
		searchQuery: ''
	},
	asyncComputed: {
		searchResults: {
			lazy: true
			// won't be triggered until searchQuery changes
			endpoint: '/search/:searchQuery',
		}
	}
})
```


## Transformation Functions

Pass a `transform` function if you have some processing you'd always like to do with request results. **Note:** this function will only be called if a request is actually made.

```js
new Vue({
	props: ['articleId'],
	asyncData: {
		article: {
			endpoint: '/articles/:articleId',
			transform(result) {
				// this is the default,
				// which simply returns the data value from result
				return result.data
			}
		}
	}
})
```


## Error Handling

You can set up error handling pipelines, either globally (maybe you have some sort of notification tray or alerts), or at the property level.

```js
Vue.use(VueAsyncProperties, {
	errorHandler(error) {
		Notification.error({ title: "error", message: error.message })
	}
})

new Vue({
	props: ['articleId'],
	asyncData: {
		article: {
			endpoint: '/articles/:articleId',

			// this flag causes this local errorHandler to be the only one called
			// so the global handler WON'T be called
			errorHandlerTakeover: true,
			errorHandler(error) {
				this.doErrorStuff(error)
			}
		}
	}
})
```


## Full Urls

You can fully specify a endpoint if you're using a different one than the `baseURL`. Any endpoint that has `http://` or `https://` in it will be used as the full endpoint.

```js
Vue.use(VueAsyncProperties, {
	baseURL: 'http://example.com/v1/'
})

new Vue({
	props: ['articleId'],
	// this will go out to http://randomsocial.com/articles/:articleId
	// and ignore the example.com endpoint
	asyncData: {
		article: 'http://randomsocial.com/articles/:articleId'
	}
})
```

## Events

```js
Vue.use(VueAsyncProperties, {
	errorHandler, // global error handler
	emitEvents: true, // if you want to have all async components emit all events
	globalFlags: true // default 
})
```









```js
import VueAsyncProperties from 'vue-async-properties'

Vue.use(VueAsyncProperties, {
	baseURL: 'http://example.com/v1/',
	debounce: 500, // if the passed in value is a number and not an object, it is used as the wait value
	debounce: {
		delay: 500,
		leading: false, // default
		trailing: true, // default,
		wait: false, // this will make the component not invoke immediately on creation, but wait for interaction of some sort
	},
	// the plugin will automatically try this.$http and this.axios
	http: thingLikeAxios,
	http: {
		endpoint: randomLibrary.getResource
		// etc for article, put, patch, delete
	},
	errorHandler, // global error handler
	emitEvents: true, // if you want to have all async components emit all events
	metaNameFunction(propName, metaName) {
		// the meta properties can be named whatever you want, 
		return `${propName}__${capitalize(metaName)}`
	},
	globalFlags: true // default 
})


// these global options and some helper functions can 
```

events could be emitted for things like loading and dones and errors





```js
new Vue({
	props: ['articleId'],
	// data creates an empty at creation
	// then triggers the method to request at mount
	asyncData: {
		// if the value either is a string or returns a string, it will be treated as an api endpoint.
		// perhaps this sort of thing shouldn't be allowed in data? since it's assumed there's no reactivity?
		// maybe only things accessible in this.$props should be allowed? and perhaps even reactively?
		article: '/article/:articleId',

		// any term prefixed with a colon `:` in these strings will be replaced with whatever this.$props.thing is
		article() { return `/article/:articleId/${filterString}` }

		article: {
			// if there's a protocol (http), the baseURL isn't used
			url: 'http://example.com/v2/article/',
			url: '/article/',
			url: {
				endpoint: '/article/',
				verb: 'article'
			},
			get() {
				// return a promise
				return this.$http.get(customPathFunction())
			},

			transform(result) {
				// a function that automatically receives the result and transforms it
				// the default simply takes the data value off result
				return result.data
			}


			

			validate(payload) {
				// a function that ensures the outgoing thing is correct, possibly changes things
				// the default simply forwards the payload unchanged
				// raise an error if something is wrong and the result shoudn't go out? maybe just return falsy?
				return payload
			}



			error, // local error handler, could be called *in addition* to global one

			default: articleObject,
			// we give them a $get method
			lazy: true,
			// by default your thing will be replaced completely by the results of the request
			merge: true // if both the result and the default are objects, this option can basically say to use the default merge strategy (lodash) to replace any nil values in the default with whatever exists in the result
			merge: _.merge, // a custom merging function
			// has signature (key, oldValue, newValue, oldObj, newObj)

			emitEvents: true // this property will emit events
		},
		emitEvents: true // this component will emit all events
	},
	// computed is truly reactive
	// this is probably the better option for things that watch route passed props or things like that that can change
	asyncComputed: {
		searchResults: {
			// debounces only apply to the watchers
			// the request is always made immediately on creation of the component otherwise
			debounce: 750,
			// this can allow them to not make the request when the component is first initialized
			lazy: true

			// wipes out the value while a request is being made
			clearAtLoading: true
			// or while the value's been touched
			clearAtPending: true
		}
	}
})
```







`asyncResource`: this would allow the creation of writable async resources, rather than being get only.

would have properties like `prop$get` `prop$update` `prop$delete` for individuals, `prop$insert` for collections

```js
new Vue({
	asyncResource: {
		// assumed to be a collection (static string without any replacement from component)
		article: '/articles/'
		// assumed to be an individual (replacement from component)
		article: '/articles/:articleId'

		// can have type of collection or individual
		// collection
		// get (with filter), insert, delete

		// get (only one), update, delete
	}
})
```

// assumes article verb
			set: '/article/:articleId'
			set: {
				endpoint: '/article/:articleId',
				verb: 'PATCH',
				// by default this will simply set the thing to be whatever you passed in,
				// but this option will perform the get you've provided right after
				getAfter: true,
				// and this one will set the data of the response as the new value
				replaceWithData: true,
			}
			set() {
				// return a promise
				return this.$http.article(customPathFunction(), customDataFunction())
			},