Access Watch Node library
-------------------------

A nodejs implementation for logging and analysing web traffic using the
AccessWatch service. This library provides the utilities for communication with
the AccessWatch service. 

### Usage ###

*If you are using Express or Hapi, you might want to use their
respective implementations which are based on this.* In case there is no
implementation for your configuration you can build your own using this library
directly. 

If the node application is behind a reverse proxy, to correctly log the request,
extra headers should be set and specified for the instance.
Typically the predefined `AccessWatch.proxyHeaders` can be used. It expects the
headers `X-Forwarded-For`, `X-Forwarded-Proto` and `X-Forwarded-Host` to be set.

See [API documentation](./api.md) for details.

### Contributing ###

- Before doing any work, always open an issue. 
- Before commiting any code, always make sure `npm test` and `npm run lint`
  passes.

