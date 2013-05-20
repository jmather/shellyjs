var events = require("events");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var Live = exports;

Live.desc = "game state and control module";
Live.functions = {
  list: {desc: "list online users", params: {}, security: []},
  user: {desc: "enable/disable live events for a user", params: {status: {dtype: "string"}}, security: []},
  game: {desc: "enable/disable live events for a user in a game", params: {gameId: {dtype: "string"}, status: {dtype: "string"}}, security: []},
  message: {desc: "send a message to all online users", params: {message: {dtype: "string"}, scope: {dtype: "string"}, value: {dtype: "string"}}, security: []}
};

Live.list = function (req, res, cb) {
  res.add(sh.event("live.list", global.gUsers));
  return cb(0);
};

Live.user = function (req, res, cb) {
  if (_.isUndefined(res.ws)) {
    res.add(sh.error("socket_only_call", "this call can only be made from the socket interafce"));
    return cb(1);
  }

  if (req.body.status === "on") {
    shlog.info("liveUser on: " + res.ws.uid);
    global.gUsers[res.ws.uid].liveUser = "on";

    // notify myself of all users online
    // SWD - this won't work at any scale
    _.forOwn(global.gUsers, function (info, playerId) {
      if (playerId !== res.ws.uid && info.liveUser === "on") {
        // short cut the emmitter since we have ws
        var e = JSON.stringify(sh.event("live.user", {uid: playerId, name: info.name, pic: "", status: "on"}));
        res.ws.send(e);
      }
    });
  }

  var event = sh.event("live.user", {uid: res.ws.uid, name: req.session.user.get("name"), pic: "",  status: req.body.status});
  global.socket.notifyAll(event);

  // turn off here so notifyAll will send to self above
  if (req.body.status === "off") {
    shlog.info("liveUser off: " + res.ws.uid);
    global.gUsers[res.ws.uid].liveUser = "off";
  }

  cb(0);
};

Live.game = function (req, res, cb) {
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
      // store the gameId so we can cleanup on close socket
      res.ws.games.push(req.body.gameId);

      // notify players in this game I am online
      global.socket.notifyUsers(game.get("playerOrder"), sh.event("live.game.user", {uid: res.ws.uid,
        name: req.session.user.get("name"),
        pic: "",
        gameId: req.body.gameId,
        status: "on"}));

      // notify me of any online players in this game
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
      // remove the gameId
      var idx = res.ws.games.indexOf(req.body.gameId);
      if (idx !== -1) {
        res.ws.games.splice(idx, 1);
      }

      // notify the players I am offline
      global.socket.notifyUsers(game.get("playerOrder"), sh.event("live.game.user",
        {uid: res.ws.uid, gameId: req.body.gameId, status: "off"}));
    }
    cb(0);
  });
};

Live.message = function (req, res, cb) {
  var msg = req.body.message;

  var event = sh.event("live.message", {from: req.session.uid, name: req.session.user.get("name"), pic: "", message: msg});
  global.socket.notifyAll(event);

  res.add(sh.event("live.message", {status: "sent"}));
  return cb(0);
};
