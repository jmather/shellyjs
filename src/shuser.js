var util = require("util");
var events = require("events");
var _ = require("lodash");

var sh = require(global.gBaseDir + "/src/shutil.js");
var shlog = require(global.gBaseDir + "/src/shlog.js");

var db = global.db;

function User() {
  this._dirty = false;
  this._data = {
    uid: "0",
    name: "",
    email: "",
    age: "0",
    gender: "",
    roles: []
  };

  this._uid = 0;
}

/**
 * Inherits from EventEmitter.
 */

util.inherits(User, events.EventEmitter);
module.exports = User;

User.prototype.load = function (uid, cb) {
  if (!_.isString(uid)) {
    cb(1, sh.error("bad_uid", "user load uid is not a string", {uid: uid}));
    return;
  }

  this._uid = uid;

  var self = this;
  db.kget("kUser", uid, function (err, value) {
    if (value === null) {
      cb(1, sh.error("user_get", "unable to load user data", {uid: uid}));
      return;
    }
    try {
      var savedData = JSON.parse(value);
      self._data = _.merge(self._data, savedData);
      self._data.uid = uid;
      if (self._data.name.length === 0) {
        self._data.name = "player" + uid.substr(0, 4);
      }
    } catch (e) {
      cb(1, sh.error("user_parse", "unable to parse user data", {uid: uid, extra: e.message}));
      return;
    }
    cb(0); // object is valid
  });
};

User.prototype.loadOrCreate = function (uid, cb) {
  if (!_.isString(uid)) {
    cb(1, sh.error("bad_uid", "user load uid is not a string", {uid: uid}));
    return;
  }

  var self = this;
  this.load(uid, function (error, value) {
    if (error) {
      self._data.uid = uid;
      self._data.name = "player" + uid.substr(0, 4);
      // try and create on since we are passed session check
      self.save(cb);
    } else {
      cb(0);  // object is valid
    }
  });
};

User.prototype.save = function (cb) {
  if (!this._dirty) {
    shlog.info("ignoring save - object not modified");
    cb(0);
    return;
  }
  var self = this;
  var dataStr = JSON.stringify(this._data);
  db.kset("kUser", this._uid, dataStr, function (err, res) {
    if (err !== null) {
      cb(1, sh.error("user_save", "unable to save user data", {uid: self._uid, err: err, res: res}));
      return;
    }
    cb(0);
  });
};

User.prototype.get = function (key) {
  return this._data[key];
};

User.prototype.set = function (key, value) {
  this._dirty = true;
  this._data[key] = value;
  this.save(function () {
    // SWD: don"t care for now
  });
};

User.prototype.getData = function () {
  return this._data;
};

User.prototype.setData = function (data) {
  this._dirty = true;
  this._data = _.merge(this._data, data);
};

User.prototype.hasRole = function (role) {
  return _.contains(this._data.roles, role);
};