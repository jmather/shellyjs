var fs = require("fs");
var _ = require("lodash");
var async = require("async");

var shlog = require(global.C.BASEDIR + "/lib/shlog.js");
var sh = require(global.C.BASEDIR + "/lib/shutil.js");
var dispatch = require(global.C.BASEDIR + "/lib/dispatch.js");
var channel = require(global.C.BASEDIR + "/apis/channel/channel.js");
var module = require(global.C.BASEDIR + "/apis/module/module.js");
var _w = require(global.C.BASEDIR + "/lib/shcb.js")._w;

var Game = exports;

Game.desc = "game state and control module";
Game.functions = {
  create: {desc: "create a new game", params: {name: {dtype: "string"}}, security: []},
  get: {desc: "get game object", params: {gameId: {dtype: "string"}}, security: []},
  join: {desc: "join an game as a new user", params: {gameId: {dtype: "string"}}, security: []},
  enter: {desc: "join an existing game", params: {gameId: {dtype: "string"}}, security: []},
  turn: {desc: "calling user taking their turn", params: {gameId: {dtype: "string"}}, security: []},
  reset: {desc: "reset game for another round", params: {gameId: {dtype: "string"}}, security: []},
  leave: {desc: "leave an existing game", params: {gameId: {dtype: "string"}}, security: []},
  call: {desc: "call a game specific function", params: {gameId: {dtype: "string"}, func: {dtype: "string"}, args: {dtype: "object"}}, security: []},

  list: {desc: "list all loaded games", params: {}, security: []},
  playing: {desc: "list all games user is currently playing", params: {}, security: []}
};

function gameInit(dir, cb) {
  if (_.isUndefined(global.games)) {
    global.games = {};
  }
  fs.readdir(dir, function (err, files) {
    if (err) {
      cb(err);
    }
    async.each(files, function (entry, lcb) {
      var fn = dir + "/" + entry;
      fs.stat(fn, function (err, stat) {
        if (stat.isDirectory()) {
          var moduleFn = fn + "/" + entry + ".js";
          var module = null;
          try {
            module = require(moduleFn);
          } catch (e) {}
          if (module) {
            shlog.info("game", "game found", entry, module.url);
            global.games[entry] = {};
            if (_.isString(module.url)) {
              global.games[entry].url = module.url;
            }
          }
          return lcb(0);
        }
        return lcb(0);
      });
    }, function (error) {
      return cb(0);
    });
  });
}

Game.init = function (cb) {
  gameInit(global.C.GAMES_API_DIR, cb);
};

Game.pre = function (req, res, cb) {
  req.env.game = null;

  // no need for module or game
  if (req.body.cmd === "game.list"
      || req.body.cmd === "game.playing") {
    return cb(0);
  }

  // just load the module
  if (req.body.cmd === "game.create") {
    var gameFile = global.C.GAMES_API_DIR + "/" + req.body.name + "/" + req.body.name + ".js";
    sh.require(gameFile, function (err, module) {
      if (err) {
        res.add(sh.error("game-require", "unable to load game module", module));
        return cb(1);
      }
      req.env.gameModule = module;
      return cb(0);
    });
    return; // nothing else to do for game.create
  }

  // load the module and game
  var opts = {lock: true};
  if (req.body.cmd === "game.get" ||
      req.body.cmd === "game.enter") {  // no need to lock the gets or enters
    opts.lock = false;
  }
  shlog.info("game", "game.pre: populating game info for " + req.body.gameId);
  req.loader.exists("kGame", req.body.gameId, _w(cb, function (error, game) {
    if (error) {
      if (req.body.cmd === "game.leave") {  // always alow user to remove a bad game
        return cb(0);
      }
      res.add(sh.error("game-load", "unable to load game data", game));
      return cb(1);
    }
    req.env.game = game;

    if (req.body.cmd !== "game.join") {
      if (!_.isObject(game.get("players")[req.session.uid])) {
        res.add(sh.error("game-denied", "you are not a player in this game"));
        return cb(1);
      }
    }

    var gameFile = global.C.GAMES_API_DIR + "/" + game.get("name") + "/" + game.get("name") + ".js";
    sh.require(gameFile, function (err, module) {
      if (err) {
        res.add(sh.error("game-require", "unable to load game module", module));
        return cb(1);
      }
      req.env.gameModule = module;
      return cb(0);
    });
  }), opts);
};

Game.post = function (req, rs, cb) {
  shlog.info("game", "game.post");
  return cb(0);
};

Game.notify = function (req, res, event) {
  // notify any players in game
  channel.sendInt("game:" + req.env.game.get("oid"), event, req.session.uid);
  // notify me - rest support
  res.add(event);
};

