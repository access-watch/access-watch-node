'use strict';
const AccessWatch = require('./');
const test = require('tape');
const nock = require('nock');
const cbFunc = (x, cb) => cb(null, x);
const mockCache = {};
mockCache.get = mockCache.set = mockCache.drop = cbFunc;

const getTestInstance = overrides => new AccessWatch(Object.assign({
  cache: mockCache,
  apiKey: 'test-instance-apikey'
}, overrides));

test('new AccessWatch(opts)', childTest => {
  childTest.plan(1);
  childTest.test('it throws when missing required options', t => {
    t.plan(2);

    t.throws(() => {
      new AccessWatch({
        //missing cache
        apiKey: 'valid'
      });
    });

    t.throws(() => {
      new AccessWatch({
        // missing apiKey
        cache: mockCache
      });
    });
  });
});

test('hello() checks the api key', childTest => {
  childTest.plan(2);

  childTest.test('it handles invalid key', t => {
    const aw = getTestInstance();

    nock(aw.apiBase)
      .get('/hello')
      .reply(401, 'error message');

    return aw.hello()
      .then(d => {
        return d;
      })
      .then(
        _ => t.fail()
      )
      .catch(err => {
        t.assert(err.message === 'error message');
        t.end();
      });
  });

  childTest.test('it handles valid key', t => {
    const aw = getTestInstance();

    nock(aw.apiBase)
      .get('/hello')
      .reply(200);

    return aw.hello()
      .then(_ => t.end())
      .catch(t.fail);
  });
});

test('checkBlocked(req) checks if a req should be blocked', childTest => {
  childTest.plan(2);

  const fakeReq = {
    socket: {
      remoteAddress: '1.2.3.4'
    },
    headers: {}
  };

  childTest.test('not blocked when miss cache', t => {
    t.plan(1);
    const aw = getTestInstance({
      cache: Object.assign({}, mockCache, {
        get: (identity, cb) => {
          cb(null, undefined);
        },
      })
    });

    aw.checkBlocked(fakeReq).then(isBlocked => {
      t.assert(isBlocked === false);
    }).then(_ => t.end()).catch(t.fail);
  });


  childTest.test('blocked when cached session is blocked', t => {
    const aw = getTestInstance({
      cache: Object.assign({}, mockCache, {
        get: (identity, cb) => cb(null, {blocked: true})
      })
    });

    aw.checkBlocked(fakeReq).then(isBlocked => {
      t.assert(isBlocked === true);
    }).then(_ => t.end()).catch(t.fail);
  });
});

test('lookupSession(req, noCache) find a session. cache and api', childTest => {
  childTest.plan(3);
  const mockSession = {a: 1};
  const fakeReq = {
    headers: {},
    socket: {
      remoteAddress: '1.2.3.4'
    }
  };

  childTest.test('without cache', t => {
    const aw = getTestInstance({
      cache: Object.assign({}, mockCache, {
        get: (identity, cb) => {
          // nothing in cache!
          t.pass();
          cb(null, undefined);
        },
        set: (identity, session, cb) => {
          t.same(session, mockSession, 'response should be cached');
          cb(null, 'ok');
        }
      })
    });

    nock(aw.apiBase)
      .post('/identity')
      .reply(200, JSON.stringify(mockSession), {
        'Content-Type': 'application/json'
      });

    aw.lookupSession(fakeReq)
      .then(session => {
        t.same(session, mockSession);
      })
      .then(_ => t.end())
      .catch(t.fail);
  });

  childTest.test('with cache', t => {
    const aw = getTestInstance({
      cache: Object.assign({}, mockCache, {
        get: (identity, cb) => {
          t.pass();
          cb(null, mockSession);
        },
        set: (identity, session, cb) => {
          t.same(session, mockSession, 'response should be cached');
          cb(null, 'ok');
        }
      })
    });

    nock(aw.apiBase)
      .post('/identity')
      .reply(() => {
        // api should not be touched when using cache!
        t.fail();
        return null;
      });

    const fakeReq = {
      headers: {},
      socket: {
        remoteAddress: '1.2.3.4'
      }
    };

    aw.lookupSession(fakeReq)
      .then(session => {
        t.same(session, mockSession);
      })
      .then(_ => {
        nock.cleanAll();
        t.end();
      })
      .catch(t.fail);
  });

  childTest.test('forced without cache', t => {
    const aw = getTestInstance({
      cache: Object.assign({}, mockCache, {
        get: (identity, cb) => {
          // dont use the cache!
          t.fail();
        },
        set: (identity, session, cb) => {
          t.pass();
          cb(null, 'ok');
        },
      })
    });

    nock(aw.apiBase)
      .post('/identity')
      .reply(200, JSON.stringify(mockSession), {
        'Content-Type': 'application/json'
      });

    aw.lookupSession(fakeReq, true)
      .then(session => {
        t.same(session, mockSession, 'response should be cached');
        t.end();
      })
      .catch(t.fail);
  });
});

