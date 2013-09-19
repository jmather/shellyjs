var util = require("util");
var _ = require("lodash");

var shlog = require(global.C.BASE_DIR + "/lib/shlog.js");
var ShObject = require(global.C.BASE_DIR + "/lib/do/shobject.js");

function PlayerSet() {
  ShObject.call(this);

  this._keyType = "kPlayerSet";
  this._keyFormat = "ps:%s";
  this._data = {
    set: {}
  };
  this._max = 10;
}

util.inherits(PlayerSet, ShObject);
module.exports = PlayerSet;

PlayerSet.prototype.add = function (player) {
  shlog.info("shplayerset", "add player:", player.get("name"), player.get("oid"));
  if (_.isObject(this._data.set[player.get("oid")])) {
    return;
  }

  this._data.set[player.get("oid")] = player.profile();

  var idx = Object.keys(this._data.set);
  if (idx.length > this._max) {
    var uid = idx.shift();
    delete this._data.set[uid];
  }
};