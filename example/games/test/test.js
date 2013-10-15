var _ = require("lodash");
var shlog = require(global.C.BASE_DIR + "/lib/shlog.js");
var sh = require(global.C.BASE_DIR + "/lib/shutil.js");

var test = exports;

test.url = "/test/test.html";
test.enabled = false;

test.config = {
  enabled: false,
  url: "/test/test.html",
  minPlayers: 3,
  maxPlayers: 4
};

test.create = function (req, cb) {
  req.env.game.state = {number: _.random(10)};

  cb(0); // by default game.create returns game object
};

test.turn = function (req, cb) {
  if (req.body.guess === req.env.game.state.number) {
    cb(0, sh.event("test.info", {message: "you won"}));
  } else {
    cb(0, sh.event("test.info", {message: "try again"}));
  }
};

test.myfunc = function (req, cb) {
  cb(0, sh.event("test.myfunc", {message: "hellow world"}));
};