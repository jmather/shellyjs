var _ = require("lodash");
var async = require("async");

var shlog = require(global.gBaseDir + "/src/shlog.js");

function ShLoader() {
  this._db = global.db;
  this._objects = {};
}

module.exports = ShLoader;

ShLoader.prototype.create = function (keyType, params) {
  if (!this._db.validKey(keyType)) {
    shlog.error("bad key passed to create:", keyType);
    return null;
  }

  var ShClass = null;
  try {
    ShClass = require(this._db.moduleFile(keyType));
  } catch (e) {
    shlog.error("unable to load object module", keyType);
    return null;
  }

  shlog.info("create-create: %s - %s", keyType, params);
  var obj = new ShClass();
  obj.create(params);  // SWD assumes params is just oid for shobjects
  this._objects[obj._key] = obj;
  shlog.info("create-new: %s", obj._key);

  return obj;
};

ShLoader.prototype.exists = function (keyType, params, cb) {
  if (!this._db.validKey(keyType)) {
    cb(1, {message: "bad object key type", data: keyType});
    return;
  }

  // check cache
  var key = this._db.key(keyType, params);
  if (_.isObject(this._objects[key])) {
    shlog.info("cache hit: %s", key);
    cb(0, this._objects[key]);
    return;
  }

  var ShClass = null;
  try {
    ShClass = require(this._db.moduleFile(keyType));
  } catch (e) {
    cb(1, {message: "unable to load object module", data: keyType});
    return;
  }

  shlog.info("exists-load: %s - %s", keyType, params);
  var self = this;
  var obj = new ShClass();
  obj.load(params, function (err, data) {
    if (!err) {
      self._objects[obj._key] = obj;
      cb(0, obj);
      return;
    }
    cb(err, data);
  });
};

ShLoader.prototype.get = function (keyType, params, cb) {
  if (!this._db.validKey(keyType)) {
    cb(1, {message: "bad object key type", data: keyType});
    return;
  }

  // check cache
  var key = this._db.key(keyType, params);
  if (_.isObject(this._objects[key])) {
    shlog.info("cache hit: %s", key);
    cb(0, this._objects[key]);
    return;
  }

  var ShClass = null;
  try {
    ShClass = require(this._db.moduleFile(keyType));
  } catch (e) {
    cb(1, {message: "unable to lod module", data: moduleMap[keyType]});
    return;
  }

  shlog.info("get-loadOrCreate: %s - %s", keyType, params);
  var self = this;
  var obj = new ShClass();
  obj.loadOrCreate(params, function (err, data) {
    if (!err) {
      self._objects[obj._key] = obj;
      cb(0, obj);
      return;
    }
    cb(err, data);
  });
};

ShLoader.prototype.delete = function (keyType, params, cb) {
  if (!this._db.validKey(keyType)) {
    cb(1, {message: "bad object key type", data: keyType});
    return;
  }

  var key = this._db.key(keyType, params);
  shlog.info("delete object", key);
  delete this._objects[key];

  this._db.kdelete(keyType, params, cb);
};

ShLoader.prototype.dump = function (cb) {
  shlog.info("dump start");
  var self = this;
  async.each(Object.keys(this._objects), function (key, cb) {
    shlog.info("dumping: %s", key);
    self._objects[key].save(cb);
  }, function (err) {
    shlog.info("dump complete");
    if (_.isFunction(cb)) {
      cb(0);
    }
  });
};