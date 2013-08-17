var fs = require("fs");
var _ = require("lodash");
var async = require("async");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var shkeys = require(global.gBaseDir + "/src/shkeys.js");
var shlock = require(global.gBaseDir + "/src/shlock.js");
var _w = require(global.gBaseDir + "/src/shcb.js")._w;

function ShLoader(db) {
  if (_.isObject(db)) {
    this._db = db;
  } else {
    this._db = global.db;
  }
  this._objects = {};
  this._locks = {};

  this._cacheHit = 0;
  this._cacheMiss = 0;
  this._saves = 0;
}

module.exports = ShLoader;

ShLoader.prototype.loadHelper = function (funcName, keyType, params, cb, pOpts) {
  if (!shkeys.validKey(keyType)) {
    return cb(1, sh.intMsg("keytype-bad", keyType));
  }
  var opts = {checkCache: true, lock: false};
  if (funcName === "create") {
    opts.lock = true; // always lock the creates
  }
  if (_.isObject(opts)) {
    _.assign(opts, pOpts);
  }

  // check cache
  var key = shkeys.get(keyType, params);
  if (opts.checkCache) {
    if (_.isObject(this._objects[key])) {
      // if asking for lock we must have it for cached version
      if (!opts.lock || (opts.lock && this._locks[key])) {
        shlog.info("shloader", "cache hit: %s", key);
        this._cacheHit += 1;
        return cb(0, this._objects[key]);
      }
    }
    this._cacheMiss += 1;
  }

  var ShClass = null;
  try {
    ShClass = require(shkeys.moduleFile(keyType));
  } catch (e) {
    return cb(1, sh.intMsg("module-load-failed", shkeys.moduleFile(keyType)));
  }

  shlog.info("shloader", "%s: %s - %s", funcName, keyType, params);
  var self = this;
  var obj = new ShClass();
  if (opts.lock) {
    shlock.acquire(key, _w(cb, function (err, data) {
      if (err) {
        return cb(err, data);
      }
      obj[funcName](params, function (err, data) {
        if (!err) {
          shlog.info("shloader", "cache store: %s", obj._key);
          self._objects[obj._key] = obj;
          self._locks[obj._key] = true;
          return cb(0, obj);
        }
        return cb(err, data);
      });
    }));
  } else {
    obj[funcName](params, _w(cb, function (err, data) {
      if (!err) {
        shlog.info("shloader", "cache store: %s", obj._key);
        self._objects[obj._key] = obj;
        return cb(0, obj);
      }
      return cb(err, data);
    }));
  }
};

ShLoader.prototype.create = function (keyType, params, cb, pOpts) {
  this.loadHelper("create", keyType, params, cb, pOpts);
};

ShLoader.prototype.exists = function (keyType, params, cb, pOpts) {
  this.loadHelper("load", keyType, params, cb, pOpts);
};

ShLoader.prototype.get = function (keyType, params, cb, pOpts) {
  this.loadHelper("loadOrCreate", keyType, params, cb, pOpts);
};

ShLoader.prototype.delete = function (keyType, params, cb) {
  if (!shkeys.validKey(keyType)) {
    return cb(1, sh.intMsg("keytype-bad", keyType));
  }

  var key = shkeys.get(keyType, params);
  shlog.info("shloader", "delete object", key);
  delete this._objects[key];

  var self = this;
  this._db.del(key, _w(cb, function (err, data) {
    if (self._locks[key]) {
      delete self._locks[key];
      shlock.release(key, cb);
    } else {
      cb(0);
    }
  }));
};

ShLoader.prototype.dump = function (cb) {
  shlog.info("shloader", "dump start");
  var self = this;
  async.each(Object.keys(this._objects), function (key, lcb) {
    shlog.info("shloader", "dumping: %s", key);
    self._objects[key].save(_w(lcb, function (err, data) {
      if (data.code === "object-saved") {
        self._saves += 1;
      }
      if (self._locks[key]) {
        delete self._locks[key];
        shlock.release(key, _w(lcb, function (err, data) {
          // ignore any errors, as we need to keep going
          lcb(0);
        }));
      } else {
        lcb(0);
      }
    }));
  }, function (err) {
    shlog.info("shloader", "dump complete:", self._cacheHit, "misses:", self._cacheMiss, "saves:", self._saves);
    if (_.isFunction(cb)) {
      cb(0);
    }
  });
};