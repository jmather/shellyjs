var WebSocketServer = require("ws").Server;
var util = require("util");
var events = require("events");
var _ = require("lodash");

var eventEmitter = new events.EventEmitter();

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var ShGame = require(global.gBaseDir + "/src/shgame.js");

var Socket = exports;
var wss = null;

global.gUsers = {};
var gUsers = global.gUsers;

Socket.notify = function (gameId, data) {
  shlog.info("notify game: gameId = " + gameId);
  eventEmitter.emit(sh.channel("game", gameId), data);
};

Socket.notifyUser = function (uid, data) {
  shlog.info("(" + uid + ") notify user");
  eventEmitter.emit(sh.channel("user", uid), data);
};

Socket.notifyAll = function (data) {
  shlog.info("(notify all users");
  _.forOwn(global.gUsers, function (prop, key) {
    eventEmitter.emit(sh.channel("user", key), data);
  });
};

Socket.start = function () {
  wss = new WebSocketServer({port: global.CONF.socketPort});
  shlog.info("socketserver listening: " + global.CONF.socketPort);

  wss.on("connection", function (ws) {
    shlog.info("socket: connect");
    ws.uid = 0;
    ws.games = [];
    ws.hbTimer = null;

    var heartBeat = function () {
      sh.sendWs(ws, 0, sh.event("event.heartbeat", {interval: global.CONF.heartBeat}));
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

      var req = {};
      var res = {
        ws: ws,
        eventEmitter: eventEmitter,
        socketNotify: socketNotify
      };

      // fill in req.params
      req.params = JSON.parse(message);

      // fill in req.session
      sh.fillSession(req, res, function (error, data) {
        if (error !== 0) {
          sh.sendWs(ws, error, data);
          return;
        }
        // if valid user, add to list, if not we are in reg.* call
        if (!_.isUndefined(req.session)) {
          ws.uid = req.session.uid;

          // if socket not registered in gUsers, do it
          if (_.isUndefined(gUsers[ws.uid])) {
            gUsers[ws.uid] = {name: req.session.user.get("name"), pic: "", status: "online", gameId: 0, liveUser: "off", last: new Date().getTime()};
            // hookup the user channel
            var userChannel = sh.channel("user", ws.uid);
            if (eventEmitter.listeners(userChannel).indexOf(socketNotify) === -1) {
              shlog.info("(" + ws.uid + ") add user channel: " + userChannel);
              eventEmitter.on(userChannel, socketNotify);
            }
          }
        }

        sh.call(req, res, function (error, data) {
          if (error) {
            shlog.error(error, data);
          }
          if (data !== null && !_.isUndefined(data)) {
            data.cb = req.params.cb;
            sh.sendWs(ws, error, data);
          }
        });  // end sh.call
      });  // end sh.fillSession
    });  // end ws.on-message

    ws.on("error", function (err) {
      shlog.error("(" + this.uid + ")", err);
    });

    ws.on("close", function () {
      clearInterval(this.hbTimer);

      if (_.isUndefined(this.uid)) {
        shlog.info("socket: close - socket never had valid user session");
        return;
      }
      shlog.info("(" + this.uid + ") socket: close");

      var userConn = gUsers[this.uid];
      delete gUsers[this.uid];

      if (userConn.liveUser === "on") {
        Socket.notifyAll(sh.event("event.live.user", {uid: this.uid, name: userConn.name, pic: "", status: "offline" }));
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
        global.socket.notify(game, sh.event("event.live.game.user", {uid: self.uid, name: userConn.name, pic: "", gameId: game, status: "offline"}));
      });
    });

  }); // end wss.on-connection

  wss.on("error", function (err) {
    shlog.error("socketserver", err);
  });
};