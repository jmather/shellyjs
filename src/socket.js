var WebSocketServer = require("ws").Server;
var util = require("util");
var events = require("events");
var _ = require("lodash");

var eventEmitter = new events.EventEmitter();

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var ShLoader = require(global.gBaseDir + "/src/shloader.js");

var Socket = exports;
var wss = null;

global.gUsers = {};
var gUsers = global.gUsers;

Socket.notify = function (gameId, data) {
  shlog.info("notify game: gameId = " + gameId);
  eventEmitter.emit(sh.channel("game", gameId), data);
};

Socket.notifyUser = function (uid, data) {
  shlog.info("notify user", uid);
  eventEmitter.emit(sh.channel("user", uid), data);
};

Socket.notifyUsers = function (uids, data) {
  shlog.info("notify users", uids);
  _.forEach(uids, function (uid) {
    eventEmitter.emit(sh.channel("user", uid), data);
  });
};

Socket.notifyAll = function (data) {
  shlog.info("notify all users");
  _.forOwn(global.gUsers, function (prop, key) {
    if (prop.liveUser === "on") {
      eventEmitter.emit(sh.channel("user", key), data);
    }
  });
};

function add(data) {
  if (data.event === "error") {
    shlog.error(data);
  }
  sh.sendWs(this.ws, 0, data);
}

// no-op as we send right away
function sendAll() {
}

function handleMessage(ws, message, socketNotify) {
  var req = {};
  var res = {
    ws: ws,
    eventEmitter: eventEmitter,
    socketNotify: socketNotify,
    add: add,
    sendAll: sendAll
  };

  // fill in req.body
  try {
    req.body = JSON.parse(message);
  } catch (err) {
    sh.sendWs(ws, 1, sh.error("socket", "unable to parse json message", { message: err.message, stack: err.stack }));
    return;
  }
  req.loader = new ShLoader();

  // fill in req.session
  sh.fillSession(req, res, function (error, data) {
    try {
      if (error !== 0) {
        res.sendAll();
        return;
      }
      // if valid user, add to list, if not we are in reg.* call
      if (!_.isUndefined(req.session)) {
        ws.uid = req.session.uid;

        // if socket not registered in gUsers, do it
        if (_.isUndefined(gUsers[ws.uid])) {
          gUsers[ws.uid] = {name: req.session.user.get("name"), pic: "", status: "online", liveUser: "off", last: new Date().getTime()};
          // hookup the user channel
          var userChannel = sh.channel("user", ws.uid);
          if (eventEmitter.listeners(userChannel).indexOf(socketNotify) === -1) {
            shlog.info("(" + ws.uid + ") add user channel: " + userChannel);
            eventEmitter.on(userChannel, socketNotify);
          }
        }
      }
    } catch (err) {
      sh.sendWs(ws, 1, sh.error("socket", "fillSession - " + err.message, { message: err.message, stack: err.stack }));
      return;
    }
    sh.call(req, res, function (error, data) {
      req.loader.dump();
      res.sendAll();
    });  // end sh.call
  });  // end sh.fillSession
}

function handleConnect(ws) {
  shlog.info("socket: connect");
  ws.uid = 0;
  ws.games = [];
  ws.hbTimer = null;

  var heartBeat = function () {
    sh.sendWs(ws, 0, sh.event("heartbeat", {interval: global.CONF.heartBeat}));
  };
  ws.hbTimer = setInterval(heartBeat, global.CONF.heartBeat);

  // helper functions in valid ws scope
  var socketNotify = function (message) {
    shlog.info("(" + ws.uid + ") socket: socketNotify");
    if (ws.readyState === 1) {
      // 1 = OPEN - SWD: find this in ws module later
      sh.sendWs(ws, 0, message);
    } else {
      shlog.info("(" + ws.uid + ") socket: dead socket");
    }
  };

  ws.on("message", function (message) {
    shlog.recv("live - %s", message);
    try {
      handleMessage(ws, message, socketNotify);
    } catch (err) {
      sh.sendWs(ws, 1, sh.error("socket", "message - " + err.message, { message: err.message, stack: err.stack }));
    }
  });  // end ws.on-message

  ws.on("error", function (err) {
    shlog.error("(" + this.uid + ")", err);
  });

  ws.on("close", function () {
    clearInterval(this.hbTimer);

    if (_.isUndefined(this.uid) || this.uid === 0) {
      shlog.info("socket: close - socket never had valid user session");
      return;
    }
    shlog.info("(" + this.uid + ") socket: close");

    var userConn = gUsers[this.uid];
    if (_.isUndefined(userConn)) {
      shlog.error("socket: uid set, but user not in map", userConn);
    } else {
      delete gUsers[this.uid];
      if (userConn.liveUser === "on") {
        Socket.notifyAll(sh.event("live.user", {uid: this.uid, name: userConn.name, pic: "", status: "offline" }));
      }
    }

    var userChannel = sh.channel("user", this.uid);
    shlog.info("(" + this.uid + ") socket: close cleanup - " + userChannel);
    eventEmitter.removeAllListeners(userChannel);
    var self = this;
    _.each(ws.games, function (game) {
      var gameChannel = sh.channel("game", game);
      shlog.info("(" + self.uid + ") socket: close cleanup - " + gameChannel);
      eventEmitter.removeListener(gameChannel, socketNotify);
      // since game is still in ws.games - user did not "game.leave" - SWD: we could enum the game.players like on set
      // userConn may not exist here so can't use it for name
      global.socket.notify(game, sh.event("live.game.user", {uid: self.uid, name: "", pic: "", gameId: game, status: "offline"}));
    });
  });
}

Socket.start = function () {
  wss = new WebSocketServer({port: global.CONF.socketPort});
  shlog.info("socketserver listening: " + global.CONF.socketPort);

  wss.on("connection", function (ws) {
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
    // don't care ws lib does not allow bind check via address() call
  }
  cb();
};
