<a name="AccessWatch"></a>

## AccessWatch
Handles logging, caching and checking for blocked requets.

**Kind**: global class  

* [AccessWatch](#AccessWatch)
    * [new AccessWatch(config)](#new_AccessWatch_new)
    * _instance_
        * [.hello()](#AccessWatch+hello) ⇒ <code>Promise</code>
        * [.lookupSession(req, noCache)](#AccessWatch+lookupSession) ⇒ <code>Promise</code>
        * [.checkBlocked(req)](#AccessWatch+checkBlocked) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [.log(req, res)](#AccessWatch+log) ⇒ <code>Promise</code>
        * [.requestSignature(req)](#AccessWatch+requestSignature) ⇒ <code>string</code>
    * _static_
        * [.Cache](#AccessWatch.Cache)
            * [.get(id, callback)](#AccessWatch.Cache+get)
            * [.set(id, value, callback)](#AccessWatch.Cache+set)
            * [.drop|del(id, callback)](#AccessWatch.Cache+drop|del)
        * [.fwdHeaders](#AccessWatch.fwdHeaders) : <code>AccessWatch.ForwardHeaders</code>
        * [.ForwardedHeaders](#AccessWatch.ForwardedHeaders) : <code>object</code>

<a name="new_AccessWatch_new"></a>

### new AccessWatch(config)

| Param | Type | Description |
| --- | --- | --- |
| config | <code>object</code> |  |
| config.apiKey | <code>string</code> | AccessWatch api key |
| config.cache | <code>[Cache](#AccessWatch.Cache)</code> | A cache for storing sessions. |
| [config.headerBlacklist] | <code>Array.&lt;String&gt;</code> | A list of headers that must never be sent to the AccessWatch service. By default Cookie and Authorization are omitted. The headers are case insensitive. |
| [config.fwdHeaders] | <code>AccessWatch.ForwardHeaders</code> | Specify custom proxy header names. It is necessary to set this if the server is behind a reverse proxy. Use pass a custom object or the predefined `AccessWatch.fwdHeaders` which should sufficient for most cases. |
| [config.apiBase] | <code>string</code> | A custom api base url, may be useful for testing and debugging. |

<a name="AccessWatch+hello"></a>

### accessWatch.hello() ⇒ <code>Promise</code>
Make sure the `apiBase` and `apiKey` are correctly set up. Probably done
every time a server launches

**Kind**: instance method of <code>[AccessWatch](#AccessWatch)</code>  
**Returns**: <code>Promise</code> - Rejects unless a 200 is returned from the api  
<a name="AccessWatch+lookupSession"></a>

### accessWatch.lookupSession(req, noCache) ⇒ <code>Promise</code>
Look up a Session from cache or api with a node request

**Kind**: instance method of <code>[AccessWatch](#AccessWatch)</code>  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>http.IncomingMessage</code> | A raw node request |
| noCache | <code>boolean</code> | Don't use cache |

<a name="AccessWatch+checkBlocked"></a>

### accessWatch.checkBlocked(req) ⇒ <code>Promise.&lt;boolean&gt;</code>
Check if a request should be blocked by checking for the requestSignature
in the cache.

NOTE: If its a cache miss, default will be `false` since we should never
add extra latency to the response times or making it dependent on the
access watch api service.

**Kind**: instance method of <code>[AccessWatch](#AccessWatch)</code>  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>http.IncomingMessage</code> | A raw node request |

<a name="AccessWatch+log"></a>

### accessWatch.log(req, res) ⇒ <code>Promise</code>
Send request and response data to AccessWatch API.

**Kind**: instance method of <code>[AccessWatch](#AccessWatch)</code>  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>http.IncomingMessage</code> | A raw node request |
| res | <code>http.ServerResponse</code> | A raw node response |

<a name="AccessWatch+requestSignature"></a>

### accessWatch.requestSignature(req) ⇒ <code>string</code>
An identifier hash to associate a certain type of requests with a Session.
Simply a combination of the address and some headers.

**Kind**: instance method of <code>[AccessWatch](#AccessWatch)</code>  

| Param | Type | Description |
| --- | --- | --- |
| req | <code>http.IncomingMessage</code> | A raw node request |

<a name="AccessWatch.Cache"></a>

### AccessWatch.Cache
The AccessWatch instance requires a cache that implements the functions
`get`, `set`, and `drop` or `del`. The module has been built with
catbox and node-cache-manager in mind. Easiest is thus to use a
`Catbox.Policy` or cache-manager interface but any kind of cache
that implements this interface will be do.

**Kind**: static interface of <code>[AccessWatch](#AccessWatch)</code>  
**See**

- https://github.com/hapijs/catbox#api-1
- https://github.com/BryanDonovan/node-cache-manager


* [.Cache](#AccessWatch.Cache)
    * [.get(id, callback)](#AccessWatch.Cache+get)
    * [.set(id, value, callback)](#AccessWatch.Cache+set)
    * [.drop|del(id, callback)](#AccessWatch.Cache+drop|del)

<a name="AccessWatch.Cache+get"></a>

#### cache.get(id, callback)
Retrieve an item from the cache engine if found

**Kind**: instance method of <code>[Cache](#AccessWatch.Cache)</code>  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> |  |
| callback | <code>function</code> | node style callback |

<a name="AccessWatch.Cache+set"></a>

#### cache.set(id, value, callback)
Store an item in the cache for a certain length of time

**Kind**: instance method of <code>[Cache](#AccessWatch.Cache)</code>  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> |  |
| value | <code>string</code> &#124; <code>object</code> |  |
| callback | <code>function</code> | node style callback |

<a name="AccessWatch.Cache+drop|del"></a>

#### cache.drop|del(id, callback)
Remove an item from cache can also be named `del`

**Kind**: instance method of <code>[Cache](#AccessWatch.Cache)</code>  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> |  |
| callback | <code>function</code> | node style callback |

<a name="AccessWatch.fwdHeaders"></a>

### AccessWatch.fwdHeaders : <code>AccessWatch.ForwardHeaders</code>
The standard headers that a reverse proxy should set. This means that
forwarded request should set the headers `X-Forwarded-For`,
`X-Forwarded-Proto`, and the first entry of `X-Forwarded-For`

**Kind**: static property of <code>[AccessWatch](#AccessWatch)</code>  
<a name="AccessWatch.ForwardedHeaders"></a>

### AccessWatch.ForwardedHeaders : <code>object</code>
If the server runs behind a reverse proxy such as nginx or haproxy,
http headers should provide info about the forwarded request. This maps
header properties for getting request info using either a function or the
header name

**Kind**: static typedef of <code>[AccessWatch](#AccessWatch)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| host | <code>string</code> &#124; <code>function</code> | Header field for the forwarded Host header or a `function(headers) -> string` returning the value |
| scheme | <code>string</code> &#124; <code>function</code> | Header field for the forwarded protocol or a `function(headers) -> string` returning the value |
| address | <code>string</code> &#124; <code>function</code> | Header field for the forwarded ip address or a `function(headers) -> string` returning the value |

