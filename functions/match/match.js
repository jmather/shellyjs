var events = require("events");
var async = require("async");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var ShGame = require(global.gBaseDir + "/src/shgame.js");

var match = exports;

match.desc = "match players to the desired game and start them in it";
match.functions = {
  add: {desc: "add caller to the game matcher", params: {name: {dtype: "string"}}, security: []},
  remove: {desc: "remove caller from the game matcher", params: {name: {dtype: "string"}}, security: []},
  counts: {desc: "list the match counts for all games", params: {}, security: []},
  list: {desc: "list the match players for all games", params: {}, security: []}
};

// SWD: just init a global game queue for now, handles reload
if (_.isUndefined(global.matchq)) {
  global.matchq = {};
  global.matchq.tictactoe = {};
}
if (_.isUndefined(global.matchInfo)) {
  global.matchInfo = {};
  global.matchInfo.tictactoe = {minPlayers: 2, maxPlayers: 2};
}

match.add = function (req, res, cb) {
  var uid = req.session.uid;
  var name = req.params.name;

  if (_.isUndefined(global.matchq[name])) {
    cb(1, sh.error("bad_game", "unknown game", {name: name}));
  }

  if (!_.isUndefined(global.matchq[name][uid])) {
    cb(1, sh.error("match_added", "player is already being matched", {uid: uid, name: name}));
    return;
  }

  var keys = Object.keys(global.matchq[name]);
  if (keys.length + 1 >= global.matchInfo[name].maxPlayers) {
    req.params.cmd = "game.create";     // change the command, req.param.name is already set
    req.params.players = keys.slice(0, global.matchInfo[name].maxPlayers);
    req.params.players.push(uid); // add the current user

    sh.call("game.create", req, res, function (error, data) {
      if (error) {
        cb(error, data);
        return;
      }

      var matchInfo = {};
      matchInfo.gameId = data.data.gameId;
      _.each(req.params.players, function (playerId) {
        delete global.matchq[name][playerId];
        matchInfo[playerId] = {};
      });
      _.each(req.params.players, function (playerId) {
        global.socket.notifyUser(playerId, sh.event("event.match.made", matchInfo));
      });

      cb(0, sh.event("event.match", matchInfo));
      return;
    });
  }

  // just add the user
  var ts = new Date().getTime();
  var playerInfo = {uid: uid, posted: ts};
  global.matchq[name][uid] = playerInfo;
  cb(0, sh.event("event.match.add", playerInfo));
};

match.remove = function (req, res, cb) {
  var uid = req.session.uid;
  var name = req.params.name;

  delete global.matchq[name][uid];
  cb(0, sh.event("event.match.remove"));
};

match.counts = function (req, res, cb) {
  var counts = {};
  _.forOwn(global.matchq, function (gameq, idx) {
    counts[idx] = Object.keys(gameq).length;
  });
  cb(0, sh.event("event.match.counts", counts));
};

match.list = function (req, res, cb) {
  cb(0, sh.event("event.match.list", global.matchq));
};