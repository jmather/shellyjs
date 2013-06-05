var events = require("events");
var async = require("async");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var channel = require(global.gBaseDir + "/functions/channel/channel.js");

var match = exports;

match.desc = "match players to the desired game and start them in it";
match.functions = {
  add: {desc: "add caller to the game matcher", params: {name: {dtype: "string"}}, security: []},
  remove: {desc: "remove caller from the game matcher", params: {name: {dtype: "string"}}, security: []},
  stats: {desc: "list the match stats for all games", params: {}, security: []},
  list: {desc: "list the match players for all games", params: {}, security: []}
};

// SWD: just init a global game queue for now, handles reload
/*
if (_.isUndefined(global.matchq)) {
  global.matchq = {};
  global.matchq.tictactoe = {};
  global.matchq.connect4 = {};
}
*/
if (_.isUndefined(global.matchInfo)) {
  global.matchInfo = {};
  global.matchInfo.tictactoe = {minPlayers: 2, maxPlayers: 2, created: 0, lastCreated: 0, url: "/tictactoe/tictactoe.html"};
  global.matchInfo.connect4 = {minPlayers: 2, maxPlayers: 2, created: 0, lastCreated: 0, url: "/connect4/index.html"};
}

match.add = function (req, res, cb) {
  var uid = req.session.uid;
  var name = req.body.name;

  if (_.isUndefined(global.matchInfo[name])) {
    res.add(sh.error("bad_game", "unknown game", {name: name}));
    return cb(1);
  }

  var ts = new Date().getTime();
  var playerInfo = {uid: uid, posted: ts};
  global.db.popOrPush(req.body.name, global.matchInfo[name].minPlayers, playerInfo, function (err, match) {
    console.log("match popOrPush", err, match);
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
    console.log("players", req.body.players);

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
      channel.sendAll("matches:", req.body.players, sh.event("match.made", matchInfo));

      res.add(sh.event("match", matchInfo));
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

  global.db.dequeue(uid, function (err) {
    res.add(sh.event("match.remove"));
    return cb(0);
  });
};

// SWD - figure out how to store these globally
match.stats = function (req, res, cb) {
//  var counts = {};
//  _.forOwn(global.matchq, function (gameq, idx) {
//    global.matchInfo[idx].waiting = Object.keys(gameq).length;
//  });
  res.add(sh.event("match.stats", global.matchInfo));
  return cb(0);
};

match.list = function (req, res, cb) {
  res.add(sh.event("match.list", global.matchInfo));
  cb(0);
};