Shelly
======

  API server via HTTP, WebSockets, and TCP

```js
var shelly = require('shellyjs');

shelly.start({}, function (err, data) {
});
```

## Installation

    $ npm install shellyjs
    
 or if you want the tip

    $ npm install git+ssh://git@github.com:skool51/shellyjs.git
  

## Quick Start

 The quickest way to get started with Shelly is to run the example app that comes with it.

 Install Shelly: (see above)

 Start the example server:

    $ node node_modules/shellyjs/example/app.js
    
 Explore:
 
    Login/Game examples - http://localhost:5102
    Admin - http://localhost:5100 (default admin user: "shelly", password: "shelly")
    
## Create an API

 Follow Quick Start
 
 Create an API:
 
    $ cp -r node_modules/shellyjs/example/* .
    $ node app.js
    
 Modify the API:
 
    vim apis/example/example.js
    
```js
var sh = require(global.C.BASE_DIR + "/lib/shutil.js");

var example = exports;

example.desc = "example api";
example.functions = {
  echo: {desc: "one parameter api example", params: {param1: {dtype: "string"}}, security: []}
};

example.echo = function (req, res, cb) {
  res.add(sh.event("example.echo", req.body.param1));
  return cb(0);
};
```

1. APIs are defined by files placed in the "apis" directory and in a subdirectory with the same name "apis/example/example.js".

2. They are called via JSON post, WebSocket or TCP send:

```json
{
  "session": "<acquired from reg.login call>",
  "cmd": "example.echo",
  "param1": "foo"
}
````

3. "res.add()" is then used to send back JSON.stringified data.  All Shelly built in APIs use the utility functions "sh.event()" and "sh.error()" to wrap the returned data in the following envelope.

```json
{
  "event": "example.echo",
  "ts": 1377384505451,
  "data": "foo"
}
```

If called via http the response is an array of JSON.stringified data, while the WebSocket and TCP send each data object via an onmessage event.
    
 Test in admin:
 
    http://localhost:5100/core.html?api=api.app

By default the API files are loaded once on first use.  During development set MODULE_CACHE=false and the API
files will be reloaded each call.  The example/app.js has this set to false already.

## Features

  * Drop in support for API functions
  * Functions run over HTTP, WebSockets, and TCP
  * Multi-server clustering
  * Ready built APIs (registration, users, storage...)
  * Web based API testing
  * User online/offline detection
  * Push events
  * Parameter validation
  * Role based per function API security
  * Async job queues (email, push notifications)
  * Object presistence, caching, and locking
  * Plugable data storage
  * Server side statistics
  * Logging

## Built-in APIs
  * reg.js - login, anonymous registration
  * channel.js - sync and async messaging
  * game.js - turn based game control
  * match.js - matches users and creates games
  * challenge.js - allows users to send/accept challenges from other users
  * suggest.js - suggests users that may want to play a game
  * object.js - generic object CRUD
  * stats.js - access to internal server statistics
  * api.js - access to installed API definitions
  * cluster.js - cluster information and control
  * system.js - system information
  * user.js - user control
  * counter.js - user counter access and notification


# License
The MIT License (MIT)

Copyright (c) 2013 Scott Dale <scott@skool51.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
