var util = require('util');
var events = require('events');
var _ = require("lodash");

var sh = require(global.gBaseDir + '/src/shutil.js');

var db = global.db;

function User() {
  var self = this;

  this._dirty = false;
  this._data = {
    currentGames: {}
  };

  this._uid = 0;
}

/**
 * Inherits from EventEmitter.
 */

util.inherits(User, events.EventEmitter);
module.exports = User;

User.prototype.load = function (uid, cb) {
  this._uid = uid;

  var self = this;
  db.kget('kUser', uid, function (err, value) {
    if (value === null) {
      cb(1, sh.error("user_get", "unable to load user data", {uid: uid}));
      return;
    }
    try {
      var savedData = JSON.parse(value);
      self._data = _.merge(self._data, savedData);
    } catch (e) {
      cb(1, sh.error("user_parse", "unable to parse user data", {uid: uid, extra: e.message}));
      return;
    }
    cb(0, self._data);
  });
};

User.prototype.loadOrCreate = function (uid, cb) {
  var self = this;
  this.load(uid, function (error, value) {
    if (error !== 0) {
      self.save(cb);
    } else {
      cb(0, self._data);
    }
  });
};

User.prototype.save = function (cb) {
  var self = this;
  var dataStr = JSON.stringify(this._data);
  db.kset('kUser', this._uid, dataStr, function (err, res) {
    if (err !== null) {
      cb(1, sh.error("user_save", "unable to save user data", {uid: self._uid}));
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
    // SWD: don't care for now
  });
};

User.prototype.getData = function () {
  return this._data;
};

User.prototype.setData = function (data) {
  this._dirty = true;
  this._data = _.merge(this._data, data);
};

User.prototype.addGame = function (game) {
  // set users current games and ts
  var ts = new Date().getTime();
  this._data.currentGames[game.get("gameId")] = {name: game.get("name"), lastJoin: ts};
  this.save(function () {
    // don't care;
  });
};