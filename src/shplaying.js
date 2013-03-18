var util = require("util");
var events = require("events");
var _ = require("lodash");

var sh = require(global.gBaseDir + "/src/shutil.js");
var shlog = require(global.gBaseDir + "/src/shlog.js");

var db = global.db;

function Playing() {
  this._dirty = false;
  this._data = {
    uid: 0,
    name: "",
    currentGames: {}
  };

  this._uid = 0;
}

/**
 * Inherits from EventEmitter.
 */

util.inherits(Playing, events.EventEmitter);
module.exports = Playing;

Playing.prototype.load = function (uid, cb) {
  this._uid = uid;

  var self = this;
  db.kget("kPlaying", uid, function (err, value) {
    if (value === null) {
      cb(1, sh.error("playing_get", "unable to load playing data", {uid: uid}));
      return;
    }
    try {
      var savedData = JSON.parse(value);
      self._data.uid = uid;
      self._data = _.merge(self._data, savedData);
    } catch (e) {
      cb(1, sh.error("playing_parse", "unable to parse playing data", {uid: uid, extra: e.message}));
      return;
    }
    cb(0);
  });
};

Playing.prototype.loadOrCreate = function (uid, cb) {
  var self = this;
  this.load(uid, function (error, value) {
    if (error) {
      self._data.uid = uid;
      self._data.name = "player" + uid;
      // try and create on since we are passed session check
      self.save(cb);
    } else {
      cb(0);
    }
  });
};

Playing.prototype.save = function (cb) {
  if (!this._dirty) {
    shlog.info("ignoring save - object not modified");
    cb(0);
    return;
  }
  var self = this;
  var dataStr = JSON.stringify(this._data);
  db.kset("kPlaying", this._uid, dataStr, function (err, res) {
    if (err !== null) {
      cb(1, sh.error("playing_save", "unable to save playing data", {uid: self._uid, err: err, res: res}));
      return;
    }
    cb(0);
  });
};

Playing.prototype.get = function (key) {
  return this._data[key];
};

Playing.prototype.set = function (key, value) {
  this._dirty = true;
  this._data[key] = value;
  this.save(function () {
    // SWD: don"t care for now
  });
};

Playing.prototype.getData = function () {
  return this._data;
};

Playing.prototype.setData = function (data) {
  this._dirty = true;
  this._data = _.merge(this._data, data);
};

Playing.prototype.addGame = function (game) {
  this._dirty = true;
  var ts = new Date().getTime();
  this._data.currentGames[game.get("gameId")] = {name: game.get("name"), lastJoin: ts};
  this.save(function () {
    // don"t care;
  });
};

Playing.prototype.removeGame = function (game) {
  this._dirty = true;
  var ts = new Date().getTime();
  delete this._data.currentGames[game.get("gameId")];
  this.save(function () {
    // don"t care;
  });
};