Game.notifyTurn = function (req, res) {
  // notify any players online
  var gameData = req.env.game.getData();
  var event = sh.event("game.turn.next", {gameId: gameData.oid,
    gameName: gameData.name,
    gameUrl: sh.gameUrl(gameData.name, {gameId: gameData.oid}),
    whoTurn: gameData.whoTurn,
    name: (gameData.whoTurn === "0" ? "no one" : gameData.players[gameData.whoTurn].name),
    pic: ""});

  // notify anyone that is onine
  dispatch.sendUsers(gameData.playerOrder, event, req.session.uid); // exclude me
  // noitify me - rest support
  res.add(event);
};

function addGamePlaying(loader, uid, game, cb) {
  loader.get("kPlaying", uid, _w(cb, function (error, playing) {
    if (!error) {
      playing.addGame(game);
    }
    cb(error, playing);
  }), {lock: true});
}

function addGamePlayingMulti(loader, players, game, cb) {
  async.each(players, function (playerId, lcb) {
    addGamePlaying(loader, playerId, game, _w(lcb, function (err, data) {
      // ignore any errors
      lcb(0);
    }));
  }, function (error) {
    if (error) {
      cb(1, error);
      return;
    }
    cb(0);
  });
}

Game.create = function (req, res, cb) {
  shlog.info("game", "game.create");

  req.loader.create("kGame", sh.uuid(), _w(cb, function (err, game) {
    if (err) {
      res.add(sh.error("game-create", "unable to create a game", game));
      return cb(1);
    }

    game.set("name", req.body.name);
    game.set("ownerId", req.session.uid);
    game.set("whoTurn", req.session.uid);

    // add to request environment
    req.env.game = game;

    if (_.isUndefined(req.body.players)) {
      req.body.players = [req.session.uid];
    }
    // add the players to the game
    _.each(req.body.players, function (playerId) {
      game.setPlayer(playerId, "ready");
    });
    addGamePlayingMulti(req.loader, req.body.players, game, _w(cb, function (error, data) {
      // SWD ignore any errors for now
      if (error) {
        shlog.error("game", "add_players", "unable to add a player", data);
      }
      // copy profile info
      sh.extendProfiles(req.loader, game.get("players"), _w(cb, function (error, data) {
        if (error) {
          res.add(sh.error("user-profiles", "unable to load users for this game", data));
          return cb(1);
        }

        if (!_.isFunction(req.env.gameModule.create)) {
          res.add(sh.event("game.create", req.env.game.getData()));
          return cb(0);
        }
        req.env.gameModule.create(req, res, _w(cb, function (err, data) {
          if (error) {
            return cb(error);
          }
          if (data) {
            res.add(sh.event("game.create", data));
          } else {
            res.add(sh.event("game.create", req.env.game.getData()));
          }
          return cb(0);
        }));
      }));
    }));
  }));
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

  // if new to game add to playing list, fill in profile, and notify game channel
  if (!_.isObject(players[uid])) {
    addGamePlaying(req.loader, uid, game, _w(cb, function (error, data) {
      game.setPlayer(uid, "ready");

      channel.sendInt("game:" + game.get("oid"), sh.event("game.user.join", {gameId: game.get("oid"), uid: uid}));

      // just extend the profile added uid
      sh.extendProfiles(req.loader, game.get("players"), _w(cb, function (error, data) {
        if (error) {
          res.add(sh.error("user-profiles", "unable to load users for this game", data));
          return cb(1);
        }
        res.add(sh.event("game.join", game.getData()));
        return cb(0);
      }));
    }));
  } else {
    res.add(sh.event("game.join", game.getData()));
    return cb(0);
  }
};

Game.enter = function (req, res, cb) {
  var game = req.env.game;
  var players = game.get("players");
  if (_.isUndefined(players[req.session.uid])) {
    res.add(sh.error("game-denied", "you are not a player in this game"));
    return cb(1);
  }

  channel.sendInt("game:" + game.get("oid"), sh.event("game.user.enter", {gameId: game.get("oid"), uid: req.session.uid}));

  res.add(sh.event("game.enter", game.getData()));
  return cb(0);
};

Game.leave = function (req, res, cb) {
  var uid = req.session.uid;
  var game = req.env.game;
  // NOTE: req.env.gameModule needs to be checked in this function if used
  // we always want to be able to remove a game, even if it doesn't load

  req.loader.get("kPlaying", uid, _w(cb, function (error, playing) {
    if (error) {
      res.add(sh.error("playing-load", "unable to load playing list", {uid: uid}));
      return cb(1);
    }
    playing.removeGame(req.body.gameId);
    if (req.body.game) {
      channel.sendInt("game:" + game.get("oid"), sh.event("game.user.leave", {gameId: req.body.gameId, uid: uid}));
    }
    res.add(sh.event("game.leave", req.body.gameId));
    return cb(0);
  }), {lock: true});
};

