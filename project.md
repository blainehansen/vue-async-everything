[vue-async-properties]
async vuex

asyncState
- document interface
-
- test cases

asyncGetters
- document interface

[AsyncVuex]
- can have async computed (asyncGetter?)
-- takes either a getter or mutations as watchers
- can have async data (asyncState?)
-- has a single barrier watcher to compute async datas
-- can accept a function that calls a 'dispatchAll' method

future features
- has `$offset` variable that allows them to use only one route
- therefore has other configurable methods to make sure that behaves properly


async methods
- spec
- returns "results", so you can await
- places "results" in `method$results`
- has loading and error

features
- X allow for function or object in data
- X customizable meta naming
- X defaults
- X transformations
- X returning values
- X debouncing
- X lazy/eager
- X error handling
- X allow error and transform to use component `this`
- X write tests for error and transform
- merging
- component-wide flags?
