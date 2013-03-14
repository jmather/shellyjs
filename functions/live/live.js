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
  var status = req.params.status;

  var eventEmitter = res.eventEmitter;
  var socketNotify = res.socketNotify;
  var ws = res.ws;

  /*
  if(global.gUsers[ws.uid].liveUser === status) {
    cb(0);
    return;
  }
  */

  // allows socket close to notify off
  global.gUsers[ws.uid].liveUser = status;

  var userChannel = sh.channel("user", ws.uid);
  if (status === "on") {
    if (eventEmitter.listeners(userChannel).indexOf(socketNotify) === -1) {
      shlog.info("(" + ws.uid + ") add user channel: " + userChannel);
      eventEmitter.on(userChannel, socketNotify);
    }
  } else {
    shlog.info("(" + ws.uid + ") remove user channel: " + userChannel);
    eventEmitter.removeAllListeners(userChannel);
  }

  // notify all users that I'm online
  var onoffLine = (status === "on" ? "online" : "offline");
  var event = sh.event("event.live.user", {uid: ws.uid, name: req.session.user.get("name"), pic: "",  status: onoffLine});
  global.socket.notifyAll(event);
  if (status === "on") {
    // notify myself of all users online
    _.forOwn(global.gUsers, function (info, playerId) {
      if(playerId !== ws.uid) {
        // short cut the emmitter since we have ws
        var e = JSON.stringify(sh.event("event.live.user", {uid: playerId, name: info.name, pic: "", status: "online"}));
        ws.send(e);
      }
    });
  }

  cb(0);
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
      global.socket.notify(gameId, sh.event("event.live.game.user", {uid: ws.uid,
        name: req.session.user.get("name"),
        pic: "",
        gameId: gameId,
        status: "online"}));
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
              var userConn = global.gUsers[uid];
              sh.sendWs(ws, 0, sh.event("event.live.game.user", {uid: uid,
                name: userConn.name,
                pic: "",
                gameId: gameId,
                status: "online"}));
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
    global.socket.notify(gameId, sh.event("event.live.game.user", {uid: ws.uid, gameId: gameId, status: "offline"}));
  }

//  sendWs(ws, 0, sh.event("event.live.game", {status: req.params.status, game: gameId}));
  cb(0, sh.event("event.live.game", {status: req.params.status, gameId: gameId}));
};