var util = require("util");
var events = require("events");
var _ = require("lodash");

var sh = require(global.gBaseDir + "/src/shutil.js");
var shlog = require(global.gBaseDir + "/src/shlog.js");
var ShObject = require(global.gBaseDir + "/src/shobject.js");

function Playing() {
  this._keyType = "kPlaying",
  this._data = {
    name: "",
    currentGames: {}
  };
}

util.inherits(Playing, ShObject);
module.exports = Playing;

Playing.prototype.addGame = function (game) {
  var ts = new Date().getTime();
  this._data.currentGames[game.get("gameId")] = {name: game.get("name"), lastJoin: ts};
};

Playing.prototype.removeGame = function (game) {
  var ts = new Date().getTime();
  delete this._data.currentGames[game.get("gameId")];
};