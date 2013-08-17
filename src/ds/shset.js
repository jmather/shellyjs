var util = require("util");
var crypto = require("crypto");
var _ = require("lodash");

var shlog = require(global.C.BASEDIR + "/src/shlog.js");
var sh = require(global.C.BASEDIR + "/src/shutil.js");

var db = global.db;

function ShSet(oid) {
  this._keyType = "kSet";
  this._keyFormat = "set:%s";
  this._data = {};
  this._oid = "";
  this._key = global.C.DB_SCOPE + util.format(this._keyFormat, oid);
//  this._hash = "";
}

module.exports = ShSet;

ShSet.prototype.key = function () {
  return this._key;
};

ShSet.prototype.getAll = function (cb) {
  var self = this;
  db.hgetall(this._key, function (err, data) {
    if (err) {
      cb(1, sh.intMsg("hgetall-null", {key: this._key, error: error, data: data}));
      return;
    }
    if (data === null) {
      return cb(0, {});
    }
    try {
      self._data = data;
      _.each(Object.keys(data), function (key) {
        data[key] = JSON.parse(data[key]);
      });
    } catch (e) {
      return cb(1, sh.intMsg("set-parse", {message: e.message, data: data}));
    }
    return cb(0, self._data);
  });
};

ShSet.prototype.loadOrCreate = function (oid, cb) {
  var self = this;
  this.load(oid, function (error, value) {
    if (error) {
      self.create(oid);
    }
    cb(0, self._data);  // object must be valid
  });
};

ShSet.prototype.save = function (cb) {
  cb(1, sh.intMsg("set-save-not-implemented", "must save elements individually for now"));
};

ShSet.prototype.get = function (field, cb) {
  db.hget(this._key, field, function (err, value) {
    if (value === null) {
      return cb(1, sh.intMsg("hget-null", value));
    }
    try {
      var data = JSON.parse(value);
      return cb(0, data);
    } catch (e) {
      return cb(1, sh.intMsg("set-parse", {message: e.message, value: value}));
    }
  });
};

ShSet.prototype.set = function (field, value, cb) {
  db.hset(this._key, field, JSON.stringify(value), function (err, value) {
    if (err) {
      return cb(1, sh.intMsg("hset-error", value));
    }
    return cb(0, value);
  });
};

ShSet.prototype.remove = function (field, cb) {
  db.hdel(this._key, field, function (err, value) {
    if (err) {
      return cb(1, sh.intMsg("hdel-error", value));
    }
    return cb(0, value);
  });
};