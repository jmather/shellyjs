var shlog = require(global.C.BASEDIR + "/lib/shlog.js");
var sh = require(global.C.BASEDIR + "/lib/shutil.js");
var shstats = require(global.C.BASEDIR + "/lib/shstats.js");
var _w = require(global.C.BASEDIR + "/lib/shcb.js")._w;

var stats = exports;

stats.desc = "stats information";
stats.functions = {
  get: {desc: "get a server stat", params: {domain: {dtype: "string"}, key: {dtype: "string"}}, security: ["admin"]},
  getDomain: {desc: "get all server stats in a domain", params: {domain: {dtype: "string"}}, security: ["admin"]},
  reset: {desc: "reset a server stat", params: {domain: {dtype: "string"}, key: {dtype: "string"}}, security: ["admin"]},
  getAll: {desc: "get all server stats", params: {}, security: ["admin"]},
  resetAll: {desc: "reset all server stats", params: {}, security: ["admin"]}
};

stats.get = function (req, res, cb) {
  shlog.debug("stats", "stats.get", req.body.domain, req.body.key);

  shstats.get(req.body.domain, req.body.key, _w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("stat-bad", "unable to get stat", data));
      return cb(0);
    }
    res.add(sh.event("stats.get", {domain: req.body.domain, key: req.body.key, value: data}));
    return cb(0);
  }));
};

stats.getDomain = function (req, res, cb) {
  shlog.debug("stats", "stats.getDomain", req.body.domain);

  shstats.getDomain(req.body.domain, _w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("stat-bad", "unable to get stat", data));
      return cb(0);
    }
    res.add(sh.event("stats.getDomain", data));
    return cb(0);
  }));
};

stats.reset = function (req, res, cb) {
  shlog.debug("stats", "stats.reset", req.body.domain, req.body.key);

  shstats.reset(req.body.domain, req.body.key, _w(cb, function (err, data) {
    res.add(sh.event("stats.reset", {domain: req.body.domain, key: req.body.key, value: data}));
    return cb(0);
  }));
};

stats.getAll = function (req, res, cb) {
  shlog.debug("stats", "stats.getAll");

  shstats.getAll(_w(cb, function (err, stats) {
    if (err) {
      res.add(sh.error("stats-bad", "unable to get object", stats));
      return cb(0);
    }
    res.add(sh.event("stats.getAll", stats));
    return cb(0);
  }));
};

stats.resetAll = function (req, res, cb) {
  shlog.debug("stats", "stats.resetAll");

  shstats.resetAll(_w(cb, function (err, stats) {
    if (err) {
      res.add(sh.error("stats-reset", "unable to reset stats", stats));
      return cb(0);
    }
    res.add(sh.event("stats.resetAll", stats));
    return cb(0);
  }));
};