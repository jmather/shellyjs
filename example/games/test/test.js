var _ = require("lodash");
var shlog = require(global.C.BASE_DIR + "/lib/shlog.js");
var sh = require(global.C.BASE_DIR + "/lib/shutil.js");

var test = exports;

test.url = "/test/test.html";
test.enabled = false;

test.config = {
  enabled: true,
  url: "/test/test.html",
  minPlayers: 3,
  maxPlayers: 4
};

test.create = function (req, res, cb) {
  req.env.game.set("state", {number: _.random(10), winner: false});

  cb(0); // by default game.create returns game object
};

test.reset = function (req, res, cb) {
  req.env.game.set("state", {number: _.random(10), winner: false});

  cb(0);
};

test.turn = function (req, res, cb) {
  var state = req.env.game.get("state");
  state.lastId = req.session.uid;
  state.guess = req.body.guess;

  state.winner = parseInt(req.body.guess, 10) === state.number;
  if (state.winner) {
    req.env.game.set("status", "over");
  }
  cb(0, {lastId: req.session.uid, winner: state.winner, guess: req.body.guess});
};

test.myfunc = function (req, res, cb) {
  cb(0, sh.event("test.myfunc", {message: "hellow world"}));
};