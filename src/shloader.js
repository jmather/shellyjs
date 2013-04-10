var _ = require("lodash");
var async = require("async");

var shlog = require(global.gBaseDir + "/src/shlog.js");

var moduleMap = {
  kObject : {module: null, file: "/src/shobject.js"}
};

function ShLoader() {
  this._db = global.db;
  this._objects = {};
}

module.exports = ShLoader;

ShLoader.prototype.loadOrCreate = function (keyType, params, cb) {
  if (_.isUndefined(moduleMap[keyType])) {
    cb(1, {message: "bad key"});
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
  obj.loadOrCreate(params, function (err, data) {
    if (!err) {
      self._objects[obj.key()] = obj;
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
    cb(0);
  });
};