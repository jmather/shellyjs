var events = require("events");
var async = require("async");
var _ = require("lodash");

var shlog = require(global.C.BASE_DIR + "/lib/shlog.js");
var sh = require(global.C.BASE_DIR + "/lib/shutil.js");
var dispatch = require(global.C.BASE_DIR + "/lib/shdispatch.js");
var _w = require(global.C.BASE_DIR + "/lib/shcb.js")._w;

var match = exports;

match.desc = "match players to the desired game and start them in it";
match.functions = {
  add: {desc: "add caller to the game matcher", params: {name: {dtype: "string"}}, security: []},
  remove: {desc: "remove caller from the game matcher", params: {name: {dtype: "string"}}, security: []},
  check: {desc: "check if caller is currently being matched", params: {name: {dtype: "string"}}, security: []},
  list: {desc: "list the match players for a game", params: {name: {dtype: "string"}}, security: []},
  clear: {desc: "clear the match queue (for testing)", params: {name: {dtype: "string"}}, security: ["admin"]},
  count: {desc: "count the users waiting for a game", params: {name: {dtype: "string"}}, security: []}
};

match.pre = function (req, res, cb) {
  if (_.isUndefined(global.games[req.body.name])) {
    res.add(sh.error("game-bad", "unknown game", {name: req.body.name}));
    return cb(1);
  }

  return cb(0);
};

match.add = function (req, res, cb) {
  global.db.sadd("match:any:" + req.body.name, req.session.uid, _w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("match-add", "unable to add player for matching", data));
      return cb(err);
    }
    res.add(sh.event("match.add", req.session.user.profile()));
    return cb(0);
  }));
};

match.remove = function (req, res, cb) {
  global.db.srem("match:any:" + req.body.name, req.session.uid, _w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("match-remove", "unable to add player for matching", data));
      return cb(err);
    }
    res.add(sh.event("match.remove", req.session.user.profile()));
    return cb(0);
  }));
};

match.check = function (req, res, cb) {
  global.db.sismember("match:any:" + req.body.name, req.session.uid, _w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("match-check", "unable to check if user is being matched", data));
      return cb(err);
    }
    res.add(sh.event("match.check", {isWaiting: data}));
    return cb(0);
  }));
};

match.list = function (req, res, cb) {
  global.db.smembers("match:any:" + req.body.name, _w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("matchlist-load", "unable to get match list", {name: req.body.name}));
      return cb(1);
    }
    res.add(sh.event("match.list", data));
    return cb(0);
  }));
};

match.clear = function (req, res, cb) {
  global.db.del("match:any:" + req.body.name, _w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("matchlist-delete", "unable to clear match list", {name: req.body.name}));
      return cb(1);
    }
    res.add(sh.event("match.clear", data));
    return cb(0);
  }));
};

match.count = function (req, res, cb) {
  global.db.scard("match:any:" + req.body.name, _w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("matchslist-count", "unable to get match list", {name: req.body.name}));
      return cb(1);
    }
    res.add(sh.event("match.count", {name: req.body.name, waiting: data}));
    return cb(0);
  }));
};