test('log(req, res) logs a request and response', childTest => {
  childTest.plan(3);
  const fakeReq = {
    httpVersion: '999',
    headers: {
      host: 'localhost',
      'x-forwarded-for': '1.2.3.4, 2.2.2.2, 3.3.3.3',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'access.watch',
      'cookie': 'dont include me plz'
    },
    socket: {
      remoteAddress: '127.0.0.1',
      encrypted: false
    },
    url: '/some/url'
  };
  const fakeRes = {
    statusCode: 123
  };

  childTest.test('with fwdHeaders', t => {
    const aw = getTestInstance({
      fwdHeaders: AccessWatch.fwdHeaders
    });

    nock(aw.apiBase)
      .post('/log')
      .reply((uri, body) => {
        t.assert(body.address === '1.2.3.4');
        t.assert(body.request.protocol === 'HTTP/999');
        t.assert(body.request.scheme === 'https');
        t.assert(body.request.host === 'access.watch');
        t.assert(body.request.url === '/some/url');
        t.assert(body.request.headers['cookie'] === undefined);
        t.same(
          Object.keys(body.request.headers).length,
          Object.keys(fakeReq.headers).length - 1 // cookie header was omitted
        );
        t.assert(body.response.status === 123);
        return 200;
      });

    return aw.log(fakeReq, fakeRes)
      .then(_ => t.end())
      .catch(t.fail);
  });

  childTest.test('it uses headerBlacklist', t => {
    const fakeReq = {
      httpVersion: '999',
      headers: {
        host: 'localhost',
        one: '1',
        two: '1',
        three: '1',
        cookie: 'i can be included'
      },
      socket: {
        remoteAddress: '127.0.0.1',
        encrypted: false
      },
      url: '/some/url'
    };

    const aw = getTestInstance({
      headerBlacklist: ['one', 'TWO', 'tHree']
    });

    nock(aw.apiBase)
      .post('/log')
      .reply((uri, body) => {
        t.assert(body.request.headers['one'] === undefined);
        t.assert(body.request.headers['three'] === undefined);
        t.assert(body.request.headers['three'] === undefined);
        t.assert(body.request.headers['cookie'] === 'i can be included');
      });

    return aw.log(fakeReq, fakeRes)
      .then(_ => t.end())
      .catch(t.fail);
  });

  childTest.test('without fwdHeaders', t => {
    const aw = getTestInstance();

    nock(aw.apiBase)
      .post('/log')
      .reply((uri, body) => {
        t.assert(body.address === '127.0.0.1');
        t.assert(body.request.protocol === 'HTTP/999');
        t.assert(body.request.scheme === 'http');
        t.assert(body.request.host === 'localhost');
        t.assert(body.request.url === '/some/url');
        t.assert(body.request.headers['cookie'] === undefined);
        t.same(
          Object.keys(body.request.headers).length,
          Object.keys(fakeReq.headers).length - 1
        );
        t.assert(body.response.status === 123);
        return 200;
      });

    return aw.log(fakeReq, fakeRes)
      .then(_ => t.end())
      .catch(t.fail);
  });
});

test('requestSignature(req) create identities of requests', childTest => {
  childTest.plan(2);

  childTest.test('direct req', t => {
    const req = {
      headers: {
        'user-agent': '123'
      },
      socket: {
        remoteAddress: '1.2.3.4'
      }
    };

    const reqB = Object.assign({}, req, {
      headers: {
        'user-agent': '123',
        'dnt': 'test' // this should give a new signature
      },
    });

    const reqC = Object.assign({}, req, {
      headers: {
        'host': 'access-watch', // this will not affect the signature
        'user-agent': '123'
      },
      url: '/123'
    });

    const aw = getTestInstance();

    t.assert(aw.requestSignature(req) !== aw.requestSignature(reqB));
    t.assert(aw.requestSignature(req) === aw.requestSignature(reqC));
    t.end();
  });

  childTest.test('forwarded req', t => {
    const req = {
      headers: {
        'user-agent': '123',
        'host': 'access.watch',
        'x-forwarded-for': '1.2.3.4',
      },
      socket: {
        remoteAddress: '127.0.0.1'
      }
    };

    const reqB = Object.assign({}, req, {
      headers: {
        'x-forwarded-for': '1.2.3.4',
      }
    });

    const reqC = Object.assign({}, req, {
      socket: {
        // forwarded ip should be used so this value should be ignored
        remoteAddress: '5.4.3.2'
      }
    });

    const aw = getTestInstance({
      fwdHeaders: AccessWatch.fwdHeaders
    });

    t.assert(aw.requestSignature(req) !== aw.requestSignature(reqB));
    t.assert(aw.requestSignature(req) === aw.requestSignature(reqC));
    t.end();

  });

});
