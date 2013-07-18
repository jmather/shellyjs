var events = require("events");
var async = require("async");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var dispatch = require(global.gBaseDir + "/src/dispatch.js");

var match = exports;

match.desc = "match players to the desired game and start them in it";
match.functions = {
  add: {desc: "add caller to the game matcher", params: {name: {dtype: "string"}}, security: []},
  remove: {desc: "remove caller from the game matcher", params: {name: {dtype: "string"}}, security: []},
  list: {desc: "list the match players for a game", params: {name: {dtype: "string"}}, security: []},
  count: {desc: "count the users waiting for a game", params: {name: {dtype: "string"}}, security: []},
  info: {desc: "list the games avaliable", params: {}, security: []},
  stats: {desc: "list the match stats for all games", params: {}, security: []}
};

match.add = function (req, res, cb) {
  var uid = req.session.uid;
  var name = req.body.name;

  if (_.isUndefined(global.matchInfo[name])) {
    res.add(sh.error("bad_game", "unknown game", {name: name}));
    return cb(1);
  }

  var ts = new Date().getTime();
  var playerInfo = {uid: uid, posted: ts};
  global.db.popOrPush(name, global.matchInfo[name].minPlayers, playerInfo, function (err, match) {
    if (err === 2) {
      res.add(sh.error("match_added", "player is already being matched", {uid: uid, name: name}));
      return cb(err);
    }

    if (match === null) {
      // we just inserted the user in the match table
      res.add(sh.event("match.add", playerInfo));
      return cb(0);
    }

    // match found
    req.body.cmd = "game.create";     // change the command, req.param.name is already set
    req.body.players = [match[0].uid];   // add the waiting user
    req.body.players.push(uid);       // add the current user

    global.matchInfo[name].lastCreated = new Date().getTime();
    global.matchInfo[name].created += 1;

    sh.call(req, res, function (error) {
      if (error) {
        return cb(error);
      }

      var matchInfo = {};
      matchInfo.gameId = req.env.game.get("oid");
      matchInfo.gameName = name;
      _.each(req.body.players, function (playerId) {
        matchInfo[playerId] = {};
      });
      dispatch.sendUsers(req.body.players, sh.event("match.made", matchInfo));

      res.add(sh.event("match.made", matchInfo));
      return cb(0);
    });
  });
};

match.remove = function (req, res, cb) {
  var uid = req.session.uid;
  var name = req.body.name;

  if (_.isUndefined(global.matchInfo[name])) {
    res.add(sh.error("bad_game", "unknown game", {name: name}));
    return cb(1);
  }

  global.db.dequeue(name, uid, function (err) {
    res.add(sh.event("match.remove"));
    return cb(0);
  });
};

match.list = function (req, res, cb) {
  if (_.isUndefined(global.matchInfo[req.body.name])) {
    res.add(sh.error("bad_game", "unknown game", {name: req.body.name}));
    return cb(1);
  }

  global.db.get(req.body.name, function (err, data) {
    if (err) {
      res.add(sh.error("no_list", "unable to get match list", {name: req.body.name}));
      return cb(1);
    }
    res.add(sh.event("match.list", JSON.parse(data)));
    return cb(0);
  });
};

match.count = function (req, res, cb) {
  if (_.isUndefined(global.matchInfo[req.body.name])) {
    res.add(sh.error("bad_game", "unknown game", {name: req.body.name}));
    return cb(1);
  }

  global.db.get(req.body.name, function (err, data) {
    if (err) {
      res.add(sh.error("no_list", "unable to get match list", {name: req.body.name}));
      return cb(1);
    }
    var queue = JSON.parse(data);
    var count = 0;
    if (queue !== null) {
      count = queue.length;
    }
    res.add(sh.event("match.count", {name: req.body.name, waiting: count}));
    return cb(0);
  });
};

match.info = function (req, res, cb) {
  res.add(sh.event("match.info", global.matchInfo));
  cb(0);
};

// SWD - figure out how to store these globally
match.stats = function (req, res, cb) {
//  var counts = {};
//  _.forOwn(global.matchq, function (gameq, idx) {
//    global.matchInfo[idx].waiting = Object.keys(gameq).length;
//  });
  res.add(sh.event("match.stats", {}));
  return cb(0);
};

