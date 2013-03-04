var events = require("events");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var game = require(global.gBaseDir + "/functions/game/game.js");

var gqueue = exports;

gqueue.desc = "game state and control module";
gqueue.functions = {
  add: {desc: "add a game to the queue", params: {gameId: {dtype: "string"}, data: {dtype: "object"}}, security: []},
  remove: {desc: "remove a game from the list", params: {gameId: {dtype: "string"}}, security: []},
  nextAvailable: {desc: "get the next available game", params: {}, security: []},
  list: {desc: "return a list of available games", params: {limit: {dtype: "int"}}, security: []}
};

// SWD: just init a global game queue for now
if (_.isUndefined(global.gq)) {
  global.gq = [];
}

gqueue.add = function (req, res, cb) {
  var gameId = req.params.gameId;
  var data = req.params.data;

  // SWD: this will be too slow, change to hash presence list for data, and check/add/remove from that also
  var found = _.find(global.gq, {gameId: gameId});
  if (!_.isUndfined(found)) {
    cb(1, sh.error("queue_add", "game already in queue", {gameId: gameId}));
    return;
  }

  var ts = new Date().getTime();
  var gameInfo = {gameId: gameId, data: data, ts: ts};
  global.gq.push(gameInfo);
  cb(0, sh.event("event.gqueue.game.add", gameInfo));
};

gqueue.remove = function (req, res, cb) {
  var gameId = req.params.gameId;

  var gameInfo = null;
  _.each(global.gq, function (game, idx) {
    if (game.gameId === gameId) {
      gameInfo = global.gq.splice(idx, 1);
      return false;
    }
    return true;
  });

  cb(0, sh.event("event.gqueue.game.remove", gameInfo));
};

gqueue.nextAvailable = function (req, res, cb) {
  if (global.gq.length === 0) {
    cb(1, sh.error("queue_none", "no games available"));
    return;
  }
  var gameInfo = global.gq.shift();

  req.params.gameId = gameInfo.gameId;
  sh.call("game.join", req, res, function (error, data) {
    if (error !== 0) {
      // check to see if game is really full and valid
      // put the game back in the available queue
      global.gq.unshift(gameInfo);
    }
    // data already an event from game.join
    cb(error, data);
  });
};

gqueue.list = function (req, res, cb) {
  var limit = req.params.limit;
  if (limit > 0) {
    cb(0, global.gq.slice(0, limit));
    return;
  }
  cb(0, sh.event("event.gqueue.list", global.gq));
};