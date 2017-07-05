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