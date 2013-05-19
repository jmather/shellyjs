var _ = require("lodash");
var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var test = exports;

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