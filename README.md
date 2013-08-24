Shelly
======

  API server via HTTP and Websockets

```js
var shelly = require('shelly');

shelly.start({}, function (err, data) {
});
```

## Installation

    $ npm install shelly

## Quick Start

 The quickest way to get started with Shelly is to run the example app that comes with it.

 Install Shelly:

    $ npm install shelly

 Start the server:

    $ node node_modules/shelly/example/app.js
    
 Explore:
 
    Game examples - http://localhost:5102
    Admin - http://localhost:5100 (default admin user: "shelly", password: "shelly"
    
## Create an API

 Follow Quick Start
 
 Create an API:
 
    $ cp -r node_modules/shelly/example/* .
    $ node app.js
    
 Modify the API:
 
    vim apis/example/example.js
    
```js
var sh = require(global.C.BASEDIR + "/lib/shutil.js");

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

2. They are called via a json post or websocket send:

```json
{
  "session": "<acquired from reg call>",
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

If called via http the response is an array of JSON.stringified data, while the websocket sends each data object via an onmessage event.
    
 Test in admin:
 
    http://localhost:5100/core.html?api=api.app

## Features

  * Drop in API support
  * APIs supported over HTTP (REST-ish) and Websockets
  * Several built-in APIs
  * Web based API testing
  * User online/offline detection
  * Push events
  * Parameter validation
  * Role bases per function API security
  * Per server and multi-server clustering
  * Async job queues (email)
  * Object presistence, caching, and locking
  * Plugable data storage (Production: Redis, Developement: sqlite)
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
