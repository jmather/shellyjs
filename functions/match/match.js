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

// SWD: just init a global game queue for now
if (_.isUndefined(global.matchq)) {
  global.matchq = {};
  global.matchq.tictactoe = {};
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

  var ts = new Date().getTime();
  var playerInfo = {uid: uid, posted: ts};
  global.matchq[name][uid] = playerInfo;

  var keys = Object.keys(global.matchq[name]);
  if (keys.length >= 2) {
    req.params.cmd = "game.create";     // change the command, name is already set
    sh.call("game.create", req, res, function (error, data) {
      if (error) {
        delete global.matchq[name][uid];        // pull the user out, so they can try again
        cb(error, data);
        return;
      }

      // pull any two users for now - SWD might have to order this to be more fair
      var uid1 = keys[0];
      var uid2 = keys[1];
      delete global.matchq[name][uid1];
      delete global.matchq[name][uid2];
      var obj = {};
      obj.gameId = data.data.gameId;
      // just allow users to join - SWD should set the players though
      obj[uid1] = {};
      obj[uid2] = {};
      global.socket.notifyUser(uid1, sh.event("event.match.made", obj));
      global.socket.notifyUser(uid2, sh.event("event.match.made", obj));

      cb(0, sh.event("event.match.add", playerInfo));
    });
  }
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