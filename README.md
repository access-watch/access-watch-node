Access Watch Node library [![Build Status](https://travis-ci.org/access-watch/access-watch-node.svg?branch=master)](https://travis-ci.org/access-watch/access-watch-node) [![Coverage Status](https://coveralls.io/repos/github/access-watch/access-watch-node/badge.svg?branch=master)](https://coveralls.io/github/access-watch/access-watch-node?branch=master)
-------------------------

A nodejs implementation for logging and analysing web traffic using the
AccessWatch service. This library provides the utilities for communication with
the AccessWatch service. 

In case there is no implementation for your configuration you can build your own
using this library directly. For Express and Hapi plugins check out
[access-watch-middleware](https://github.com/access-watch/access-watch-middleware) and 
[access-watch-hapi](https://github.com/access-watch/access-watch-hapi)
respectively.

## Usage ##

```
  npm install --save access-watch
```

For example code, see the referenced plugins mentioned above.

If the node application is behind a reverse proxy, it should set forwarded headers which
must specified to AccessWatch on instantiation. Typically the predefined
[`AccessWatch.fwdHeaders`](./api.md#AccessWatch.fwdHeaders) can be used. 

See [API documentation](./api.md) for details.

## Contributing ##

- Before doing any work, always open an issue. 
- Before commiting any code, always make sure `npm test` and `npm run lint`
  passes.

