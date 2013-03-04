var events = require("events");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var ShGame = require(global.gBaseDir + "/src/shgame.js");

var live = exports;

live.desc = "game state and control module";
live.functions = {
  user: {desc: "enable/disable live events for a user", params: {status: {dtype: "string"}}, security: []},
  game: {desc: "enable/disable live events for a user in a game", params: {gameId: {dtype: "string"}, status: {dtype: "string"}}, security: []}
};

function channel(name, id) {
  return "notify." + name + "." + id;
}

function sendWs(ws, error, data) {
  var msg = JSON.stringify(data);
  shlog.send(error, "live - (%s) %s", ws.uid, msg);
  ws.send(msg);
}

live.user = function (req, res, cb) {
  cb(1, sh.error("not_implemented"));
};

live.game = function (req, res, cb) {
  console.log("really?");
  console.trace();
  var gameId = req.params.gameId;
  var gameChannel = channel("game", gameId);

  var eventEmitter = res.eventEmitter;
  var socketNotify = res.socketNotify;
  var ws = res.ws;

  if (req.params.status === "on") {
    if (eventEmitter.listeners(gameChannel).indexOf(socketNotify) === -1) {
      shlog.info("(" + ws.uid + ") add game channel: " + gameChannel, ws.games);
      global.live.notify(gameId, sh.event("event.game.user.online", {uid: ws.uid}));
      ws.games.push(gameId);
      eventEmitter.on(gameChannel, socketNotify);

      // must send myself notifs for games existing online users
      var game = new ShGame();
      game.load(gameId, function (error) {
        if (error) {
          sendWs(ws, 1, sh.error("bad_game", "unable to load game", {gameId: gameId}));
          return;
        }
        var players = game.get("players");
        _.each(_.keys(players), function (uid) {
          if (uid !== ws.uid && !_.isUndefined(global.gUsers[uid])) {
            shlog.info("notify self (%s) of player: %s online", ws.uid, uid);
            sendWs(ws, 0, sh.event("event.game.user.online", {uid: uid}));
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
    global.live.notify(gameId, sh.event("event.game.user.offline", {uid: ws.uid}));
  }

//  sendWs(ws, 0, sh.event("event.live.game", {status: req.params.status, game: gameId}));
  cb(0, sh.event("event.live.game", {status: req.params.status, game: gameId}));
};