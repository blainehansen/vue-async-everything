[AsyncVuex]
- asyncState
-- lazy
-- $refresh
- asyncGetter
-- takes either a getter or mutation/action names as watchers
-- eager
-- $pending
-- $now
-- $cancel
- both 
-- guard
-- $loading
-- transform
-- error
-- more and reset

[`1.0.0`]
- asyncMethods
- clean up `$more` with the `$offset` variable passed in to the get
- allow `more` option to just be the concat function, since we don't need a `more.get`
-- this can stand in for merging by allowing the concat to be anything
-- let them provide a `size` method, used to set the `$offset` passed in. this would give them flexibility for things like merge
- make debouncing option stricter, use `watch` and `watchClosely` to trigger off/on
- be stricter about what causes a reset to default. probably only `undefined` makes sense
- no more default transform
- add in the "pure string" version, with colon-prefix routes? To do this they have to provide an http method at the global level or the property level
- `mapAsync` methods to make binding these convenient


[asyncMethods]
- spec
- optional debounce
- just wraps a normal method with loading/pending/error/etc
- perhaps has global `$last` result
