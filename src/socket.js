var WebSocketServer = require("ws").Server;
var util = require("util");
var async = require("async");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var ShLoader = require(global.gBaseDir + "/src/shloader.js");
var channel = require(global.gBaseDir + "/functions/channel/channel.js");

var Socket = exports;
var wss = null;

function add(data) {
  if (data.event === "error") {
    shlog.error(data);
  }
  sh.sendWs(this.ws, 0, data);
}

function handleConnect(ws) {
  shlog.info("socket: connect");
  ws.uid = 0;
  ws.games = [];
  ws.hbTimer = null;

  var loader = new ShLoader();

  var heartBeat = function () {
    sh.sendWs(ws, 0, sh.event("heartbeat", {interval: global.CONF.heartBeat}));
  };
  ws.hbTimer = setInterval(heartBeat, global.CONF.heartBeat);

  ws.on("message", function (data) {
    shlog.recv("live - %s", data);
    // parse packet
    var packet = {};
    try {
      packet = JSON.parse(data);
    } catch (err) {
      sh.sendWs(ws, 1, sh.error("socket", "unable to parse json message", { message: err.message, stack: err.stack }));
      return;
    }

    // setup req/res
    var loader = new ShLoader();
    var req = {session: {valid: false}, body: {}, loader: loader};
    var res = {ws: ws, add: add};

    // handle batch
    var msgs = null;
    if (_.isArray(packet.batch)) {
      msgs = packet.batch;
    } else {
      msgs = [packet];
    }

    sh.fillSession(packet.session, req, res, function (err) {
      // req.session.valid now used to control access
      if (req.session.valid) {
        res.ws.uid = req.session.uid;
        res.ws.name = req.session.user.get("name");
      }
      try {
        // process each message with same loader
        async.eachSeries(msgs, function (item, cb) {
          req.body = item;
          sh.call(req, res, function (err, data) {
            cb(err);
          });
        }, function (err) {
          loader.dump();  // don't wait on dump cb
        });
      } catch (err1) {
        sh.sendWs(ws, 1, sh.error("socket", "message - " + err1.message, { message: err1.message, stack: err1.stack }));
      }
    });
  });  // end ws.on-message

  ws.on("error", function (err) {
    shlog.error("(" + this.uid + ")", err);
  });

  ws.on("close", function () {
    shlog.info("(" + this.uid + ") socket: close");

    clearInterval(this.hbTimer);

    // clean up any channels
    _.each(ws.channels, function (value, key) {
      shlog.info("removing", key);
      channel.removeInt(ws, key);
    });
  });
}

Socket.start = function () {
  wss = new WebSocketServer({port: global.CONF.socketPort});
  shlog.info("socketserver listening: " + global.CONF.socketPort);
  var connCount = 1;

  wss.on("connection", function (ws) {
    ws.id = connCount;
    connCount += 1;
    ws.channels = {};
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
