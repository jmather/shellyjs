var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var Live = exports;

Live.desc = "game state and control module";
Live.functions = {
  list: {desc: "list online users", params: {}, security: []},
  user: {desc: "enable/disable live events for a user", params: {status: {dtype: "string"}}, security: []},
  game: {desc: "enable/disable live events for a user in a game", params: {gameId: {dtype: "string"}, status: {dtype: "string"}}, security: []},
  message: {desc: "send a message to all online users", params: {channel: {dtype: "string"}, message: {dtype: "string"}}, security: []}
};

Live.list = function (req, res, cb) {
  var users = {};
  _.forOwn(global.gUsers, function (prop, key, obj) {
    users[key] = _.omit(obj[key], "ws");
  });
  res.add(sh.event("live.list", users));
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

    // send down any messages for channel
    req.loader.get("kMessageBank", "lobby:0", function (err, ml) {
      if (!err) {
        res.add(sh.event("live.message", ml.get("bank")));
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

      // send down any messages for channel
      req.loader.get("kMessageBank", "game:" + req.body.gameId, function (err, ml) {
        if (!err) {
          res.add(sh.event("live.message", ml.get("bank")));
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
  shlog.info("live.message: ", req.body.channel, req.body.message);

  var msgBlock = {channel: req.body.channel,
    from: req.session.uid,
    name: req.session.user.get("name"),
    pic: "",
    message: req.body.message};
  var event = sh.event("live.message", [msgBlock]);

  var channelParts = req.body.channel.split(":");
  // SWD beef up the error detect
  if (channelParts[0] === "lobby") {
    global.socket.notifyAll(event);
  } else if (channelParts[0] === "game") {
    req.loader.exists("kGame", channelParts[1], function (err, game) {
      if (!err) {
        console.log(game.get("playerOrder"));
        global.socket.notifyUsers(game.get("playerOrder"), event);
      }
    });
  }

  req.loader.get("kMessageBank", req.body.channel, function (err, ml) {
    ml.add(msgBlock);
    return cb(0);
  });
};
