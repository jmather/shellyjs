var fs = require("fs");
var _ = require("lodash");
var async = require("async");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

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

function loadGameModule(name) {
  var gameFile = gGameDir + "/" + name + "/" + name + ".js";
  // SWD for now clear cache each time - will add server command to reload a module
  // SWD should check for all required functions
  delete require.cache[require.resolve(gameFile)];
  return require(gameFile);
}

game.pre = function (req, res, cb) {
  req.env.game = null;

  if (req.body.cmd === "game.list"
      || req.body.cmd === "game.playing") {
    return cb(0);
  }
  if (req.body.cmd === "game.create") {
    var name = req.body.name;
    try {
      shlog.info("game.pre: game.create = " + name);
      req.env.gameModule = loadGameModule(name);
      return cb(0);
    } catch (e) {
      res.add(sh.error("game_require", "unable to load game module", {name: name, info: e.message}));
      return cb(1);
    }
  }

  var gameId = req.body.gameId;
  shlog.info("game.pre: populating game info for " + gameId);
  req.loader.exists("kGame", gameId, function (error, game) {
    if (error) {
      if (req.body.cmd === "game.leave") {  // always alow user to remove a bad game
        return cb(0);
      }
      res.add(sh.error("game_load", "unable to load game data in game.pre", {gameId: req.body.gameId}));
      return cb(1);
    }
    var gameName = game.get("name");
    try {
      shlog.info("game.pre: setting game:" + gameName + " = " + gameId);
      req.env.gameModule = loadGameModule(gameName);
    } catch (e) {
      res.add(sh.error("game_require", "unable to load game module", {name: gameName, message: e.message}));
      return cb(1);
    }

    req.env.game = game;
    return cb(0);
  });
};

game.post = function (req, rs, cb) {
  shlog.info("game.post");
  return cb(0);
};

function addGamePlaying(loader, uid, game) {
  loader.get("kPlaying", uid, function (error, playing) {
    playing.addGame(game);
  });
}

function removeGamePlaying(loader, uid, game) {
  loader.loadOrCreate(uid, function (error, playing) {
    // SWD check error
    if (!error) {
      playing.removeGame(game);
    }
  });
}

