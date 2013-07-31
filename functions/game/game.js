var fs = require("fs");
var _ = require("lodash");
var async = require("async");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var shcluster = require(global.gBaseDir + "/src/shcluster.js");

var dispatch = require(global.gBaseDir + "/src/dispatch.js");
var channel = require(global.gBaseDir + "/functions/channel/channel.js");

var gGameDir = global.gBaseDir + "/games";

var Game = exports;

Game.desc = "game state and control module";
Game.functions = {
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

Game.pre = function (req, res, cb) {
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
      res.add(sh.error("game-load", "unable to load game data"));
      return cb(1);
    }
    var gameName = game.get("name");
    try {
      shlog.info("game.pre: setting game:" + gameName + " = " + gameId);
      req.env.gameModule = loadGameModule(gameName);
    } catch (e) {
      // special case this so we can always remove a bad game
      if (req.body.cmd !== "game.leave") {
        res.add(sh.error("game_require", "unable to load game module", {name: gameName, message: e.message}));
        return cb(1);
      }
    }

    req.env.game = game;
    return cb(0);
  });
};

Game.post = function (req, rs, cb) {
  shlog.info("game.post");
  return cb(0);
};

function addGamePlaying(loader, uid, game, cb) {
  loader.get("kPlaying", uid, function (error, playing) {
    if (!error) {
      playing.addGame(game);
    }
    cb(error, playing);
  });
}

function addGamePlayingMulti(loader, players, game, cb) {
  async.each(players, function (playerId, cb) {
    addGamePlaying(loader, playerId, game, function (err, data) {
      // ignore any errors
      cb(0);
    });
  }, function (error) {
    if (error) {
      cb(1, error);
      return;
    }
    cb(0);
  });
}

Game.create = function (req, res, cb) {
  shlog.info("game.create");
  var uid = req.session.uid;

  var game = req.loader.create("kGame", sh.uuid());

  game.set("name", req.body.name);
  game.set("ownerId", uid);
  game.set("whoTurn", uid);

  // add to request environment
  req.env.game = game;

  // SWD - clean this up
  if (_.isUndefined(req.body.players)) {
    addGamePlaying(req.loader, uid, game, function (error, data) {
      game.setPlayer(uid, "ready");
      sh.extendProfiles(req.loader, game.get("players"), function (error, data) {
        if (error) {
          res.add(sh.error("user_info", "unable to load users for this game", data));
          return cb(1);
        }
        // SWD check if create exists
        req.env.gameModule.create(req, res, cb);
      });
    });
  } else {
    _.each(req.body.players, function (playerId) {
      game.setPlayer(playerId, "ready");
    });
    addGamePlayingMulti(req.loader, req.body.players, game, function (error, data) {
      // SWD ignore any errors for now
      if (error) {
        shlog.error("add_players", "unable to add a player", data);
      }
      sh.extendProfiles(req.loader, game.get("players"), function (error, data) {
        if (error) {
          res.add(sh.error("user_info", "unable to load users for this game", data));
          return cb(1);
        }

        // SWD check if create exists
        req.env.gameModule.create(req, res, cb);
      });
    });
  }
};

Game.start = function (req, res, cb) {
  var game = req.env.game;

  game.set("status", "playing");

  res.add(sh.event("game.start", game.getData()));
  return cb(0);
};

Game.end = function (req, res, cb) {
  var game = req.env.game;

  game.set("status", "over");

  res.add(sh.event("game.end", game.getData()));
  return cb(0);
};

Game.join = function (req, res, cb) {
  var uid = req.session.uid;
  var game = req.env.game;
  var user = req.session.user;

  var players = game.get("players");
  if (_.isUndefined(players[uid]) && Object.keys(players).length === game.get("maxPlayers")) {
    res.add(sh.error("game-full", "game has maximum amount of players", {maxPlayers: game.get("maxPlayers")}));
    return cb(1);
  }

  var isNew = !_.isObject(players[uid]);

  addGamePlaying(req.loader, uid, game, function (error, data) {
    game.setPlayer(uid, "ready");

    if (isNew) {
      channel.sendInt("game:" + game.get("oid"), sh.event("game.user.join", {gameId: game.get("gameId"), uid: uid}));
    }

    sh.extendProfiles(req.loader, game.get("players"), function (error, data) {
      if (error) {
        res.add(sh.error("user-load", "unable to load users for this game", data));
        return cb(1);
      }
      res.add(sh.event("game.join", game.getData()));
      return cb(0);
    });
  });
};

Game.leave = function (req, res, cb) {
  var uid = req.session.uid;
  var game = req.env.game;
  // NOTE: req.env.gameModule needs to be checked in this function if used
  // we always want to be able to remove a game, even if it doesn't load

  req.loader.get("kPlaying", uid, function (error, playing) {
    if (error) {
      res.add(sh.error("playing_load", "unable to load playing list", {uid: uid}));
      return cb(1);
    }
    playing.removeGame(req.body.gameId);
    if (req.body.game) {
      channel.sendInt("game:" + game.get("oid"), sh.event("game.user.leave", {gameId: req.body.gameId, uid: uid}));
    }
    res.add(sh.event("game.leave", req.body.gameId));
    return cb(0);
  });
};

