var WebSocketServer = require("ws").Server;
var util = require("util");
var async = require("async");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var ShLoader = require(global.gBaseDir + "/src/shloader.js");
var channel = require(global.gBaseDir + "/functions/channel2/channel2.js");

var Socket = exports;
var wss = null;

if (_.isUndefined(global.sockets)) {
  global.sockets = {};
}

function add(data) {
  if (data.event === "error") {
    shlog.error(data);
  }
  sh.sendWs(this.ws, 0, data);
}

function makeCalls(msgs, req, res) {
  try {
    // process each message with same loader
    async.eachSeries(msgs, function (item, cb) {
      req.body = item;
      sh.call(req, res, cb);
    }, function (err) {
      req.loader.dump();  // don't wait on dump cb
    });
  } catch (err1) {
    res.add(sh.error("socket", "message - " + err1.message, { message: err1.message, stack: err1.stack }));
  }
}

function onMessage(data) {
  shlog.recv("live - %s", data);
  // parse packet
  var packet = {};
  try {
    packet = JSON.parse(data);
  } catch (err) {
    sh.sendWs(this, 1, sh.error("socket", "unable to parse json message", { message: err.message, stack: err.stack }));
    return;
  }

  // setup req/res
  var loader = new ShLoader();
  var req = {session: {valid: false}, body: {}, loader: loader};
  var res = {ws: this, add: add};

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
    sh.fillSession(packet.session, req, res, function (err) {
      // req.session.valid now used to control access
      if (req.session.valid) {
        res.ws.session = req.session;   // SWD now storing session in ws so we can remove the ws.uid and ws.name
        res.ws.uid = req.session.uid;
        res.ws.name = req.session.user.get("name");
        loader.get("kLocate", req.session.uid, function (err, locate) {
          locate.set("oid", req.session.uid);
          locate.set("serverUrl", res.ws.upgradeReq.headers.origin);
          locate.set("serverId", global.server.serverId);
          locate.set("workerId", shlog.workerId);
          locate.set("socketId", res.ws.id);
          shlog.info("locate set", locate.getData());
        });
      }
      makeCalls(msgs, req, res);
    });
  }
}

function onClose() {
  shlog.info("(" + this.id + ") socket: close");

  clearInterval(this.hbTimer);

  // clean up the global locator if there
  if (_.isString(this.uid)) {
    global.db.kdelete("kLocate", this.uid);
    // don't for response
  }

  // clean up any channels
  _.each(this.channels, function (value, key) {
    shlog.info("removing", key);
    channel.removeInt(key, this.uid);
  }, this);

  delete global.sockets[this.id]; // remove from global index
}

function onError(err) {
  shlog.error("(" + this.id + ")", err);
}

function handleConnect(ws) {
  shlog.info("(" + ws.id + ") socket: connect");
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
  wss = new WebSocketServer({port: global.C.SOCKET_PORT});
  shlog.info("socketserver listening: " + global.C.SOCKET_PORT);
  var connCount = 1;

  wss.on("connection", function (ws) {
    ws.id = connCount;
    connCount += 1;
    ws.channels = {};
    global.sockets[ws.id] = ws; // register in global index
    try {
      handleConnect(ws);
    } catch (err) {
      sh.sendWs(ws, 1, sh.error("socket", "connection - " + err.message, { message: err.message, stack: err.stack }));
    }
  }); // end wss.on-connection

  wss.on("error", function (err) {
    shlog.error(err);
  });
};

Socket.close = function (cb) {
  try {
    wss.close();
  } catch (e) {
    // do not care ws lib does not allow bind check via address() call
  }
  cb();
};
