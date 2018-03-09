# vue-async-properties

> Vue Component Plugin for asynchronous data and computed properties.

**Proudly sponsored by Marketdial**

<p>
<a href="http://marketdial.com">
<img src="https://cdn.rawgit.com/blainehansen/vue-async-properties/master/marketdial-logo.svg" alt="MarketDial logo" title="MarketDial" width="35%">
</a>
</p>

---

```js
new Vue({
  props: ['articleId'],

  asyncData: {
    article() {
      return this.axios.get(`/articles/${this.articleId}`)
    }
  },

  asyncComputed: {
    searchResults: {
      get() {
        return this.axios.get(`/search/${this.query}`)
      },
      watch: 'query'
      debounce: 500,
    }
  }
})
```
```pug
#article(
  v-if="!article$error",
  :class="{ 'loading': article$loading }")

  h1 {{article.title}}

  .content {{article.content}}

#article(v-else)
  | There was an error while loading the article!
  | {{article$error.message}}

button(@click="article$refresh")
 | Refresh the Article


input.search(v-model="query")
span(v-if="searchResults$pending")
  | Waiting for you to stop typing...
span(v-if="searchResults$error")
  | There was an error while making your search!
  | {{searchResults$error.message}}

#search-results(:class="{'loading': searchResults$loading}")
  .search-result(v-for="result in results")
    p {{result.text}}
```

Has convenient features for:

- loading, pending, and error flags
- ability to refresh data
- debouncing, with `cancel` and `now` functions
- defaults
- response transformation
- error handling


The basic useage looks like this.

```bash
npm install --save vue-async-properties
```

```js
// main.js
import Vue from 'vue'

// you can use whatever http library you prefer
import axios from 'axios'
import VueAxios from 'vue-axios'
Vue.use(VueAxios, axios)

Vue.axios.defaults.baseURL = '... whatever ...'

import VueAsyncProperties from 'vue-async-properties'
Vue.use(VueAsyncProperties)
```

Now `asyncData` and `asyncComputed` options are available on your components. What's the difference between the two?

- `asyncData` only runs once automatically, during the component's `onCreated` hook.
- `asyncComputed` runs automatically every time any of the things it depends on changes, with a default debounce of `1000` milliseconds.


## `asyncData`

You can simply pass a function that returns a promise.

```js
// in component
new Vue({
  props: ['articleId'],
  asyncData: {
    // when the component is created
    // a request will be made to
    // http://api.example.com/v1/articles/articleId
    // (or whatever base url you've configured)
    article() {
      return this.axios.get(`/articles/${this.articleId}`)
    }
  },
})
```
```pug
//- in template (using the pug template language)
#article(
  v-if="!article$error",
  :class="{ 'loading': article$loading }")

  h1 {{article.title}}

  .content {{article.content}}

#article(v-else)
  | There was an error while loading the article!
  | {{article$error.message}}

button(@click="article$refresh")
  | Refresh the Article
```


## `asyncComputed`

You have to provide a `get` function that returns a promise, and a `watch` parameter that's either a [string referring to a property on the vue instance, or a function that refers to the properties you want tracked](https://vuejs.org/v2/api/#vm-watch).

```js
// in component
new Vue({
  data: {
    query: ''
  },
  asyncComputed: {
    // whenever query changes,
    // a request will be made to
    // http://api.example.com/v1/search/articleId
    // (or wherever)
    // debounced by 1000 miliseconds
    searchResults: {
      // the function that returns a promise
      get() {
        return this.axios.get(`/search/${this.query}`)
      },

      // the thing to watch for changes
      watch: 'query'
      // ... or ...
      watch() {
        // do this if you need to watch multiple things
        this.query
      }
    }
  }
})
```
```pug
//- in template (using the pug template language)
input.search(v-model="query")
span(v-if="searchResults$pending")
  | Waiting for you to stop typing...
span(v-if="searchResults$error")
  | There was an error while making your search!
  | {{searchResults$error.message}}

#search-results(:class="{'loading': searchResults$loading}")
  .search-result(v-for="result in results")
    p {{result.text}}
```

You might be asking "Why is the `watch` necessary? Why not just pass a function that's reactively watched?" Well, in order for Vue to reactively track a function, it has to invoke that function up front when you create the watcher. Since we have a function that performs an expensive async operation, which we also want to debounce, we can't really do that.

## Meta Properties

Properties to show the status of your requests, and methods to manage them, are automatically added to the component.

- `prop$loading`: if a request is currently in progress
- `prop$error`: the error of the last request
- `prop$default`: the default value you provided, if any

**For `asyncData`**

- `prop$refresh()`: perform the request again

**For `asyncComputed`**

- `prop$pending`: if a request is *queued*, but not yet sent because of debouncing
- `prop$cancel()`: cancel any debounced requests
- `prop$now()`: immediately perform the latest debounced request


## Debouncing

It's always a good idea to debounce asynchronous functions that rely on user input. You can configure this both globally and at the property level.

