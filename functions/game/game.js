var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var ShGame = require(global.gBaseDir + "/src/shgame.js");

var db = global.db;

var gGameDir = global.gBaseDir + "/games";

var game = exports;

game.desc = "game state and control module";
game.functions = {
  create: {desc: "create a new game", params: {name: {dtype: "string"}}, security: []},
  start: {desc: "start a game", params: {gameId: {dtype: "string"}}, security: []},
  join: {desc: "join an existing game", params: {gameId: {dtype: "string"}}, security: []},
  leave: {desc: "leave an existing game", params: {gameId: {dtype: "string"}}, security: []},
  kick: {desc: "kick a user out of game and prevent return", params: {gameId: {dtype: "string"}, kickId: {dtype: "string"}}, security: []},
  turn: {desc: "calling user taking their turn", params: {gameId: {dtype: "string"}}, security: []},
  end: {desc: "end a game", params: {gameId: {dtype: "string"}, message: {dtype: "string"}}, security: []},
  get: {desc: "get game object", params: {gameId: {dtype: "string"}}, security: []},
  set: {desc: "set game object", params: {gameId: {dtype: "string"}, game: {dtype: "object"}}, security: []},
  reset: {desc: "reset game for another round", params: {gameId: {dtype: "string"}}, security: []},

  list: {desc: "list all loaded games", params: {}, security: []},
  call: {desc: "call a game specific function", params: {gameId: {dtype: "string"}, func: {dtype: "string"}, args: {dtype: "object"}}, security: []}
};

function loadGame(name) {
  var gameFile = gGameDir + "/" + name + "/" + name + ".js";
  // SWD for now clear cache each time - will add server command to reload a module
  // SWD should check for all required functions
  delete require.cache[require.resolve(gameFile)];
  return require(gameFile);
}

game.pre = function (req, res, cb) {
  if (req.params.cmd === "game.create") {
    var name = req.params.name;
    try {
      shlog.info("game.pre: game.create = " + name);
      req.env.gameModule = loadGame(name);
      cb(0);
      return;
    } catch (e) {
      cb(1, sh.error("game_require", "unable to load game module", {name: name, info: e.message}));
      return;
    }
  }

  var gameId = req.params.gameId;
  shlog.info("game.pre: populating game info for " + gameId);
  var game = new ShGame();
  game.load(gameId, function (error, data) {
    if (error !== 0) {
      cb(error, data);
      return;
    }
    var gameName = game.get("name");
    try {
      shlog.info("game.pre: setting game:" + gameName + " = " + gameId);
      req.env.gameModule = loadGame(gameName);
    } catch (e) {
      cb(1, sh.error("game_require", "unable to laod game module", {name: gameName, message: e.message}));
      return;
    }

    req.env.game = game;
    cb(0);
  });
};

game.post = function (req, rs, cb) {
  shlog.info("game.post");
  if (_.isUndefined(req.env.game)) { // no game to save
    cb(0);
    return;
  }
  shlog.info("game.post - saving game");

  req.env.game.save(cb);
};

game.create = function (req, res, cb) {
  var uid = req.session.uid;

  var game = new ShGame();

  db.nextId("game", function (err, data) {
    game.set("gameId", data.toString());
    game.set("name", req.params.name);
    game.set("ownerId", uid);
    game.setPlayer(uid, "ready");
    game.set("whoTurn", uid);

    // add to request environment
    req.env.game = game;

    req.session.user.addGame(game);

    // SWD make sure init is there
    req.env.gameModule.create(req, function (error, data) {
      if (error !== 0) {
        if (_.isUndefined(data)) {
          data = sh.event("event.game.info", game.getData());
        }
      }
      cb(error, data);
    });
  });
};

game.start = function (req, res, cb) {
  var game = req.env.game;

  game.set("status", "playing");

  cb(0, game.getData());
};

