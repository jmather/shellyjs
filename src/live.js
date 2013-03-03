var WebSocketServer = require('ws').Server;
var util = require('util');
var events = require('events');
var _ = require("lodash");

var eventEmitter = new events.EventEmitter();

var shlog = require(global.gBaseDir + '/src/shlog.js');
var sh = require(global.gBaseDir + '/src/shutil.js');
var ShGame = require(global.gBaseDir + '/src/shgame.js');

var gPort = 5102;

var live = exports;
var wss = null;

var gUsers = {};

function channel(name, id) {
  return "notify." + name + "." + id;
}

live.notify = function (gameId, data) {
  shlog.info('notify game: gameId = ' + gameId);
  eventEmitter.emit(channel("game", gameId), data);
};

live.notifyUser = function (uid, data) {
  shlog.info("(" + uid + ") notify user");
  eventEmitter.emit(channel("user", uid), data);
};

function sendWs(ws, error, data) {
  var msg = JSON.stringify(data);
  shlog.send(error, "live - (%s) %s", ws.uid, msg);
  ws.send(msg);
}

live.start = function () {
  wss = new WebSocketServer({port: gPort});
  shlog.info("socketserver listening: " + gPort);

  wss.on('connection', function (ws) {
    shlog.info("socket: connect");
    ws.uid = 0;
    ws.games = [];

    // helper functions in valid ws scope
    var socketNotify = function (message) {
      shlog.info("(" + ws.uid + ") socket: socketNotify");
      if (ws.readyState === 1) {
        // 1 = OPEN - SWD: find this in ws module later
        ws.send(JSON.stringify(message));
      } else {
        shlog.info("(" + ws.uid + ") socket: dead socket");
      }
    };

    ws.on('message', function (message) {
      shlog.recv("live - %s", message);

      var req = {};
      var res = {};

      // fill in req.params
      req.params = JSON.parse(message);

      // fill in req.session
      sh.fillSession(req, res, function (error, data) {
        if (error !== 0) {
          sendWs(ws, error, data);
          return;
        }

        // valid user
        ws.uid = req.session.uid;
        gUsers[ws.uid] = {status: "online"};

        if (req.params.cmd === "live.user") {
          // hook them into user events
          var userChannel = channel("user", req.session.uid);
          if (eventEmitter.listeners(userChannel).indexOf(socketNotify) === -1) {
            shlog.info("(" + ws.uid + ") add user channel: " + userChannel);
            eventEmitter.on(userChannel, socketNotify);
          }
          ws.send(JSON.stringify(sh.event("event.live.user", {status: "on", uid: ws.uid})));
          return;
        }
        if (req.params.cmd === "live.game") {
          // hook them into game events
          // SWD validate params: gameId, status
          var gameId = req.params.gameId;
          var gameChannel = channel("game", gameId);

          if (req.params.status === "on") {
            if (eventEmitter.listeners(gameChannel).indexOf(socketNotify) === -1) {
              shlog.info("(" + ws.uid + ") add game channel: " + gameChannel, ws.games);
              global.live.notify(gameId, sh.event('event.game.user.online', {uid: ws.uid}));
              ws.games.push(gameId);
              eventEmitter.on(gameChannel, socketNotify);

              // must send myself notifs for games existing online users
              var game = new ShGame();
              game.load(gameId, function (error) {
                if (error) {
                  ws.send(JSON.stringify(sh.error("bad_game", "unable to load game", {gameId: gameId})));
                  return;
                }
                var players = game.get("players");
                _.each(players, function (uid) {
                  if (uid !== ws.uid && !_.isUndefined(gUsers[uid])) {
                    ws.send(JSON.stringify(sh.event('event.game.user.online', {uid: uid})));
                  }
                });
              });
            }
          } else {
            shlog.info("(" + ws.uid + ") remove game channel:" + gameChannel, ws.games);
            var idx = ws.games.indexOf(req.params.gameId);
            if (idx !== -1) {
              ws.games.splice(idx, 1);
            }
            eventEmitter.removeListener(gameChannel, socketNotify);
            global.live.notify(gameId, sh.event('event.game.user.offline', {uid: ws.uid}));
          }
          ws.send(JSON.stringify(sh.event("event.live.game", {status: req.params.status, game: gameId})));
          return;
        }

        sh.call(req.params.cmd, req, res, function (error, data) {
          sendWs(ws, error, data);
        });  // end sh.call
      });  // end sh.fillSession
    });  // end ws.on-message

    ws.on('error', function (err) {
      shlog.error("(" + this.uid + ")", err);
    });

    ws.on('close', function () {
      shlog.info("(" + this.uid + ") socket: close");

      delete gUsers[this.uid];

      var userChannel = channel("user", this.uid);
      shlog.info("(" + this.uid + ") socket: close cleanup - " + userChannel);
      eventEmitter.removeAllListeners(userChannel, socketNotify);
      var self = this;
      _.each(ws.games, function (game) {
        var gameChannel = channel("game", game);
        shlog.info("(" + self.uid + ") socket: close cleanup - " + gameChannel);
        eventEmitter.removeListener(gameChannel, socketNotify);
        // since game is still in ws.games - user did not "game.leave" - SWD: we could enum the game.players like on set
        global.live.notify(game, sh.event('event.game.user.offline', {uid: self.uid}));
      });
    });

  }); // end wss.on-connection

  wss.on('error', function (err) {
    shlog.error("socketserver", err);
  });
};