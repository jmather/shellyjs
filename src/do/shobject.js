var util = require("util");
var crypto = require("crypto");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var shkeys = require(global.gBaseDir + "/src/shkeys.js");

var db = global.db;

function ShObject() {
  this._keyType = "kObject";
  this._keyFormat = "obj:%s";
  this._data = {
    oid: "0"
  };
  this._oid = 0;
  this._hash = "";
  this._key = "";
}

module.exports = ShObject;

ShObject.prototype.typeError = function (data) {
  var self = this;
  var badKeys = null;
  Object.keys(data).forEach(function (key) {
    if (Object.prototype.toString.call(data[key]) !== Object.prototype.toString.call(self._data[key])) {
      if (!badKeys) {
        badKeys = [key];
      } else {
        badKeys.push(key);
      }
    }
  });
  return badKeys;
};

ShObject.prototype.key = function () {
  return this._key;
};

ShObject.prototype.create = function (oid, cb) {
  this._oid = oid;
  this._key = shkeys.get(this._keyType, this._oid);
  this._data.oid = oid;
  var ts = new Date().getTime();
  this._data.created = ts;
  this._data.modified = ts;
  // leave hash empty as it must be saved
  if (_.isFunction(cb)) {
    return cb(0, this);
  }
};

ShObject.prototype.load = function (oid, cb) {
  if (!_.isString(oid)) {
    return cb(1, sh.intMsg("oid-bad", oid));
  }

  this._oid = oid;
  this._key = shkeys.get(this._keyType, this._oid);

  var self = this;
  db.get(this._key, function (err, value) {
    if (value === null) {
      return cb(1, sh.intMsg("get-null", value));
    }
    try {
      var savedData = JSON.parse(value);
      self._hash = crypto.createHash("md5").update(value).digest("hex");
      self._data = _.assign(self._data, savedData);
    } catch (e) {
      return cb(1, sh.intMsg("object-parse", {message: e.message, value: value}));
    }
    return cb(0, self); // object is valid
  });
};

ShObject.prototype.loadOrCreate = function (oid, cb) {
  var self = this;
  this.load(oid, function (error, value) {
    if (error) {
      self.create(oid);
    }
    return cb(0, self);  // object must be valid
  });
};

ShObject.prototype.save = function (cb) {
  var currHash = crypto.createHash("md5").update(JSON.stringify(this._data)).digest("hex");

  if (currHash === this._hash) {
    shlog.info("ignoring save - object not modified: %s", this._key);
    return cb(0, sh.intMsg("object-same", "object has not changed"));
  }
  var now = new Date().getTime();
  this._data.modified = now;

  var self = this;
  var dataStr = JSON.stringify(this._data);
  db.set(this._key, dataStr, function (err, res) {
    if (err) {
      return cb(2, sh.intMsg("set-failed", res));
    }
    shlog.info("object saved: %s", self._key);
    self._hash = currHash;
    return cb(0, sh.intMsg("object-saved", self._key));
  });
};

ShObject.prototype.get = function (key) {
  return this._data[key];
};

ShObject.prototype.set = function (key, value) {
  this._data[key] = value;
};

ShObject.prototype.getData = function () {
  return this._data;
};

ShObject.prototype.setData = function (data) {
  _.assign(this._data, data);
};