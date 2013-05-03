var util = require("util");
var crypto = require("crypto");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");

var db = global.db;

function ShObject() {
  this._data = {
    oid: "0"
  };
  this._oid = 0;
  this._hash = "";

  this._keyType = "kObject";
  this._key = "";
}

module.exports = ShObject;

ShObject.prototype.key = function () {
  return this._key;
};

ShObject.prototype.create = function (oid) {
  this._oid = oid;
  this._key = db.key(this._keyType, this._oid);
  this._data.oid = oid;
  var ts = new Date().getTime();
  this._data.created = ts;
  this._data.modified = ts;
  // leave hash empty as it must be saved
};

ShObject.prototype.load = function (oid, cb) {
  if (!_.isString(oid)) {
    cb(1, {code: "bad_oid", message: "unable to load - oid is not a string", info: {oid: oid}});
    return;
  }

  this._oid = oid;
  this._key = db.key(this._keyType, this._oid);

  var self = this;
  db.kget(this._keyType, oid, function (err, value) {
    if (value === null) {
      cb(1, {code: "object_get", message: "unable to load object data", info: {oid: oid}});
      return;
    }
    try {
      var savedData = JSON.parse(value);
      self._hash = crypto.createHash("md5").update(value).digest("hex");
      self._data = _.merge(self._data, savedData);
    } catch (e) {
      cb(1, {code: "object_parse", message: "unable to parse object data", info: {oid: oid, message: e.message}});
      return;
    }
    cb(0, self); // object is valid
  });
};

ShObject.prototype.loadOrCreate = function (oid, cb) {
  var self = this;
  this.load(oid, function (error, value) {
    if (error) {
      self.create(oid);
    }
    cb(0);  // object must be valid
  });
};

ShObject.prototype.save = function (cb) {
  var currHash = crypto.createHash("md5").update(JSON.stringify(this._data)).digest("hex");

  if (currHash === this._hash) {
    shlog.info("ignoring save - object not modified '%s'", this._key);
    cb(0);
    return;
  }
  var now = new Date().getTime();
  this._data.modified = now;

  var self = this;
  var dataStr = JSON.stringify(this._data);
  db.kset(this._keyType, this._oid, dataStr, function (err, res) {
    if (err !== null) {
      cb(1, {code: "object_save", message: "unable to save object data", info: {oid: self._oid, err: err, res: res}});
      return;
    }
    shlog.info("object saved '%s'", self._key);
    self._hash = currHash;
    cb(0);
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
  this._data = _.merge(this._data, data);
};