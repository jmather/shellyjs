var _ = require("lodash");
var async = require("async");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var ShGame = require(global.gBaseDir + "/src/shgame.js");
var ShUser = require(global.gBaseDir + "/src/shuser.js");

var db = global.db;

var user = exports;

user.desc = "utility functions for shelly modules";
user.functions = {
  get: {desc: "get user object", params: {}, security: []},
  set: {desc: "set user object", params: {user: {dtype: "object"}}, security: []},
  profiles: {desc: "get public user infoformation", params: {users : {dtype: "array"}}, security: []},
  games: {desc: "list games user is playing", params: {}, security: []},
  gameRemove: {desc: "remove a game from the playing list", params: {gameId: {dtype: "string"}}, security: []}
};

user.pre = function (req, res, cb) {
  shlog.info("user.pre");
  // user is always preloaded now in session check

  // SWD - eventually check security session.uid has rights to params.uid
  cb(0);
};

user.post = function (req, res, cb) {
  shlog.info("user.post");

  if (_.isObject(req.session.user)) {
    req.session.user.save(function (error, data) {
      // ingore
    });
  }

  // SWD: work out pre/post user save later, for now save on every set
  cb(0);
};

user.get = function (req, res, cb) {
  shlog.info(req.env.user);
  cb(0, sh.event("event.user.get", req.session.user.getData()));
};

user.set = function (req, res, cb) {
  var newUser = req.params.user;

  req.session.user.setData(newUser);

  cb(0, sh.event("event.user.get", req.session.user.getData()));
};

user.profiles = function (req, res, cb) {
  var userIds = req.params.users;
  sh.fillProfiles(userIds, function (error, data) {
    if (!error) {
      cb(0, sh.event("event.user.profiles", data));
    } else {
      cb(error, data);
    }
  });
};

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

user.games = function (req, res, cb) {
  var currentGames = req.session.user.get("currentGames");

  fillGames(currentGames, function (error, data) {
    if (!error) {
      cb(0, sh.event("event.user.games", data));
    } else {
      cb(error, data);
    }
  });
};

user.gameRemove = function (req, res, cb) {
  var gameId = req.params.gameId;
  var user = req.session.user;
  var currentGames = user.get("currentGames");
  delete currentGames[gameId];
  user.set(currentGames);

  cb(0, sh.event("event.user.games", currentGames));
};