var _ = require("lodash");

var shlog = require(global.C.BASEDIR + "/src/shlog.js");
var sh = require(global.C.BASEDIR + "/src/shutil.js");
var dispatch = require(global.C.BASEDIR + "/src/dispatch.js");
var _w = require(global.C.BASEDIR + "/src/shcb.js")._w;

var Suggest = exports;

Suggest.desc = "Provides player recommendations that may want to play with you";
Suggest.functions = {
  list: {desc: "get a list of suggested players", params: {limit: {dtype: "number"}}, security: []},
  add: {desc: "add the current user to the suggestion list", params: {}, security: []}
};

Suggest.list = function (req, res, cb) {

  var set = "any";
  req.loader.get("kPlayerSet", "any", _w(cb, function (err, players) {
    if (err) {
      res.add(sh.error("suggest-bad", "unable to load the suggestion list", {set: set, error: err, data: players}));
      return cb(err);
    }
    var playerSet = _.clone(players.get("set"), true);
    if (_.isObject(playerSet[req.session.uid])) {
      delete playerSet[req.session.uid];
    }
    res.add(sh.event("suggest.list", playerSet));
    return cb(0);
  }));
};

Suggest.add = function (req, res, cb) {

  var set = "any";
  req.loader.get("kPlayerSet", "any", _w(cb, function (err, players) {
    if (err) {
      res.add(sh.error("suggest-bad", "unable to load the suggestion list", {set: set, error: err, data: players}));
      return cb(err);
    }
    players.add(req.session.user);

    res.add(sh.event("suggest.add", {status: "ok"}));
    return cb(0);
  }, {lock: true}));
};