var util = require("util");
var crypto = require("crypto");
var _ = require("lodash");

var shlog = require(global.C.BASE_DIR + "/lib/shlog.js");
var sh = require(global.C.BASE_DIR + "/lib/shutil.js");
var shkeys = require(global.C.BASE_DIR + "/lib/shkeys.js");

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
  global.db.get(this._key, function (err, value) {
    if (err) {            // db had problems
      return cb(2, sh.intMsg("get-failed", {key: self._key, info: value}));
    }
    if (value === null) { // object is not there
      return cb(0, value);
    }
    try {                 // found it parse, init, and set hash
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
      return cb(1, value);
    }
    if (value === null) {    // no errors, but no object, create one
      self.create(oid);
    }
    return cb(0, self);
  });
};

ShObject.prototype.save = function (cb) {
  var currHash = crypto.createHash("md5").update(JSON.stringify(this._data)).digest("hex");

  if (currHash === this._hash) {
    shlog.info("shobject", "ignoring save - object not modified: %s", this._key);
    return cb(0, sh.intMsg("object-same", "object has not changed"));
  }
  var now = new Date().getTime();
  this._data.modified = now;

  var self = this;
  var dataStr = JSON.stringify(this._data);
  global.db.set(this._key, dataStr, function (err, res) {
    if (err) {
      return cb(2, sh.intMsg("set-failed", {key: self._key, info: res}));
    }
    shlog.info("shobject", "object saved: %s", self._key);
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