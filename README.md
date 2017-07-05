# vue-async-everything

**Smart asynchronous data and computed properties for vue components.**


## **This package is incomplete, and still under active development.**

---

This package makes dealing with asynchronous data directly in Vue components completely simple and flexible.

The basic useage looks like this.

```js
// main.js
import Vue from 'vue'

// simplest if you use axios integrated with vue
import axios from 'axios'
import VueAxios from 'vue-axios'
Vue.use(VueAxios, axios)

import VueAsyncEverything from 'vue-async-everything'
Vue.use(VueAsyncEverything, {
	// this could set the default url on the axios instance as well
	apiRoot: 'http://example.com/v1/',
	debounce: 2000,
})
```

Now `asyncData` and `asyncComputed` options are available on your components:

```js
// in vue component
new Vue({
	name: 'editarticle',
	props: ['articleId'],
	asyncData: {
		// this will use the articleId prop
		// and when the component is created
		// make a request to http://example.com/v1/articles/:articleId
		article: '/articles/:articleId'
	},
	asyncComputed: {
		// is this legal or a good idea? should we even allow the pure string system in computed?
		articleContentFeedback: '/articles/check?c=:article.content',
		articleContentFeedback() {
			// if this function returns a string, it will be used as the endpoint
			return `/articles/check?c=${this.article.content}`
			// whenever article.content changes, a request (debounced by 2000 miliseconds) will be made
		}
	}
})
```

```jade
// in template
#article
	input(v-model="article.title")

	textarea(v-model="article.content")

	span.content-feedback(v-if="articleContentFeedback$pending") waiting for you to finish changing the content...
	span.content-feedback(v-else-if="articleContentFeedback$loading") asking the server if your content's okay...
	span.content-feedback.is-error(v-else-if="articleContentFeedback$error") there was an error while asking the server

	span.content-feedback(v-if="articleContentFeedback") {{articleContentFeedback}}

	// does a POST request to /articles/:articleId
	input(type="submit", @click="article$push") Save your Article
```

As you can see, everything's handled for you.


## Difference between `asyncData` and `asyncComputed`?

`asyncData`: 

- only runs once automatically, during the components `onCreated` hook
- can only rely on component props, not data
- must be manually pulled or pushed, with `propName$pull` and `propName$push`

`asyncComputed`:

- runs automatically every time any of the things it depends on changes (with debounce)
- can rely on any component data, or even computed properties (even other async properties!)


## `asyncData`

```js
new Vue({
	props: ['articleId'],
	asyncData: {
		// The pure string version.
		// this will be combined with the `apiRoot`
		article: '/articles/:articleId',

		article: 
	}
})



```





When you create an async property on `asyncData` or `asyncComputed`, you can pass in the following:

- a string (which will be treated as the endpoint for both pushes and pulls)
- a function that returns a string (which will be used as the push and pull endpoint)
- a function that returns a promise (which will be the pull promise. this makes pushing impossible, and `propName$push` won't be added to your component)
- an options object

This options object is very flexible, and can change a large number of things.



## Different naming for Meta Properties

The default naming strategy for the meta properties like "loading" and "pending" is `propName$metaName`. You may prefer a different naming strategy, and you can pass a function for a different one in the global config.

```js
Vue.use(VueAsyncEverything, {
	// for "article" and "loading"
	// "article__Loading"
	metaNameFunction: (propName, metaName) => `${propName}__${capitalize(metaName)}`,

	// or ...
	// whatever you want!

	// "$loading_article"
	metaNameFunction: (propName, metaName) => '$' + metaName + '_' + propName,

	// the default is:
	metaNameFunction: (propName, metaName) => `${propName}$${metaName}`,
})
```


## Defaults and Merging



## Debouncing

It's always a good idea to debounce asynchronous functions that rely on user input. You can configure this both globally and at the property level.

```js
// global configuration
Vue.use(VueAsyncEverything, {
	// if the value is just a number, it's used as the delay time
	debounce: 500,

	// you can pass an object for more complex situations
	debounce: {
		delay: 500,

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
			get: '/search/:searchQuery',
			// this will be 1000 instead of the default globally configured 500
			debounce: 1000
		}
	}
})
```

Debouncing can also applied to `asyncData` to ensure against double clicks of push or pull buttons or whatever, and leading is automatically set to true.


## Lazy Requests

If you don't want the requests to go out immediately when the component is created for the first time, but instead to wait for some user interaction, set the lazy option to true at the property level.

```js
new Vue({
	props: ['articleId'],
	asyncData: {
		article: {
			endpoint: '/articles/:articleId',
			// won't be triggered until article$pull or article$push is called
			lazy: true
		}
	},

	data: {
		searchQuery: ''
	},
	asyncComputed: {
		searchResults: {
			endpoint: '/search/:searchQuery',
			// won't be triggered until searchQuery changes
			lazy: true
		}
	}
})
```


## http setup (axios and apiroot)
## transforms and validators
## error handlers

## Full Urls

You can fully specify a url if you're using a different one than the `apiRoot`. Any url that has `http://` or `https://` in it will be used as the full url.

```js
Vue.use(VueAsyncEverything, {
	apiRoot: 'http://example.com/v1/'
})

new Vue({
	props: ['articleId'],
	// this will go out to http://randomsocial.com/articles/:articleId and ignore the example.com url
	asyncData: {
		article: 'http://randomsocial.com/articles/:articleId'
	}
})
```












```js
import VueAsyncEverything from 'vue-async-everything'

Vue.use(VueAsyncEverything, {
	apiRoot: 'http://example.com/v1/',
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
		get: randomLibrary.getResource
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

```jade
p(v-if="article$loading") // if a request is literally in flight
p(v-if="article$pending") // if a request is *queued*, but not yet sent
p(v-if="article$error") // the error of the last request
p(v-if="article$default") // the default value you passed, if any

a(@click="article$now") // immediately flush the invocations
a(@click="article$cancel") // cancel all delayed invocations

p(v-if="$asyncLoading") // component wide
p(v-if="$asyncPending") // component wide
p(v-if="$asyncError") // component wide

p(v-if="$globalAsyncLoading") // global (refers to $root)
p(v-if="$globalAsyncPending") // global (refers to $root)
p(v-if="$globalAsyncError") // global (refers to $root)

p(v-if="$childrenAsyncLoading")
p(v-if="$childrenAsyncPending")
p(v-if="$childrenAsyncError")


// only for asyncData
a(@click="article$pull") // perform the request again
a(@click="article$push") // perform the set request
```



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
			// if there's a protocol (http), the apiRoot isn't used
			get: 'http://example.com/v2/article/',
			get: '/article/',
			get: {
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

			validate(payload) {
				// a function that ensures the outgoing thing is correct, possibly changes things
				// the default simply forwards the payload unchanged
				// raise an error if something is wrong and the result shoudn't go out? maybe just return falsy?
				return payload
			}



			error, // local error handler, could be called *in addition* to global one

			default: articleObject,
			// we give them a $pull method
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
			wait: true

			// wipes out the value while a request is being made
			clearAtLoading: true
			// or while the value's been touched
			clearAtPending: true
		}
	}
})
```
