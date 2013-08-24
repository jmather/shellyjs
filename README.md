shelly
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

 The quickest way to get started with shelly is to run the example app that comes with it.

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
 
    $ cp -r ~/node_modules/shelly/example/* .
    $ node app.js
    
 Modify the API:
    Edit ~/apis/example/example.js
    
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