Game.turn = function (req, res, cb) {
  var gameData = req.env.game.getData();

  if (Object.keys(gameData.players).length < gameData.minPlayers) {
    res.add(sh.error("players-missing", "not enough players in game", {required: gameData.minPlayers, playerCount: Object.keys(gameData.players).length}));
    return cb(1);
  }
  if (gameData.status === "over") {
    res.add(sh.event("game.over", gameData));
    return cb(0);
  }
  if (gameData.whoTurn !== req.session.uid) {
    res.add(sh.error("game-noturn", "not your turn", {whoTurn: gameData.whoTurn}));
    return cb(1);
  }

  var nextIndex = gameData.playerOrder.indexOf(req.session.uid) + 1;
  if (nextIndex === gameData.playerOrder.length) {
    nextIndex = 0;
  }
  gameData.whoTurn = gameData.playerOrder[nextIndex];
  gameData.turnsPlayed += 1;
  gameData.status = "playing";  // turn looks valid, game module sets "over"

  if (!_.isFunction(req.env.gameModule.turn)) {
    res.add(sh.event("game.turn", gameData));
    return cb(0);
  }
  req.env.gameModule.turn(req, res, _w(cb, function (error, data) {
    if (error) {
      return cb(error);
    }
    // fill in data from gameModule
    if (!data) {
      data = gameData;
    }
    Game.notify(req, res, sh.event("game.turn", data));
    if (gameData.status === "over") {
      Game.notify(req, res, sh.event("game.over", gameData));
      return cb(0);  // no one has next turn, so end
    }
    Game.notifyTurn(req, res);
    return cb(0);
  }));
};

Game.get = function (req, res, cb) {
  var game = req.env.game;

  res.add(sh.event("game.get", game.getData()));
  return cb(0);
};

Game.reset = function (req, res, cb) {
  var gameData = req.env.game.getData();

  gameData.rounds += 1;
  gameData.turns = 0;
  gameData.whoTurn = req.session.uid;
  gameData.status = "playing";

  if (_.isUndefined(req.env.gameModule)) {
    res.add(sh.error("game-reset-undefined", "this game has no reset"));
    return cb(1);
  }

  if (!_.isFunction(req.env.gameModule.reset)) {
    Game.notify(req, res, sh.event("game.reset", req.env.game.getData()));
    Game.notifyTurn(req, res);
    return cb(0);
  }
  req.env.gameModule.reset(req, res, _w(cb, function (error, data) {
    if (error) {
      return cb(error);
    }
    // fill in data from gameModule
    if (!data) {
      data = req.env.game.getData();
    }
    Game.notify(req, res, sh.event("game.reset", data));
    Game.notifyTurn(req, res);
    return cb(0);
  }));
};

Game.list = function (req, res, cb) {
  shlog.info("game", "game.list");

  var games = {};
  fs.readdir(global.C.GAMES_API_DIR, function (err, files) {
    if (err) {
      res.add(sh.error("game-dir-failed", "unable to read game directory", err));
      return cb(1);
    }
    async.each(files, function (entry, lcb) {
      var fn = global.C.GAMES_API_DIR + "/" + entry;
      fs.stat(fn, function (err, stat) {
        if (stat.isDirectory()) {
          var gameFn = fn + "/" + entry + ".js";
          module.getInfo(gameFn, function (err, m) {
            games[m.name] = m;
            return lcb(0);
          });
        } else {
          return lcb(0);
        }
      });
    }, function (error) {
      res.add(sh.event("game.list", games));
      cb(0);
    });
  });
};

Game.call = function (req, res, cb) {
  shlog.info("game", "game.call - req.body.func");
  var module = req.env.gameModule;

  if (_.isUndefined(module[req.body.func])) {
    res.add(sh.error("game-call-undefined", "function does not exist", {func: req.body.func}));
    return cb(1);
  }
  req.env.gameModule[req.body.func](req, res, cb);
};

/////////////// Playing functions

function fillGames(loader, gameList, cb) {
  var gameIds = Object.keys(gameList);
  async.each(gameIds, function (gameId, lcb) {
    loader.get("kGame", gameId, _w(lcb, function (err, game) {
      if (err) {
        return lcb(game);
      }
      gameList[gameId].gameName = game.get("name");
      gameList[gameId].whoTurn = game.get("whoTurn");
      gameList[gameId].players = game.get("players");
      gameList[gameId].gameUrl = sh.gameUrl(game.get("name"), {"gameId": game.get("oid")});
      lcb();
/* SWD expensive call with cache turned off
      shcluster.home(gameId, function (err, server) {
        if (err) {
          return lcb(err);
        }
        gameList[gameId].SOCKET_URL = server.SOCKET_URL;
        lcb();
      });
 */
    }));
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

  req.loader.get("kPlaying", uid, _w(cb, function (error, playing) {
    if (error) {
      res.add(sh.error("playing-load", "unable to load playing list", {uid: uid}));
      return cb(1);
    }
    fillGames(req.loader, playing.getData().currentGames, _w(cb, function (error, data) {
      if (error) {
        res.add(sh.error("playing-fillgames", "unable to fill games in playing list", data));
        return cb(1);
      }
      res.add(sh.event("game.playing", data));
      return cb(0);
    }));
  }));
};