'use strict';

/**
 * Copyright (c) 2016 Access Watch GmbH
 */

/**
 * @interface AccessWatch.Cache
 * The AccessWatch instance requires a cache that implements the functions
 * `get`, `set`, and `drop` or `del`. The module has been built with
 * catbox and node-cache-manager in mind. Easiest is thus to use a
 * `Catbox.Policy` or cache-manager interface but any kind of cache
 * that implements this interface will be do.
 *
 * @see https://github.com/hapijs/catbox#api-1
 * @see https://github.com/BryanDonovan/node-cache-manager
 */

/**
 * Retrieve an item from the cache engine if found
 * @function
 * @name AccessWatch.Cache#get
 * @param {string} id
 * @param {function} callback node style callback
 */

/**
 * Store an item in the cache for a certain length of time
 * @function
 * @name AccessWatch.Cache#set
 * @param {string} id
 * @param {string|object} value
 * @param {function} callback node style callback
 */

/**
 * Remove an item from cache can also be named `del`
 * @function
 * @name AccessWatch.Cache#drop|del
 * @alias AccessWatch.Cache#del
 * @param {string} id
 * @param {function} callback node style callback
 */

const promisify = require('./promisify');

const crypto = require('crypto');
const request = promisify(require('request'));

const API_BASE = 'https://access.watch/api/1.0';

// Headers that we'll use to create a signature of a request
const SIGNATURE_HEADERS = [
  'user-agent',
  'accept',
  'accept-charset',
  'accept-language',
  'accept-encoding',
  'from',
  'dnt',
];

/**
 * If the server runs behind a reverse proxy such as nginx or haproxy,
 * http headers should provide info about the forwarded request. This maps
 * header properties for getting request info using either a function or the
 * header name
 *
 * @typedef AccessWatch.ForwardedHeaders
 * @type {object}
 * @property {string|function} host Header field for the forwarded Host header
 * or a `function(headers) -> string` returning the value
 * @property {string|function} scheme Header field for the forwarded protocol or
 * a `function(headers) -> string` returning the value
 * @property {string|function} address Header field for the forwarded ip address
 * or a `function(headers) -> string` returning the value
 */

/**
 * Handles logging, caching and checking for blocked requets.
 */
class AccessWatch {

  /**
   * @param {object} config
   * @param {string} config.apiKey AccessWatch api key
   * @param {AccessWatch.Cache} config.cache A cache for storing sessions.
   * @param {AccessWatch.ForwardHeaders} [config.fwdHeaders] Specify custom
   * proxy header names. It is necessary to set this if the server is behind a
   * reverse proxy. Use pass a custom object or the predefined
   * `AccessWatch.fwdHeaders` which should sufficient for most cases.
   * @param {string} [config.apiBase] A custom api base url, may be useful for
   * testing and debugging.
   */
  constructor(config) {
    if (!config.cache) {
      throw new Error('node-access-watch missing required option: cache');
    }

    if (!config.apiKey) {
      throw new Error('node-access-watch missing required option: apiKey');
    }

    this.apiKey = config.apiKey;
    this.apiBase = config.apiBase || API_BASE;
    this.fwdHeaders = config.fwdHeaders || {};

    this.cache = {
      get: promisify(config.cache.get, config.cache),
      set: promisify(config.cache.set, config.cache),
      drop: promisify(config.cache.drop || config.cache.del, config.cache)
    };
  }

  /**
   * Make sure the apiBase and apiKey are correctly set up. Probably done every
   * time a server launches
   * @return {Promise} Rejects unless a 200 is returned from the api
   */
  hello() {
    return request(this.apiBase + '/hello', {
      headers: {
        'Api-Key': this.apiKey
      }
    }).then(res => {
      if (res.statusCode !== 200) {
        return Promise.reject(new Error(res.body.toString()));
      }

      return res;
    });
  }

