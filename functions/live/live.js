var events = require("events");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var live = exports;

live.desc = "game state and control module";
live.functions = {
  list: {desc: "list online users", params: {}, security: []},
  user: {desc: "enable/disable live events for a user", params: {status: {dtype: "string"}}, security: []},
  game: {desc: "enable/disable live events for a user in a game", params: {gameId: {dtype: "string"}, status: {dtype: "string"}}, security: []},
  message: {desc: "send a message to all online users", params: {message: {dtype: "string"}, scope: {dtype: "string"}, value: {dtype: "string"}}, security: []}
};

live.list = function (req, res, cb) {
  res.add(sh.event("live.list", global.gUsers));
  return cb(0);
};

live.user = function (req, res, cb) {
  if (_.isUndefined(res.ws)) {
    res.add(sh.error("socket_only_call", "this call can only be made from the socket interafce"));
    return cb(1);
  }
  var status = req.body.status;
  var ws = res.ws;

  if (status === "on") {
    global.gUsers[ws.uid].liveUser = "on";

    // notify myself of all users online
    // SWD - this won't work at any scale
    _.forOwn(global.gUsers, function (info, playerId) {
      if (playerId !== ws.uid && info.liveUser === "on") {
        // short cut the emmitter since we have ws
        var e = JSON.stringify(sh.event("live.user", {uid: playerId, name: info.name, pic: "", status: "on"}));
        ws.send(e);
      }
    });
  }

  var event = sh.event("live.user", {uid: ws.uid, name: req.session.user.get("name"), pic: "",  status: status});
  global.socket.notifyAll(event);

  if (status === "off") {
    shlog.info("(" + ws.uid + ") turn off live user");
    // turn off now so notifyAll will send above
    global.gUsers[ws.uid].liveUser = "off";
  }

  cb(0);
};

live.game = function (req, res, cb) {
  if (_.isUndefined(res.ws)) {
    res.add(sh.error("socket_only_call", "this call can only be made from the socket interafce"));
    return cb(1);
  }
  req.loader.get("kGame", req.body.gameId, function (error, game) {
    if (error) {
      sh.sendWs(res.ws, 1, sh.error("bad_game", "unable to load game", {gameId: req.body.gameId}));
      return cb(1);
    }

    if (req.body.status === "on") {
      // notify game players I'm on
      global.socket.notifyUsers(game.get("playerOrder"), sh.event("live.game.user", {uid: res.ws.uid,
        name: req.session.user.get("name"),
        pic: "",
        gameId: req.body.gameId,
        status: "on"}));
      // store the gameId so we can cleanup on close socket
      res.ws.games.push(req.body.gameId);

      // must send myself notifs for games existing online users
      var players = game.get("players");
      _.each(_.keys(players), function (uid) {
        if (uid !== res.ws.uid && !_.isUndefined(global.gUsers[uid])) {
          shlog.info("notify self (%s) of player: %s online", res.ws.uid, uid);
          var userConn = global.gUsers[uid];
          sh.sendWs(res.ws, 0, sh.event("live.game.user", {uid: uid,
            name: userConn.name,
            pic: "",
            gameId: req.body.gameId,
            status: "on"}));
        }
      });
    } else {
      shlog.info("(" + res.ws.uid + ") remove game from socket", res.ws.games);
      var idx = res.ws.games.indexOf(req.body.gameId);
      if (idx !== -1) {
        res.ws.games.splice(idx, 1);
      }
      global.socket.notifyUsers(game.get("playerOrder"), sh.event("live.game.user",
        {uid: res.ws.uid, gameId: req.body.gameId, status: "off"}));
    }
    cb(0);
  });
};

live.message = function (req, res, cb) {
  var msg = req.body.message;

  var event = sh.event("live.message", {from: req.session.uid, name: req.session.user.get("name"), pic: "", message: msg});
  global.socket.notifyAll(event);

  res.add(sh.event("live.message", {status: "sent"}));
  return cb(0);
};
