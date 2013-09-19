var util = require("util");

var shlog = require(global.C.BASE_DIR + "/lib/shlog.js");
var ShObject = require(global.C.BASE_DIR + "/lib/do/shobject.js");

function Playing() {
  ShObject.call(this);

  this._keyType = "kPlaying";
  this._keyFormat = "gp:%s";
  this._data = {
    name: "",
    currentGames: {}
  };
}

util.inherits(Playing, ShObject);
module.exports = Playing;

Playing.prototype.addGame = function (game) {
  shlog.info("shplaying", "add game:", game.get("oid"), game.get("name"));

  var ts = new Date().getTime();
  this._data.currentGames[game.get("oid")] = {name: game.get("name"), lastJoin: ts};
};

Playing.prototype.removeGame = function (gameId) {
  shlog.info("shplaying", "remove game:", gameId);

  delete this._data.currentGames[gameId];
};