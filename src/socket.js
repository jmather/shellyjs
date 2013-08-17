var WebSocketServer = require("ws").Server;
var util = require("util");
var async = require("async");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var stats = require(global.gBaseDir + "/src/shstats.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var ShLoader = require(global.gBaseDir + "/src/shloader.js");
var shcluster = require(global.gBaseDir + "/src/shcluster.js");
var channel = require(global.gBaseDir + "/functions/channel/channel.js");
var _w = require(global.gBaseDir + "/src/shcb.js")._w;

var Socket = exports;
var wss = null;

if (_.isUndefined(global.sockets)) {
  global.sockets = {};
}

// send directly to user using socket id in global map
Socket.sendDirect = function (wsId, data) {
  if (_.isUndefined(data)) {
    shlog.error("socket", "bad send data:", data);
    return false;
  }
  var ws = global.sockets[wsId];
  if (_.isUndefined(ws)) {
    shlog.error("socket", "global socket not found:", wsId);
    return false;
  }
  try {
    sh.sendWs(ws, 0, data);
  } catch (e) {
    shlog.error("socket", "global socket dead:", wsId, e);
    return false;
  }
  return true;
};

// res.add - adds event or error to output stream
function add(data) {
  if (_.isUndefined(this.msgs)) {
    this.msgs = [];
  }
  if (data.event === "error") {
    data.inputs = this.req.body;
    stats.incr("errors", "socket");
    shlog.error("socket", "send %j", data);  // log all errors
  }
  this.msgs.push(data);
}

// res.send - sends all events or errors
function sendAll() {
  var self = this;
  _.each(this.msgs, function (data) {
    sh.sendWs(self.ws, 0, data);
  });
  this.msgs = [];
}

function clear() {
  this.msgs = [];
}

function callError(err, data) {
  sh.error("call-error", "call failed", data);
}

function makeCalls(msgs, req, res) {
  try {
    // process each message with same loader
    async.eachSeries(msgs, function (item, cb) {
      req.body = item;
      sh.call(req, res, _w(callError, function (err, data) {
        if (err === 100) { // unknown exception
          res.add(sh.error("call-error", "call failed", data));
        }
        cb(0);
      }));
    }, function (err) {
      req.loader.dump();  // don't wait on dump cb
      res.sendAll();
    });
  } catch (err1) {
    res.add(sh.error("socket-calls", "message - " + err1.message, { message: err1.message, stack: err1.stack }));
  }
}

function onMessageError(err, data) {
  sh.error("message-error", err, data);
}

function onMessage(data) {
  shlog.debug("recv", "live - %s", data);
  // parse packet
  var packet = {};
  try {
    packet = JSON.parse(data);
  } catch (err) {
    sh.sendWs(this, 1, sh.error("socket-parse", "unable to parse json message", { message: err.message, stack: err.stack }));
    return;
  }

  // setup req/res
  var loader = new ShLoader();
  var req = {session: {valid: false}, body: {}, loader: loader};
  var res = {req: req, ws: this, add: add, sendAll: sendAll, clear: clear};

  // handle batch
  var msgs = null;
  if (_.isArray(packet.batch)) {
    msgs = packet.batch;
  } else {
    msgs = [packet];
  }

  if (_.isObject(res.ws.session)) {
    // SWD: we must refresh the user data so it doesn't get stale
    req.session = res.ws.session;
    makeCalls(msgs, req, res);
  } else {
    sh.fillSession(packet.session, req, res, _w(onMessageError, function (err) {
      // req.session.valid now used to control access
      if (req.session.valid) {
        res.ws.session = req.session;   // SWD now storing session in ws so we can remove the ws.uid and ws.name
        res.ws.uid = req.session.uid;
        res.ws.name = req.session.user.get("name");
        shcluster.setLocate(req.session.user, res.ws.id, _w(onMessageError, function (err, data) {
          makeCalls(msgs, req, res);
        }));
      } else {
        // some calls don't require session
        makeCalls(msgs, req, res);
      }
    }));
  }
}

function onCloseError(err, data) {
  sh.error("close-error", err, data);
}

function onClose() {
  shlog.info("socket", "(" + this.id + ") socket: close");

  clearInterval(this.hbTimer);

  // clean up the global locator if there
  if (_.isString(this.uid)) {
    shcluster.removeLocate(this.uid, _w(onCloseError, function (err, data) {
      // ignore and don't wait
    }));
  }

  // clean up any channels
  _.each(this.channels, function (value, key) {
    shlog.info("socket", "removing", key);
    channel.removeInt(key, this.uid);
  }, this);

  delete global.sockets[this.id]; // remove from global index
}

function onError(err) {
  shlog.error("socket", "(" + this.id + ")", err);
}

function handleConnect(ws) {
  if (global.shutdown) {
    // just in case someone sneaks in
    shlog.error("socket", "connect after shutdown");
    ws.close();
    return;
  }

  shlog.info("socket", "(" + ws.id + ") socket: connect");
  ws.uid = 0;
  ws.games = [];
  ws.hbTimer = null;

  var loader = new ShLoader();

  var heartBeat = function () {
    sh.sendWs(ws, 0, sh.event("heartbeat", {interval: global.C.HEART_BEAT}));
  };
  ws.hbTimer = setInterval(heartBeat, global.C.HEART_BEAT);

  ws.on("message", onMessage);
  ws.on("error", onError);
  ws.on("close", onClose);
}

Socket.start = function () {
  wss = new WebSocketServer({port: global.C.SOCKET_PORT}, function () {
    shlog.system("socket", "server listening: " + global.C.SOCKET_URL);
  });
  var connCount = 1;

  wss.on("connection", function (ws) {
    ws.id = connCount;
    connCount += 1;
    ws.channels = {};
    global.sockets[ws.id] = ws; // register in global index
    try {
      handleConnect(ws);
    } catch (err) {
      sh.sendWs(ws, 1, sh.error("socket-connect", "connection - " + err.message, { message: err.message, stack: err.stack }));
    }
  }); // end wss.on-connection

  wss.on("error", function (err) {
    shlog.error("socket", err);
  });
};

Socket.shutdown = function (cb) {
  try {
    wss.close(1001, "server going down");

    // wait 3 sec for socket close events
    // SWD set this as config param
    setTimeout(function () {
      cb();
    }, 3000);
  } catch (e) {
    cb();
  }
};