By default, anything you pass to `debounce` only applies to `asyncComputed`, since it's the only one that directly relies on input.

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
      // this will be 1000
      // instead of the globally configured 500
      debounce: 1000
    }
  }
})
```

It is also allowed to pass `null` to debounce, to specify that no debounce should be applied. If this is done, `property$pending`, `property$cancel`, and `property$now` will not exist. The same rules that apply to other options holds here; the global setting will set all components, but it can be overridden by the local settings.


```js
// no components will debounce
Vue.use(VueAsyncProperties, {
  debounce: null
})

// just this component won't have a debounce
new Vue({
  asyncComputed: {
    searchResults: {
      get() { /* ... */ },
      watch: '...'
      debounce: null

      // this however would debounce,
      // since the local overrides the global
      debounce: 500
    }
  }
})
```

This should only be done when the `asyncComputed` only watches values that aren't changed frequently by the user, otherwise a huge number of requests will be sent out.


### `watchClosely`

Sometimes the method should debounce when some values change (things like key inputs or anything that might change rapidly), and *not debounce* when other values change (things like boolean switches that are more discrete, or things that are only changed programmatically).

For these situations, you can set up a separate watcher called `watchClosely` that will trigger an immediate, undebounced invocation of the `asyncComputed`.

```js
new Vue({
  data: {
    query: '',
    includeInactiveResults: false
  },
  asyncComputed: {
    searchResults: {
      get() {
        if (this.includeInactiveResults)
          return this.axios.get(`/search/all/${this.query}`)
        else
          return this.axios.get(`/search/${this.query}`)
      },

      // the normal, debounced watcher
      watch: 'query',

      // whenever includeInactiveResults changes,
      // the method will be invoked immediately
      // without any debouncing
      watchClosely: 'includeInactiveResults'
    }
  }
})
```

Obviously, if you pass `debounce: null`, then `watchClosely` will be ignored, since invoking immediately without any debounce is the default behavior.

Also, if you only pass `watchClosely`, that will automatically infer that debouncing should never be done.

```js
new Vue({
  data: {
    showOldPosts: false
  },
  asyncComputed: {
    searchResults: {
      // a change to showOldPosts
      // should always immediately
      // retrigger a request
      watchClosely: 'showOldPosts',
      get() {
        if (this.showOldPosts) return this.axios.get('/posts')
        else return this.axios.get('/posts/new')
      }
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
        // if you return null
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
        else
          return this.axios.get(`/articles/${this.articleId}`)
      },
      // this will be used if null or undefined
      // are returned either by the get method
      // or by the request it returns
      // or if there's an error
      default: {
        title: "Default Title",
        content: "Default Content"
      }
    }
  }
})
```



## Lazy and Eager

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
      watch: 'query',
      // will be triggered right away with 'initial query'
      eager: true // default 'false'
    }
  }
})
```


## Transformation Functions

Pass a `transform` function if you have some processing you'd always like to do with request results. This is convenient if you'd rather not chain `then` onto promises. You can provide this globally and locally.

**Note:** this function will only be called if a request is actually made. So if you directly return a value rather than a promise from your `get` function, `transform` won't be called.

```js
Vue.use(VueAsyncProperties, {
  // this is the default
  transform(result) {
    return result.data
  }

  // ... or ...
  // doing this will prevent any transforms
  // from being applied in any properties
  transform: null
})

new Vue({
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

## Pagination

Normal pagination is easy with this library, you just need to use some sort of limit and offset in your requests.

With `asyncData`:

```js
new Vue({
  data() {
    return {
      pageSize: 10,
      pageNumber: 0
    }
  },
  asyncData: {
    posts() {
      return this.axios.get(`/posts`, {
        params: {
          limit: this.pageSize,
          offset: this.pageSize * this.pageNumber,
        }
      })
    }
  },
  methods: {
    goToPage(page) {
      this.pageNumber = page
      this.posts$refresh()
    }
  }
})
```

... and with `asyncComputed`:

```js
new Vue({
  data() {
    return {
      pageSize: 10,
      pageNumber: 0
    }
  },
  asyncComputed: {
    posts: {
      get() {
        return this.axios.get(`/posts`, {
          params: {
            limit: this.pageSize,
            offset: this.pageSize * this.pageNumber,
          }
        })
      },
      watchClosely: 'pageNumber'
    }
  }
})
```


## Load More

Doing a "load more" is interesting though, since you need to append new results onto the old ones.

To make a load more situation, pass a `more` option to your property, giving a method that gets more results to add to the old ones. A `$more` method will be added to your component that you can call whenever you want to get more results.


```js
const pageSize = 5
new Vue({
  data() {
    return { filter: '' }
  },

  asyncData: {
    posts: {
      get() {
        return this.axios.get(`/posts/${this.filter}`, {
          params: {
            limit: pageSize,
          }
        })
      },

      // this method will get results that will be appended to the old ones
      // it's triggered by the `posts$more` method
      more() {
        return this.axios.get(`/posts/${this.filter}`, {
          params: {
            limit: pageSize,
            offset: this.posts.length,
          }
        })
      }

      // since sometimes the way you add new results
      // to the property won't be a basic array concat
      // you can pass a static concat method that
      // returns a collection with the new results added to it
      more: {
        // this is the default
        concat: (posts, newPosts) => posts.concat(newPosts),
        get() {
          const pageSize = 5
          return this.axios.get(`/posts/${this.filter}`, {
            params: {
              limit: pageSize,
              offset: this.posts.length,
            }
          })
        }
      }

    }
  }
})
```

Here's an example template:

```pug
input.search(v-model="filter")

