var events = require("events");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var ShGame = require(global.gBaseDir + "/src/shgame.js");

var live = exports;

live.desc = "game state and control module";
live.functions = {
  list: {desc: "list online users", params: {}, security: []},
  user: {desc: "enable/disable live events for a user", params: {status: {dtype: "string"}}, security: []},
  game: {desc: "enable/disable live events for a user in a game", params: {gameId: {dtype: "string"}, status: {dtype: "string"}}, security: []}
};

live.list = function (req, res, cb) {
  cb(0, sh.event("event.live.list", global.gUsers));
};

live.user = function (req, res, cb) {
  if (_.isUndefined(res.ws)) {
    cb(1, sh.error("socket_only_call", "this call can only be made from the socket interafce"));
    return;
  }
  var eventEmitter = res.eventEmitter;
  var socketNotify = res.socketNotify;
  var ws = res.ws;

  var userChannel = sh.channel("user", ws.uid);
  if (eventEmitter.listeners(userChannel).indexOf(socketNotify) === -1) {
    shlog.info("(" + ws.uid + ") add user channel: " + userChannel);
    eventEmitter.on(userChannel, socketNotify);
  }

  cb(0, sh.event("event.live.user", {status: "on", uid: ws.uid}));
};

live.game = function (req, res, cb) {
  if (_.isUndefined(res.ws)) {
    cb(1, sh.error("socket_only_call", "this call can only be made from the socket interafce"));
    return;
  }
  var eventEmitter = res.eventEmitter;
  var socketNotify = res.socketNotify;
  var ws = res.ws;

  var gameId = req.params.gameId;
  var gameChannel = sh.channel("game", gameId);

  if (req.params.status === "on") {
    global.gUsers[ws.uid].gameId = gameId;  // set my current game
    if (eventEmitter.listeners(gameChannel).indexOf(socketNotify) === -1) {
      shlog.info("(" + ws.uid + ") add game channel: " + gameChannel, ws.games);
      global.socket.notify(gameId, sh.event("event.game.user", {uid: ws.uid, gameId: gameId, status: "online"}));
      ws.games.push(gameId);
      eventEmitter.on(gameChannel, socketNotify);

      // must send myself notifs for games existing online users
      var game = new ShGame();
      game.load(gameId, function (error) {
        if (error) {
          sh.sendWs(ws, 1, sh.error("bad_game", "unable to load game", {gameId: gameId}));
          return;
        }
        var players = game.get("players");
        _.each(_.keys(players), function (uid) {
          if (uid !== ws.uid && !_.isUndefined(global.gUsers[uid])) {
            // are they playing current game
            if (global.gUsers[uid].gameId === gameId) {
              shlog.info("notify self (%s) of player: %s online", ws.uid, uid);
              sh.sendWs(ws, 0, sh.event("event.game.user", {uid: uid, gameId: gameId, status: "online"}));
            }
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
    global.socket.notify(gameId, sh.event("event.game.user", {uid: ws.uid, gameId: gameId, status: "offline"}));
  }

//  sendWs(ws, 0, sh.event("event.live.game", {status: req.params.status, game: gameId}));
  cb(0, sh.event("event.live.game", {status: req.params.status, gameId: gameId}));
};