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

Socket.notifyUser = function (uid, data) {
  shlog.info("notify user", uid);
  if (_.isObject(global.gUsers[uid])) {
    var userSoc = global.gUsers[uid];
//    if (userSoc.liveUser === "on") {
      sh.sendWs(userSoc.ws, 0, data);
//    }
  }
};

Socket.notifyUsers = function (uids, data) {
  shlog.info("notify users", uids);
  _.forEach(uids, function (uid) {
    Socket.notifyUser(uid, data);
  });
};

Socket.notifyAll = function (data) {
  shlog.info("notify all users");
  _.forOwn(global.gUsers, function (prop, key) {
    Socket.notifyUser(key, data);
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

function handleMessage(ws, message) {
  var req = {};
  var res = {
    ws: ws,
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
          gUsers[ws.uid] = {ws: ws,
            name: req.session.user.get("name"),
            pic: "",
            status: "on",
            liveUser: "off",
            last: new Date().getTime()};
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

  var loader = new ShLoader();

  var heartBeat = function () {
    sh.sendWs(ws, 0, sh.event("heartbeat", {interval: global.CONF.heartBeat}));
  };
  ws.hbTimer = setInterval(heartBeat, global.CONF.heartBeat);

  ws.on("message", function (message) {
    shlog.recv("live - %s", message);
    try {
      handleMessage(ws, message);
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
        Socket.notifyAll(sh.event("live.user", {uid: this.uid, name: userConn.name, pic: "", status: "off" }));
      }
    }

    var userChannel = sh.channel("user", this.uid);
    shlog.info("(" + this.uid + ") socket: close cleanup - " + userChannel);
    var self = this;
    _.each(ws.games, function (gameId) {
      shlog.info("(" + self.uid + ") socket: close cleanup - " + gameId);
      // since game is still in ws.games - user did not "game.leave"
      loader.get("kGame", gameId, function (error, game) {
        if (!error) {
          global.socket.notifyUsers(game.get("playerOrder"),
            sh.event("live.game.user", {uid: self.uid, name: game.get("players")[self.uid], pic: "", gameId: game, status: "off"}));
        }
      });
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
    // do not care ws lib does not allow bind check via address() call
  }
  cb();
};