.posts
  .post(v-for="post in posts") {{ post.title }}

button.load-more(@click="posts$more") Get more posts
```

For `asyncComputed`, the `watch` and `watchClosely` parameters will still trigger a complete reset of the collection. Only the `$more` method appends new results.

```js
const pageSize = 5
new Vue({
  data() {
    return { filter: '' }
  },

  asyncComputed: {
    posts: {

      get() {
        return this.axios.get(`/posts/${this.filter}`, {
          params: {
            limit: pageSize,
          }
        })
      },
      watch: 'filter',

      more() {
        return this.axios.get(`/posts/${this.filter}`, {
          params: {
            limit: pageSize,
            offset: this.posts.length,
          }
        })
      }

    }
  }
})
```

All the other options like `transform`, `error`, `debounce`, will still work the same.


### `$more` Returns Last Response

If you need to do some logic based on what the last load more request returned, you can wrap the `$more` method and get the last response the `$more` received.


```js
const pageSize = 10
new Vue({
  data() {
    return { noMoreResults: false }
  },

  asyncData: {
    posts: {
      get() {
        return this.axios.get(`/posts/${this.filter}`, {
          params: {
            limit: pageSize,
          }
        })
      },

      more() {
        return this.axios.get(`/posts/${this.filter}`, {
          params: {
            limit: pageSize,
            offset: this.posts.length,
          }
        })
      }
    }
  },
  async moreHandler() {
    let lastResponse = await this.posts$more()

    this.noMoreResults = lastResponse.data.length < pageSize
  }
})
```

### Watching For Reset Events

Since you might need to be notified when the collection resets based on a `watch` or `watchClosely`, you can watch for a `propertyName$reset` event. It passes the response that came for the reset.

```js
const pageSize = 5
new Vue({
  data() {
    return {
      noResultsReturned: false
    }
  },

  asyncData: {
    posts: {
      get() {
        return this.axios.get(`/posts/${this.filter}`, {
          params: {
            limit: pageSize,
          }
        })
      },

      more() {
        return this.axios.get(`/posts/${this.filter}`, {
          params: {
            limit: pageSize,
            offset: this.posts.length,
          }
        })
      }
    }
  },

  created() {
    // whenever a watch or watchClosely resets the collection,
    // it will $emit this event
    this.$on('posts$reset', (resettingResponse) => {

      // here you can perform whatever logic
      // you need to with the resetttingResponse

      if (resettingResponse.data.length == 0) {
        this.noResultsReturned = true
      }

      this.resetScoller() // or whatever

    })
  }
})
```


## Error Handling

You can set up error handling, either globally (maybe you have some sort of notification tray or alerts), or at the property level.

```js
Vue.use(VueAsyncProperties, {
  error(error) {
    Notification.error({
      title: "error",
      message: error.message,
    })
  }
})

new Vue({
  asyncData: {
    article: {
      get() { /* ... */ },

      // this will override the error handler
      error(error) {
        this.doErrorStuff(error)
      }
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


### Different naming for Meta Properties

The default naming strategy for the meta properties like `loading` and `pending` is `propName$metaName`. You may prefer a different naming strategy, and you can pass a function for a different one in the global config.

```js
Vue.use(VueAsyncProperties, {
  // for "article" and "loading"
  // "article__Loading"
  meta: (propName, metaName) =>
    `${propName}__${myCapitalize(metaName)}`,

  // ... or ...
  // "$loading_article"
  meta: (propName, metaName) =>
    '$' + metaName + '_' + propName,

  // the default is:
  meta: (propName, metaName) =>
    `${propName}$${metaName}`,
})
```


## Contributing

This package has testing set up with [mocha](https://mochajs.org/) and [chai expect](http://chaijs.com/api/bdd/). Since many of the tests are on the functionality of Vue components, the [vue testing docs](https://vuejs.org/v2/guide/unit-testing.html) are a good place to look for guidance.

If you'd like to contribute, perhaps because you uncovered a bug or would like to add features:

- fork the project
- clone it locally
- write tests to either to reveal the bug you've discovered or cover the features you're adding (write them in the `test` directory, and take a look at existing tests as well as the mocha, chai expect, and vue testing docs to understand how)
- run those tests with `npm test` (use `npm test -- -g "text matching test description"` to only run particular tests)
- once you're done with development and all tests are passing (including the old ones), submit a pull request!
