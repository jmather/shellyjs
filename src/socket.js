var net = require("net");
var WebSocketServer = require("ws").Server;
var util = require("util");
var async = require("async");
var _ = require("lodash");

var shlog = require(global.C.BASE_DIR + "/lib/shlog.js");
var stats = require(global.C.BASE_DIR + "/lib/shstats.js");
var sh = require(global.C.BASE_DIR + "/lib/shutil.js");
var shcall = require(global.C.BASE_DIR + "/lib/shcall.js");
var shcluster = require(global.C.BASE_DIR + "/lib/shcluster.js");
var dispatch = require(global.C.BASE_DIR + "/lib/shdispatch.js");
var channel = require(global.C.BASE_DIR + "/apis/channel/channel.js");
var _w = require(global.C.BASE_DIR + "/lib/shcb.js")._w;

var ShLoader = require(global.C.BASE_DIR + "/lib/shloader.js");
var ShRes = require(global.C.BASE_DIR + "/lib/shres.js");

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
    console.trace();
    shlog.error("socket", "global socket not found:", {wsId: wsId, data: data});
    return false;
  }
  try {
    sh.sendWs(ws, data);
  } catch (e) {
    shlog.error("socket", "global socket dead:", wsId, e);
    return false;
  }
  return true;
};

function callError(err, data) {
  sh.error("call-error", "call failed", data);
}

function makeCalls(msgs, req, res) {
  try {
    // process each message with same loader
    async.eachSeries(msgs, function (item, cb) {
      req.body = item;
      shcall.make(req, res, _w(callError, function (err, data) {
        if (err === 100) { // unknown exception
          res.add(sh.error("call-error", "call failed", data));
        }
        cb(0);
      }));
    }, function (err) {
      // wait on dump to avoid any timing issues
      req.loader.dump(function (err) {
        try {
          res.flush();
          res.notifyFlush();
        } catch (err1) {
          res.add(sh.error("res-flush", "problem sending responses", { message: err1.message, stack: err1.stack }));
        }
      });
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
    var errorMsg = sh.error("socket-parse", "unable to parse json message", { message: err.message, stack: err.stack });
    shlog.error("socket-parse", errorMsg);
    shlog.error("socket-parse-data", data.length, data);
    sh.sendWs(this, errorMsg);
    return;
  }

  // setup req/res
  var loader = new ShLoader();
  var req = {session: {valid: false}, body: {}, loader: loader, api: this.serverType};

  var res = new ShRes();
  res.req = req;
  res.ws = this;

  // handle batch
  var msgs = null;
  if (_.isArray(packet.batch)) {
    msgs = packet.batch;
  } else {
    msgs = [packet];
  }

  if (_.isObject(res.ws.session)) {
    req.session = res.ws.session;
    req.loader.get("kUser", req.session.uid, _w(onMessageError, function (error, user) {
      if (error) {
        req.session.error = sh.error("user-load", "unable to load user", {uid: req.session.uid, error: error, user: user});
        return onMessageError(1);
      }
      req.session.user = user;
      makeCalls(msgs, req, res);
    }));
  } else {
    shcall.fillSession(packet.session, req, res, _w(onMessageError, function (err) {
      // req.session.valid now used to control access
      if (req.session.valid) {
        res.ws.session = req.session;   // SWD now storing session in ws so we can remove the ws.uid and ws.name
        res.ws.uid = req.session.uid;
        res.ws.name = req.session.user.get("name");
        shcluster.setLocate(req.session.user, res.ws.id, _w(onMessageError, function (err, data) {
          shlog.info("locate", "setLocate", req.session.uid, res.ws.id);
          makeCalls(msgs, req, res);
        }));
      } else {
        // some calls don't require session
        makeCalls(msgs, req, res);
      }
    }));
  }
}

// Used in TCP only version as framer
function onData(data) {
  var i = 0;
  shlog.debug("tcp", "onData", this.id, data.length, data);
  var block = this.msg + data; // and any previous partial
  this.msg = "";               // clear the buffer
  var chunks = block.split("\n");
  if (chunks.length === 1) {
    this.msg += chunks[0];  // end not found at all
    shlog.info("tcp", "onData-buffer-front", this.id, this.msg.length, this.msg);
    return;
  }
  for (i = 0; i < chunks.length - 1; i += 1) {
    shlog.info("tcp", "onData-process", this.id, chunks[i]);
    onMessage.call(this, chunks[i]);
  }
  if (chunks[chunks.length - 1].length !== 0) {
    this.msg += chunks[chunks.length - 1];  // list of cmds ends in partial command
    shlog.info("tcp", "onData-buffer-back", this.id, this.msg);
    return;
  }
}

function onCloseError(err, data) {
  shlog.error(sh.error("close-error", err, data));
}

function onClose() {
  shlog.info("socket", "(" + this.id + ") socket: close");

  clearInterval(this.hbTimer);

  // clean up the global locator if there
  if (_.isString(this.uid)) {
    var self = this;
    shcluster.removeLocate(this.uid, _w(onCloseError, function (err, data) {
      shlog.info("locate", "removeLocate", self.uid, self.id);
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

  var heartBeat = function () {
    sh.sendWs(ws, sh.event("heartbeat", {interval: global.C.HEART_BEAT}));
  };
  ws.hbTimer = setInterval(heartBeat, global.C.HEART_BEAT);

  if (wss.serverType === "tcp") {
    ws.setEncoding("utf8");
    ws.msg = "";
    ws.send = function (data) { this.write(data + "\n"); };
    ws.on("data", onData);
  } else {
    ws.on("message", onMessage);
  }
  ws.on("error", onError);
  ws.on("close", onClose);
}

Socket.start = function (serverType) {
  if (serverType === "tcp") {
    wss = net.createServer(function (socket) {}).listen(global.C.TCP_PORT, function () {
      shlog.system("tcp", "server listening: " + global.C.TCP_PORT);
    });
  } else {
    wss = new WebSocketServer({port: global.C.SOCKET_PORT}, function () {
      shlog.system("socket", "server listening: " + global.C.SOCKET_URL);
    });
  }
  wss.serverType = serverType;
  var connCount = 1;

  wss.on("connection", function (ws) {
    ws.serverType = wss.serverType;
    ws.id = connCount;
    connCount += 1;
    ws.channels = {};
    global.sockets[ws.id] = ws; // register in global index
    try {
      handleConnect(ws);
    } catch (err) {
      sh.sendWs(ws, sh.error("socket-connect", "connection - " + err.message, { message: err.message, stack: err.stack }));
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
