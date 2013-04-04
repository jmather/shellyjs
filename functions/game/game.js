var fs = require("fs");
var _ = require("lodash");
var async = require("async");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var ShGame = require(global.gBaseDir + "/src/shgame.js");
var ShUser = require(global.gBaseDir + "/src/shuser.js");  // used by create when pre-populating users
var ShPlaying = require(global.gBaseDir + "/src/shplaying.js");  // used by create when pre-populating users

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
  call: {desc: "call a game specific function", params: {gameId: {dtype: "string"}, func: {dtype: "string"}, args: {dtype: "object"}}, security: []},

  playing: {desc: "list all games user is currently playing", params: {}, security: []}
};

function loadGame(name) {
  var gameFile = gGameDir + "/" + name + "/" + name + ".js";
  // SWD for now clear cache each time - will add server command to reload a module
  // SWD should check for all required functions
  delete require.cache[require.resolve(gameFile)];
  return require(gameFile);
}

game.pre = function (req, res, cb) {
  if (req.body.cmd === "game.list"
      || req.body.cmd === "game.playing") {
    cb(0);
    return;
  }
  if (req.body.cmd === "game.create") {
    var name = req.body.name;
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

  var gameId = req.body.gameId;
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
      cb(1, sh.error("game_require", "unable to load game module", {name: gameName, message: e.message}));
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

function addGamePlaying(uid, game) {
  var playing = new ShPlaying();
  playing.loadOrCreate(uid, function (error, data) {
    playing.addGame(game);
  });
}

function removeGamePlaying(uid, game) {
  var playing = new ShPlaying();
  playing.loadOrCreate(uid, function (error, data) {
    playing.removeGame(game);
  });
}

function addGamePlayingMulti(players, game, cb) {
  async.each(players, function (playerId, cb) {
    addGamePlaying(playerId, game);
    // ignore any errors
    cb();
  }, function (error) {
    if (error) {
      cb(1, error);
      return;
    }
    cb(0);
  });
}

game.create = function (req, res, cb) {
  var uid = req.session.uid;

  var game = new ShGame();

  game.set("gameId", sh.uuid());
  game.set("name", req.body.name);
  game.set("ownerId", uid);
  game.set("whoTurn", uid);

  // add to request environment
  req.env.game = game;

  if (_.isUndefined(req.body.players)) {
    addGamePlaying(uid, game);
    game.setPlayer(uid, "ready");
  } else {
    _.each(req.body.players, function (playerId) {
      game.setPlayer(playerId, "ready");
    });
    addGamePlayingMulti(req.body.players, game, function (error, data) {
      // SWD ignore any errors for now
      if (error) {
        shlog.error("add_players", "unable to add a player", data);
      }
    });
  }

  // SWD make sure init is there
  if (_.isUndefined(req.env.gameModule.create)) {
    cb(0, sh.event("event.game.create", game.getData()));
    return;
  }
  req.env.gameModule.create(req, function (error, data) {
    if (!error && _.isUndefined(data)) {
      data = sh.event("event.game.create", game.getData());
    }
    cb(error, data);
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

  var isNew = !_.isObject(players[uid]);

  addGamePlaying(uid, game);
  game.setPlayer(uid, "ready");

  if (isNew) {
    global.socket.notify(game.get("gameId"), sh.event("event.game.user.join", {gameId: game.get("gameId"), uid: uid}));
  }

  sh.extendProfiles(game.get("players"), function (error, data) {
    if (error) {
      cb(1, sh.error("user_info", "unable to load users for this game", data));
      return;
    }
    cb(0, sh.event("event.game.join", game.getData()));
  });
};

game.leave = function (req, res, cb) {
  var uid = req.session.uid;
  var game = req.env.game;

  var playing = new ShPlaying();
  playing.loadOrCreate(uid, function (error, data) {
    if (error) {
      cb(1, sh.error("playing_load", "unable to load playing list", {uid: uid}));
      return;
    }
    playing.removeGame(game);
  });

  global.socket.notify(game.get("gameId"), sh.event("event.game.user.leave", {gameId: game.get("gameId"), uid: uid}));

  cb(0, sh.event("event.game.leave", game.get("players")));
};

game.kick = function (req, res, cb) {
  var kickId = req.body.kickId;
  var game = req.env.game;

  // SWD check user
  game.players[kickId] = {status: "kicked"};
  game.setPlayer(kickId, "kicked");

  cb(0, sh.event("event.game.leave", game.get("players")));
};

game.turn = function (req, res, cb) {
  var uid = req.session.uid;
  var gameId = req.body.gameId;
  // fast and loose - muse setData before return or sub call
  var game = req.env.game.getData();

  if (Object.keys(game.players).length < game.minPlayers) {
    cb(2, sh.error("players_missing", "not enough players in game", {required: game.minPlayers, playerCount: Object.keys(game.players).length}));
    return;
  }

  if (game.status === "over") {
    cb(0, sh.event("event.game.over", game));
    return;
  }

  if (game.whoTurn !== uid) {
    cb(1, sh.error("game_noturn", "not your turn", {whoTurn: game.whoTurn}));
    return;
  }
  var nextIndex = game.playerOrder.indexOf(uid) + 1;
  if (nextIndex === game.playerOrder.length) {
    nextIndex = 0;
  }
  game.whoTurn = game.playerOrder[nextIndex];
  game.turnsPlayed += 1;
  game.status = "playing";  // turn looks valid, game module sets "over"

  //SWD make sure turn function is there
  req.env.gameModule.turn(req, function (error, data) {
    if (error === 0) {
      if (_.isUndefined(data)) {  // fill in the game info if not already by the game
        data = sh.event("event.game.info", game);
      }
      // notify others listening to game
      global.socket.notify(gameId, data);
      // notify any player of turn change
      _.forEach(game.playerOrder, function (playerId) {
        global.socket.notifyUser(playerId, sh.event("event.game.turn.next", {gameId: gameId,
          whoTurn: game.whoTurn,
          name: (game.whoTurn === "0" ? "no one" : game.players[game.whoTurn].name),
          pic: ""
          }));
      });
    }
    // already sent on the socket notify
    if (_.isObject(res.ws)) {
      cb(0);
      return;
    }
    cb(error, data);
  });
};

game.get = function (req, res, cb) {
  // SWD - game is bad name for this all over
  var game = req.env.game;

  cb(0, sh.event("event.game.info", game.getData()));
};

game.set = function (req, res, cb) {
  var game = req.env.game;
  var newGame = req.body.game;

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

  if (_.isUndefined(req.env.gameModule)) {
    cb(1, sh.error("game_reset", "this game has no reset"));
    return;
  }

  req.env.gameModule.reset(req, function (error, data) {
    if (error === 0) {
      // notify live.game listeners
      global.socket.notify(game.gameId, data);
      // notify live.users that are in this game
      _.forEach(game.playerOrder, function (playerId) {
        global.socket.notifyUser(playerId, sh.event("event.game.turn.next", {gameId: game.gameId,
          whoTurn: game.whoTurn,
          name: (game.whoTurn === "0" ? "no one" : game.players[game.whoTurn].name),
          pic: ""
          }));
      });
    }
    // already sent on the socket notify
    if (_.isObject(res.ws)) {
      cb(0);
      return;
    }
    cb(error, data);
  });
};

function getInfo(name) {
  shlog.info("getInfo name=" + name);
  var cmdFile = gGameDir + "/" + name + "/" + name + ".js";

  var m = {};
  m.error = 0;
  m.path = cmdFile;
  m.name = name;
  m.author = "scott";
  m.desc = "none";
  m.functions = {};

  var funcModule = null;
  try {
    delete require.cache[require.resolve(cmdFile)];
    funcModule = require(cmdFile);
  } catch (e) {
    m.error = 100;
    m.info = "unable to load module";
    return m;
  }
  if (!_.isUndefined(funcModule.desc)) {
    m.desc = funcModule.desc;
  }
  if (!_.isUndefined(funcModule.functions)) {
    m.functions = funcModule.functions;
  }
  return m;
}

game.list = function (req, res, cb) {
  shlog.info("game.list");

  var games = {};
  var gGameDir = global.gBaseDir + "/games";
  fs.readdir(gGameDir, function (err, files) {
    var error = 0;
    var fileCount = files.length;
    files.forEach(function (entry) {
      var fn = gGameDir + "/" + entry;
      fs.stat(fn, function (err, stat) {
        if (stat.isDirectory()) {
          var m = getInfo(entry);
          if (m.error) {
            error = 1;
          }
          games[m.name] = m;
        }
        fileCount -= 1;
        if (fileCount === 0) {
          cb(error, games);
        }
      });
    });
  });

};

game.call = function (req, res, cb) {
  shlog.info("game.call - req.body.func");
  var module = req.env.gameModule;

  if (_.isUndefined(module[req.body.func])) {
    cb(1, sh.error("game_call", "function does not exist", {func: req.body.func}));
    return;
  }

  req.env.gameModule[req.body.func](req, cb);
};

/////////////// Playing functions

function fillGames(gameList, cb) {
  var gameIds = Object.keys(gameList);
  async.each(gameIds, function (gameId, lcb) {
    var game = new ShGame();
    game.load(gameId, function (error, data) {
      if (error) {
        lcb(data);
        return;
      }
      gameList[gameId].whoTurn = game.get("whoTurn");
      gameList[gameId].players = game.get("players");
      lcb();
    });
  }, function (error) {
    if (error) {
      cb(1, error);
      return;
    }
    cb(0, gameList);
  });
}

game.playing = function (req, res, cb) {
  var uid = req.session.uid;

  var playing = new ShPlaying();
  playing.loadOrCreate(uid, function (error, data) {
    if (error) {
      cb(1, sh.error("playing_load", "unable to load playing list", {uid: uid}));
      return;
    }
    fillGames(playing.getData().currentGames, function (error, data) {
      if (!error) {
        cb(0, sh.event("event.game.playing", data));
      } else {
        cb(error, data);
      }
    });
  });
};