Game.kick = function (req, res, cb) {
  var kickId = req.body.kickId;
  var game = req.env.game;

  // SWD check user
  game.players[kickId] = {status: "kicked"};
  game.setPlayer(kickId, "kicked");

  res.add(sh.event("game.leave", game.get("players")));
  return cb(0);
};

Game.turn = function (req, res, cb) {
  var uid = req.session.uid;
  var gameId = req.body.gameId;
  var gameData = req.env.game.getData();

  if (Object.keys(gameData.players).length < gameData.minPlayers) {
    res.add(sh.error("players_missing", "not enough players in game", {required: gameData.minPlayers, playerCount: Object.keys(gameData.players).length}));
    return cb(1);
  }
  if (gameData.status === "over") {
    res.add(sh.event("game.over", gameData));
    return cb(0);
  }
  if (gameData.whoTurn !== uid) {
    res.add(sh.error("game_noturn", "not your turn", {whoTurn: gameData.whoTurn}));
    return cb(1);
  }

  var nextIndex = gameData.playerOrder.indexOf(uid) + 1;
  if (nextIndex === gameData.playerOrder.length) {
    nextIndex = 0;
  }
  gameData.whoTurn = gameData.playerOrder[nextIndex];
  gameData.turnsPlayed += 1;
  gameData.status = "playing";  // turn looks valid, game module sets "over"

  //SWD make sure turn function is there
  req.env.gameModule.turn(req, res, function (error) {
    if (error) {
      return cb(error);
    }
    if (gameData.status === "over") {
      // just users in game
      channel.sendInt("game:" + gameId, sh.event("game.over", gameData), cb);
    } else {
      // turn.next sent to all users online
      var event = sh.event("game.turn.next", {gameId: gameId,
        gameName: gameData.name,
        whoTurn: gameData.whoTurn,
        name: (gameData.whoTurn === "" ? "no one" : gameData.players[gameData.whoTurn].name),
        pic: ""});
      res.add(event); // send to me
      dispatch.sendUsers(gameData.playerOrder, event, req.session.uid, cb); // send to all other players
    }
  });
};

Game.get = function (req, res, cb) {
  var game = req.env.game;

  res.add(sh.event("game.get", game.getData()));
  return cb(0);
};

Game.set = function (req, res, cb) {
  var game = req.env.game;
  var newGameData = req.body.game;

  game.setData(newGameData);

  res.add(sh.event("game.set", game.getData()));
  return cb(0);
};

Game.reset = function (req, res, cb) {
  var gameData = req.env.game.getData();

  gameData.rounds += 1;
  gameData.turns = 0;
  gameData.whoTurn = req.session.uid;
  gameData.status = "playing";

  if (_.isUndefined(req.env.gameModule)) {
    res.add(sh.error("game_reset", "this game has no reset"));
    return cb(1);
  }

  req.env.gameModule.reset(req, res, function (error) {
    // ignore error as we need to send anyway

    // send to players in game and back to self
    var event = sh.event("game.reset", gameData);
    channel.sendInt("game:" + gameData.oid, event, req.session.uid);
    res.add(event);

    // notify any players online
    dispatch.sendUsers(gameData.playerOrder, sh.event("game.turn.next", {gameId: gameData.oid,
      gameName: gameData.name,
      whoTurn: gameData.whoTurn,
      name: (gameData.whoTurn === "0" ? "no one" : gameData.players[gameData.whoTurn].name),
      pic: ""}));
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

Game.list = function (req, res, cb) {
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
          res.add(sh.event("game.list", games));
          return cb(0);
        }
      });
    });
  });

};

Game.call = function (req, res, cb) {
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
    loader.get("kGame", gameId, function (err, game) {
      if (err) {
        return lcb(game);
      }
      gameList[gameId].whoTurn = game.get("whoTurn");
      gameList[gameId].players = game.get("players");
      shcluster.home(gameId, function (err, server) {
        if (err) {
          return lcb(err);
        }
        gameList[gameId].SOCKET_URL = server.SOCKET_URL;
        lcb();
      });
    });
  }, function (error) {
    if (error) {
      cb(1, error);
      return;
    }
    cb(0, gameList);
  });
}

Game.playing = function (req, res, cb) {
  var uid = req.session.uid;

  req.loader.get("kPlaying", uid, function (error, playing) {
    if (error) {
      res.add(sh.error("playing_load", "unable to load playing list", {uid: uid}));
      return cb(1);
    }
    fillGames(req.loader, playing.getData().currentGames, function (error, data) {
      if (!error) {
        res.add(sh.event("game.playing", data));
        return cb(0);
      }
      res.add(sh.error("playing_fill", "unable to fill games in playing list", data));
      return cb(1);
    });
  });
};