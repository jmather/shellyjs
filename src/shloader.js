var _ = require("lodash");
var async = require("async");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var shlock = require(global.gBaseDir + "/src/shlock.js");

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

ShLoader.prototype.create = function (keyType, params, cb, pOpts) {
  if (!this._db.validKey(keyType)) {
    shlog.error("bad key passed to create:", keyType);
    return null;
  }

  var opts = {lock: false};
  if (_.isObject(opts)) {
    opts = _.merge(opts, pOpts);
  }

  var ShClass = null;
  try {
    ShClass = require(this._db.moduleFile(keyType));
  } catch (e) {
    shlog.error("unable to load object module", keyType);
    return cb(1, sh.intMsg("module-load", "unable to load object module", keyType));
  }

  var self = this;
  shlog.info("create-create: %s - %s", keyType, params);
  var obj = new ShClass();
  var key = this._db.key(keyType, params);  // SWD should be better way to get this before obj.create
  shlock.acquire(key, function (err, data) {
    if (err) {
      return cb(err, data);
    }

    obj.create(params);  // SWD assumes params is just oid for shobjects
    self._objects[obj._key] = obj;
    self._locks[obj._key] = true;
    shlog.info("create-new: %s", obj._key);
    return cb(0, obj);
  });
};

ShLoader.prototype.exists = function (keyType, params, cb, pOpts) {
  if (!this._db.validKey(keyType)) {
    return cb(1, sh.intMsg("keytype-bad", keyType));
  }
  var opts = {checkCache: true, lock: false};
  if (_.isObject(opts)) {
    opts = _.merge(opts, pOpts);
  }

  // check cache
  var key = this._db.key(keyType, params);
  if (opts.checkCache) {
    if (_.isObject(this._objects[key])) {
      shlog.info("cache hit: %s", key);
      this._cacheHit += 1;
      return cb(0, this._objects[key]);
    }
    this._cacheMiss += 1;
  }

  var ShClass = null;
  try {
    ShClass = require(this._db.moduleFile(keyType));
  } catch (e) {
    return cb(1, sh.intMsg("module-load-failed", this._db.moduleFile(keyType)));
  }

  shlog.info("exists-load: %s - %s", keyType, params);
  var self = this;
  var obj = new ShClass();
  if (obj.alwaysLock || opts.lock) {
    shlock.acquire(key, function (err, data) {
      if (err) {
        return cb(err, data);
      }
      obj.load(params, function (err, data) {
        if (!err) {
          shlog.info("cache store: %s", obj._key);
          self._objects[obj._key] = obj;
          self._locks[obj._key] = true;
          return cb(0, obj);
        }
        return cb(err, data);
      });
    });
  } else {
    obj.load(params, function (err, data) {
      if (!err) {
        shlog.info("cache store: %s", obj._key);
        self._objects[obj._key] = obj;
        return cb(0, obj);
      }
      return cb(err, data);
    });
  }
};

ShLoader.prototype.get = function (keyType, params, cb, pOpts) {
  if (!this._db.validKey(keyType)) {
    return cb(1, sh.intMsg("keytype-bad", keyType));
  }
  var opts = {checkCache: true, lock: false};
  if (_.isObject(opts)) {
    opts = _.merge(opts, pOpts);
  }

  // check cache
  var key = this._db.key(keyType, params);
  if (opts.checkCache) {
    shlog.info("get: %s", key);
    if (_.isObject(this._objects[key])) {
      this._cacheHit += 1;
      shlog.info("cache hit: %s", key);
      return cb(0, this._objects[key]);
    }
    this._cacheMiss += 1;
  }

  var ShClass = null;
  try {
    ShClass = require(this._db.moduleFile(keyType));
  } catch (e) {
    return cb(1, sh.intMsg("module-load-failed", this._db.moduleFile(keyType)));
  }

  shlog.info("get-loadOrCreate: %s - %s", keyType, params);
  var self = this;
  var obj = new ShClass();
  if (obj.alwaysLock || opts.lock) {
    shlock.acquire(key, function (err, data) {
      if (err) {
        return cb(err, data);
      }
      obj.loadOrCreate(params, function (err, data) {
        if (!err) {
          shlog.info("cache store: %s", obj._key);
          self._objects[obj._key] = obj;
          self._locks[obj._key] = true;
          return cb(0, obj);
        }
        return cb(err, data);
      });
    });
  } else {
    obj.loadOrCreate(params, function (err, data) {
      if (!err) {
        shlog.info("cache store: %s", obj._key);
        self._objects[obj._key] = obj;
        return cb(0, obj);
      }
      return cb(err, data);
    });
  }
};

ShLoader.prototype.delete = function (keyType, params, cb) {
  if (!this._db.validKey(keyType)) {
    return cb(1, sh.intMsg("keytype-bad", keyType));
  }

  var key = this._db.key(keyType, params);
  shlog.info("delete object", key);
  delete this._objects[key];

  var self = this;
  this._db.kdelete(keyType, params, function (err, data) {
    if (self._locks[key]) {
      delete self._locks[key];
      shlock.release(key, cb);
    } else {
      cb(0);
    }
  });
};

ShLoader.prototype.dump = function (cb) {
  shlog.info("dump start");
  var self = this;
  async.each(Object.keys(this._objects), function (key, lcb) {
    shlog.info("dumping: %s", key);
    self._objects[key].save(function (err, data) {
      if (data.code === "object-saved") {
        self._saves += 1;
      }
      if (self._locks[key]) {
        delete self._locks[key];
        shlock.release(key, function (err, data) {
          // ignore any errors, as we need to keep going
          lcb(0);
        });
      } else {
        lcb(0);
      }
    });
  }, function (err) {
    shlog.info("dump complete:", self._cacheHit, "misses:", self._cacheMiss, "saves:", self._saves);
    if (_.isFunction(cb)) {
      cb(0);
    }
  });
};