game.end = function (req, res, cb) {
  var game = req.env.game;

  game.set("status", "over");

  cb(0, game.getData());
};

game.join = function (req, res, cb) {
  var uid = req.session.uid;
  var game = req.env.game;
  var user = req.session.user;

  var players = game.get("players");
  if (_.isUndefined(players[uid]) && Object.keys(players).length === game.get("maxPlayers")) {
    cb(1, sh.error("game_full", "game has maximum amount of players", {maxPlayers: game.get("maxPlayers")}));
    return;
  }

  user.addGame(game);
  if (typeof (players[uid]) !== "object") {
    // only notify if new user
    global.live.notify(game.gameId, sh.event("event.game.user.join", {uid: uid}));
  }
  game.setPlayer(uid, "ready");

  cb(0, sh.event("event.game.info", game.getData()));
};

game.leave = function (req, res, cb) {
  var uid = req.session.uid;
  var game = req.env.game;

//	game.setPlayer(uid, "left");
  game.removePlayer(uid);

  global.live.notify(game.gameId, sh.event("event.game.user.leave", {uid: uid}));
  cb(0, sh.event("event.game.leave", game.get("players")));
};

game.kick = function (req, res, cb) {
  var kickId = req.params.kickId;
  var game = req.env.game;

  // SWD check user
  game.players[kickId] = {status: "kicked"};
  game.setPlayer(kickId, "kicked");

  cb(0, sh.event("event.game.leave", game.get("players")));
};

game.turn = function (req, res, cb) {
  var uid = req.session.uid;
  var gameId = req.params.gameId;
  // fast and loose - muse setData before return or sub call
  var game = req.env.game.getData();

  if (game.status === "over") {
    cb(0, sh.event("event.game.over", game));
    return;
  }

  if (game.whoTurn !== uid) {
    cb(1, sh.error("game_noturn", "not your turn", {whoTurn: game.whoTurn}));
  } else {
    var nextIndex = game.playerOrder.indexOf(uid) + 1;
    if (nextIndex === game.playerOrder.length) {
      nextIndex = 0;
    }
    game.whoTurn = game.playerOrder[nextIndex];
    game.turnsPlayed += 1;

    req.env.game.set(game);

    //SWD make sure turn function is there
    req.env.gameModule.turn(req, function (error, data) {
      if (error === 0) {
        if (_.isUndefined(data)) {  // fill in the game info if not already by the game
          data = sh.event("event.game.info", game);
        }
        global.live.notify(gameId, data);  // notify others
      }
      cb(error, data);
    });
  }
};

game.get = function (req, res, cb) {
  // SWD - game is bad name for this all over
  var game = req.env.game;

  cb(0, sh.event("event.game.info", game.getData()));
};

game.set = function (req, res, cb) {
  var game = req.env.game;
  var newGame = req.params.game;

  game.setData(newGame);

  cb(0, sh.event("event.game.info", game.getData()));
};

game.reset = function (req, res, cb) {
  var game = req.env.game.getData();

  game.rounds += 1;
  game.turns = 0;
  game.whoTurn = game.ownerId;
  game.status = "playing";
  game.winner = null;

  req.env.game.setData(game);

  // SWD - should change to gameModule.reset
  req.env.gameModule.create(req, function (error, data) {
    if (error === 0) {
      global.live.notify(game.gameId, data);
      if (_.isUndefined(data)) {
        data = sh.event("event.game.info", game);
      }
    }
    cb(error, data);
  });
};

game.list = function (req, res, cb) {
  shlog.info("game.list");

  cb(0, sh.event("not_implemented"));
};

game.call = function (req, res, cb) {
  shlog.info("game.call - req.params.func");
  var module = req.env.gameModule;

  if (_.isUndefined(module[req.params.func])) {
    cb(1, sh.error("game_call", "function does not exist", {func: req.params.func}));
    return;
  }

  req.env.gameModule[req.params.func](req, cb);
};