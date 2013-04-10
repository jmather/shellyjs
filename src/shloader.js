var _ = require("lodash");
var async = require("async");

var shlog = require(global.gBaseDir + "/src/shlog.js");

var moduleMap = {
  kObject : {module: null, file: "/src/shobject.js"},
  kUser : {module: null, file: "/src/shuser.js"},
  kPlaying : {module: null, file: "/src/shplaying.js"}
};

function ShLoader() {
  this._db = global.db;
  this._objects = {};
}

module.exports = ShLoader;

ShLoader.prototype.get = function (keyType, params, cb) {
  if (_.isUndefined(moduleMap[keyType])) {
    cb(1, {message: "bad key"});
    return;
  }

  var key = global.db.key(keyType, params);

  if (_.isObject(this._objects[key])) {
    shlog.info("cache hit: '%s'", key);
    cb(0, this._objects[key]);
    return;
  }

  var ShClass = null;
  try {
    ShClass = require(global.gBaseDir + moduleMap[keyType].file);
  } catch (e) {
    cb(1, {message: "unable to lod module", data: moduleMap[keyType]});
    return;
  }

  var self = this;
  var obj = new ShClass();
  shlog.info("loadOrCreate: '%s'", key);
  obj.loadOrCreate(params, function (err, data) {
    if (!err) {
      self._objects[key] = obj;
      cb(0, obj);
      return;
    }
    cb(err, data);
  });
};

ShLoader.prototype.dump = function (cb) {
  var self = this;
  async.each(Object.keys(this._objects), function (key, cb) {
    shlog.info("dumping: '%s'", key);
    self._objects[key].save(cb);
  }, function (err) {
    shlog.info("dump complete");
    if (_.isFunction(cb)) {
      cb(0);
    }
  });
};