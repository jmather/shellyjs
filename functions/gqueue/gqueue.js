var events = require("events");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var ShGame = require(global.gBaseDir + "/src/shgame.js");

//var game = require(global.gBaseDir + "/functions/game/game.js");

var gqueue = exports;

gqueue.desc = "game state and control module";
gqueue.functions = {
  add: {desc: "add a game to the queue", params: {gameId: {dtype: "string"}}, security: []},
  remove: {desc: "remove a game from the list", params: {gameId: {dtype: "string"}}, security: []},
  nextAvailable: {desc: "get the next available game", params: {}, security: []},
  list: {desc: "return a list of available games", params: {limit: {dtype: "number"}}, security: []}
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
  if (!_.isUndefined(found)) {
    cb(1, sh.error("queue_add", "game already in queue", {gameId: gameId}));
    return;
  }

  var game = new ShGame();
  game.load(gameId, function (error, data) {
    if (error !== 0) {
      cb(error, data);
      return;
    }

    var gameRaw = game.getData();
    if (gameRaw.playerOrder.length === gameRaw.maxPlayers) {
      cb(1, sh.error("game_full", "game is already full", {gameId: gameId}));
      return;
    }
    var ts = new Date().getTime();
    var gameInfo = {gameId: gameId,
      name: gameRaw.name,
      playerCount: gameRaw.playerOrder.length,
      minPlayers: gameRaw.minPlayers,
      maxPlayers: gameRaw.maxPlayers,
      ts: ts};
    global.gq.push(gameInfo);

    global.socket.notifyAll(sh.event("gqueue.game.add", gameInfo));

    cb(0, sh.event("event.gqueue.game.add", gameInfo));
  });
};

gqueue.remove = function (req, res, cb) {
  var gameId = req.params.gameId;

  var gameInfo = null;
  _.forOwn(global.gq, function (game, idx) {
    if (game.gameId === gameId) {
      gameInfo = global.gq.splice(idx, 1);
      global.socket.notifyAll(sh.event("gqueue.game.remove", gameInfo));
      return false;
    }
  });

  if (gameInfo === null) {
    cb(0, sh.error("no_game", "no game to remove", {gameId: gameId}));
  } else {
    cb(0, sh.event("event.gqueue.game.remove", gameInfo));
  }
};

gqueue.nextAvailable = function (req, res, cb) {
  if (global.gq.length === 0) {
    cb(1, sh.error("queue_none", "no games available"));
    return;
  }
  var gameInfo = global.gq.shift();

  req.params.gameId = gameInfo.gameId;
  sh.call("game.join", req, res, function (error, data) {
    // SWD - have to check user count and game.change or game.remove
    if (error !== 0) {
      // check to see if game is really full and valid
      // put the game back in the available queue
      global.gq.unshift(gameInfo);
    } else {
      global.socket.notifyAll(sh.event("gqueue.game.remove", gameInfo));
      data.event = "event.gqueue.found";
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