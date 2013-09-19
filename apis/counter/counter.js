var _ = require("lodash");
var crypto = require("crypto");

var shlog = require(global.C.BASE_DIR + "/lib/shlog.js");
var sh = require(global.C.BASE_DIR + "/lib/shutil.js");
var _w = require(global.C.BASE_DIR + "/lib/shcb.js")._w;

var dispatch = require(global.C.BASE_DIR + "/lib/shdispatch.js");

var counter = exports;

counter.desc = "generic object store";
counter.functions = {
  get: {desc: "get counter", params: {name: {dtype: "string"}}, security: []}
};

function makeKey(uid, name) {
  return global.C.DB_SCOPE + "ct:" + uid + ":" + name;
}

counter.incr = function (uid, name, amount, cb) {
  if (!_.isNumber(amount)) {
    amount = 1;
  }
  if (!_.isFunction(cb)) {
    cb = function () {};
  }
  var key = makeKey(uid, name);
  global.db.incrby(key, amount, _w(cb, function (err, data) {
    dispatch.sendUser(uid, sh.event("counter.update", {name: name, count: data}), cb);
  }));
};

counter.decr = function (uid, name, amount, cb) {
  if (!_.isNumber(amount)) {
    amount = 1;
  }
  if (!_.isFunction(cb)) {
    cb = function () {};
  }
  var key = makeKey(uid, name);
  global.db.decrby(key, amount, _w(cb, function (err, data) {
    dispatch.sendUser(uid, sh.event("counter.update", {name: name, count: data}), cb);
  }));
};

counter.set = function (uid, name, amount, cb) {
  if (!_.isFunction(cb)) {
    cb = function () {};
  }
  var key = makeKey(uid, name);
  global.db.set(key, amount, _w(cb, function (err, data) {
    dispatch.sendUser(uid, sh.event("counter.update", {name: name, count: amount}), cb);
  }));
};

counter.get = function (req, res, cb) {
  shlog.info("counter", "counter.get");

  var key = makeKey(req.session.uid, req.body.name);
  global.db.get(key, _w(cb, function (err, count) {
    if (err) {
      res.add(sh.error("counter-get", "unable to get counter", count));
      return cb(1);
    }
    if (count === null) {
      count = 0;
    }
    res.add(sh.event("counter.get", {name: req.body.name, count: parseInt(count, 10)}));
    return cb(0);
  }));
};