  /**
   * Look up a Session from cache or api with a node request
   *
   * @param {http.IncomingMessage} req A raw node request
   * @param {boolean} noCache Don't use cache
   * @return {Promise}
   */
  lookupSession(req, noCache) {
    const identity = this.requestSignature(req);
    let result = Promise.resolve(null);

    if (!noCache) {
      result = this.cache.get(identity);
    }

    return result.then(data => {
      if (data) {
        // cache hit, we're done!
        return data;
      }

      return request(this.apiBase + '/identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': this.apiKey,
        },
        body: JSON.stringify({
          address: req.socket.remoteAddress,
          headers: req.headers
        })
      })
      .then(res => {
        if (res.headers['content-type'] === 'application/json') {
          return JSON.parse(res.body);
        } else {
          return Promise.reject('Expected a json body from API');
        }
      })
      .then(
        session => {
          this.cache.set(identity, session);
          return session;
        }
      );
    });
  }

  /**
   * Check if a request should be blocked by checking for the requestSignature
   * in the cache.
   * NOTE: If its a cache miss, default will be `false` since we should never
   * add extra latency to the response times or making it dependent on the
   * access watch api service.
   *
   * @param {http.IncomingMessage} req A raw node request
   * @return {Promise<boolean>}
   */
  checkBlocked(req) {
    return this.cache.get(this.requestSignature(req)).then(
      session => !!(session && session.blocked)
    ).catch(_ => Promise.resolve(false));
  }

  /**
   * Send request and response data to AccessWatch API.
   *
   * @param {http.IncomingMessage} req A raw node request
   * @param {http.ServerResponse} res A raw node response
   * @return {Promise}
   */
  log(req, res) {
    // Get any forwarded info from the request headers that should override the
    // default.
    const forwarded = Object.keys(this.fwdHeaders).reduce(
      (acc, key) => {
        acc[key] = getFwdHeader(this.fwdHeaders[key], req.headers);
        return acc;
      }, {}
    );

    return request({
      method: 'POST',
      url: this.apiBase + '/log',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': this.apiKey
      },
      body: JSON.stringify({
        time: new Date().toISOString(),
        address: forwarded.address || req.socket.remoteAddress,
        request: {
          // No standardized way of forwarding http version
          protocol: 'HTTP/' + req.httpVersion,
          method: req.method,
          scheme: forwarded.scheme || (req.socket.encrypted ? 'https' : 'http'),
          // Exclude port number if present.
          host: (forwarded.host || req.headers['host']).split(':')[0],
          // Passing port if its a non-standard one. Otherwise backend assumes
          // 80 or 443.
          port: (forwarded.host || req.headers['host']).split(':')[1],
          url: req.url,
          headers: req.headers
        },
        response: {
          status: res.statusCode
        },
      })
    });
  }

  /**
  * An identifier hash to associate a certain type of requests with a Session.
  * Simply a combination of the address and some headers.
  *
  * @param {http.IncomingMessage} req A raw node request
  * @return {string}
  */
  requestSignature(req) {
    const sigHeaders = SIGNATURE_HEADERS.reduce((acc, header) => {
      const h = req.headers[header];
      if (h) {
        acc[header] = h;
      }
      return acc;
    }, {});

    const sigAddress = getFwdHeader(this.fwdHeaders.address, req.headers) ||
      req.socket.remoteAddress;

    return crypto
      .createHash('md5')
      .update(sigAddress + JSON.stringify(sigHeaders))
      .digest('hex');
  }
}

/**
 * The standard headers that a reverse proxy should set.
 *
 * @type {AccessWatch.ForwardHeaders}
 */
AccessWatch.fwdHeaders = {
  host: 'x-forwarded-host',
  scheme: 'x-forwarded-proto',
  address: headers => headers['x-forwarded-for'].split(/,|\ /)[0]
};

// get any forwarded header using a fwdHeaders property
const getFwdHeader = (fwdHeadersProp, headers) => {
  // fwdHeaders props have two different types
  if (typeof fwdHeadersProp === 'function') {
    return fwdHeadersProp(headers);
  } else if (typeof fwdHeadersProp === 'string') {
    return headers[fwdHeadersProp];
  }

  // property is not set in `headers`
  return null;
};

module.exports = AccessWatch;
