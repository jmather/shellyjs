var util = require("util");
var events = require("events");
var _ = require("lodash");

var sh = require(global.C.BASEDIR + "/lib/shutil.js");
var shlog = require(global.C.BASEDIR + "/lib/shlog.js");
var ShObject = require(global.C.BASEDIR + "/lib/do/shobject.js");

function Game() {
  ShObject.call(this);

  this._keyType = "kGame";
  this._keyFormat = "game:%s";
  var ts = new Date().getTime();
  this._data = {
    name: "",
    ownerId: 0,
    created: ts,
    lastModified: ts,
    status: "open",
    minPlayers: 2,
    maxPlayers: 2,
    players: {},
    playerOrder: [],
    whoTurn: 0,
    rounds: 0,
    turnsPlayed: 0
  };
}

util.inherits(Game, ShObject);
module.exports = Game;

Game.prototype.setPlayer = function (uid, status) {
  this._dirty = true;
  if (_.isUndefined(this._data.players[uid])) {
    this._data.players[uid] = {status: "ready"};
  } else {
    this._data.players[uid].status = status;
  }
  if (this._data.playerOrder.indexOf(uid) === -1) {
    this._data.playerOrder.push(uid);
  }
};

Game.prototype.removePlayer = function (uid) {
  this._dirty = true;
  delete this._data.players[uid];
  this._data.playerOrder = _.filter(this._data.playerOrder, function (playerId) { return playerId !== uid; });
};