function addGamePlayingMulti(loader, players, game, cb) {
  async.each(players, function (playerId, cb) {
    addGamePlaying(loader, playerId, game);
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
  shlog.info("game.create");
  var uid = req.session.uid;

  var game = req.loader.create("kGame", sh.uuid());

  game.set("name", req.body.name);
  game.set("ownerId", uid);
  game.set("whoTurn", uid);

  // add to request environment
  req.env.game = game;

  if (_.isUndefined(req.body.players)) {
    addGamePlaying(req.loader, uid, game);
    game.setPlayer(uid, "ready");
  } else {
    _.each(req.body.players, function (playerId) {
      game.setPlayer(playerId, "ready");
    });
    addGamePlayingMulti(req.loader, req.body.players, game, function (error, data) {
      // SWD ignore any errors for now
      if (error) {
        shlog.error("add_players", "unable to add a player", data);
      }
    });
  }

  // just use default game data if create no there
  if (_.isUndefined(req.env.gameModule.create)) {
    res.add(sh.event("event.game.create", game.getData()));
    return cb(0);
  }
  req.env.gameModule.create(req, res, cb);
};

game.start = function (req, res, cb) {
  var game = req.env.game;

  game.set("status", "playing");

  res.add(sh.event("event.game.start", game.getData()));
  return cb(0);
};

game.end = function (req, res, cb) {
  var game = req.env.game;

  game.set("status", "over");

  res.add(sh.event("event.game.end", game.getData()));
  return cb(0);
};

game.join = function (req, res, cb) {
  var uid = req.session.uid;
  var game = req.env.game;
  var user = req.session.user;

  var players = game.get("players");
  if (_.isUndefined(players[uid]) && Object.keys(players).length === game.get("maxPlayers")) {
    res.add(sh.error("game_full", "game has maximum amount of players", {maxPlayers: game.get("maxPlayers")}));
    return cb(1);
  }

  var isNew = !_.isObject(players[uid]);

  addGamePlaying(req.loader, uid, game);
  game.setPlayer(uid, "ready");

  if (isNew) {
    global.socket.notify(game.get("gameId"), sh.event("event.game.user.join", {gameId: game.get("gameId"), uid: uid}));
  }

  sh.extendProfiles(req.loader, game.get("players"), function (error, data) {
    if (error) {
      res.add(sh.error("user_info", "unable to load users for this game", data));
      return cb(1);
    }
    res.add(sh.event("event.game.join", game.getData()));
    return cb(0);
  });
};

game.leave = function (req, res, cb) {
  var uid = req.session.uid;

  req.loader.get("kPlaying", uid, function (error, playing) {
    if (error) {
      res.add(sh.error("playing_load", "unable to load playing list", {uid: uid}));
      return cb(1);
    }
    playing.removeGame(req.body.gameId);
    if (req.body.game) {
      global.socket.notify(game.get("oid"), sh.event("event.game.user.leave", {gameId: req.body.gameId, uid: uid}));
    }
    res.add(sh.event("event.game.leave", req.body.gameId));
    return cb(0);
  });
};

game.kick = function (req, res, cb) {
  var kickId = req.body.kickId;
  var game = req.env.game;

  // SWD check user
  game.players[kickId] = {status: "kicked"};
  game.setPlayer(kickId, "kicked");

  res.add(sh.event("event.game.leave", game.get("players")));
  return cb(0);
};

game.turn = function (req, res, cb) {
  var uid = req.session.uid;
  var gameId = req.body.gameId;
  // fast and loose - muse setData before return or sub call
  var game = req.env.game.getData();

  if (Object.keys(game.players).length < game.minPlayers) {
    res.add(sh.error("players_missing", "not enough players in game", {required: game.minPlayers, playerCount: Object.keys(game.players).length}));
    return cb(1);
  }
  if (game.status === "over") {
    res.add(sh.event("event.game.over", game));
    return cb(0);
  }
  if (game.whoTurn !== uid) {
    res.add(sh.error("game_noturn", "not your turn", {whoTurn: game.whoTurn}));
    return cb(1);
  }

  var nextIndex = game.playerOrder.indexOf(uid) + 1;
  if (nextIndex === game.playerOrder.length) {
    nextIndex = 0;
  }
  game.whoTurn = game.playerOrder[nextIndex];
  game.turnsPlayed += 1;
  game.status = "playing";  // turn looks valid, game module sets "over"

  //SWD make sure turn function is there
  req.env.gameModule.turn(req, res, function (error) {
    if (error) {
      return cb(error);
    }
    global.socket.notifyUsers(game.playerOrder, sh.event("event.game.turn.next", {gameId: gameId,
      whoTurn: game.whoTurn,
      name: (game.whoTurn === "" ? "no one" : game.players[game.whoTurn].name),
      pic: ""
      }));
    if (game.status === "over") {
      global.socket.notify(game.oid, sh.event("event.game.over", game));
    }
    return cb(error);
  });
};

game.get = function (req, res, cb) {
  // SWD - game is bad name for this all over
  var game = req.env.game;

  res.add(sh.event("event.game.info", game.getData()));
  return cb(0);
};

game.set = function (req, res, cb) {
  var game = req.env.game;
  var newGame = req.body.game;

  game.setData(newGame);

  res.add(sh.event("event.game.info", game.getData()));
  return cb(0);
};

game.reset = function (req, res, cb) {
  var game = req.env.game.getData();

  game.rounds += 1;
  game.turns = 0;
  game.whoTurn = req.session.uid;
  game.status = "playing";

  if (_.isUndefined(req.env.gameModule)) {
    res.add(sh.error("game_reset", "this game has no reset"));
    return cb(1);
  }

  req.env.gameModule.reset(req, res, function (error) {
    if (!error) {
      // notify players in game of new state
      global.socket.notify(game.oid, sh.event("event.game.reset", game));
      // notify players online of turn change
      global.socket.notifyUsers(game.playerOrder, sh.event("event.game.turn.next", {gameId: game.oid,
          whoTurn: game.whoTurn,
          name: (game.whoTurn === "0" ? "no one" : game.players[game.whoTurn].name),
          pic: ""
        }));
    }
    return cb(error);
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
          res.add(sh.event("event.game.list", games));
          return cb(0);
        }
      });
    });
  });

};

game.call = function (req, res, cb) {
  shlog.info("game.call - req.body.func");
  var module = req.env.gameModule;

  if (_.isUndefined(module[req.body.func])) {
    res.add(sh.error("game_call", "function does not exist", {func: req.body.func}));
    return cb(1);
  }

  req.env.gameModule[req.body.func](req, res, cb);
};

/////////////// Playing functions

function fillGames(loader, gameList, cb) {
  var gameIds = Object.keys(gameList);
  async.each(gameIds, function (gameId, lcb) {
    loader.get("kGame", gameId, function (error, game) {
      if (error) {
        lcb(game);
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

  req.loader.get("kPlaying", uid, function (error, playing) {
    if (error) {
      res.add(sh.error("playing_load", "unable to load playing list", {uid: uid}));
      return cb(1);
    }
    fillGames(req.loader, playing.getData().currentGames, function (error, data) {
      if (!error) {
        res.add(sh.event("event.game.playing", data));
        return cb(0);
      }
      res.add(sh.error("playing_fill", "unable to fill games in playing list", data));
      return cb(1);
    });
  });
};