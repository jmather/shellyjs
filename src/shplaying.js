var util = require("util");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var ShObject = require(global.gBaseDir + "/src/shobject.js");

function Playing() {
  ShObject.call(this);

  this._keyType = "kPlaying";
  this._data = {
    name: "",
    currentGames: {}
  };
}

util.inherits(Playing, ShObject);
module.exports = Playing;

Playing.prototype.addGame = function (game) {
  shlog.info("add game:", game.get("oid"), game.get("name"));

  var ts = new Date().getTime();
  this._data.currentGames[game.get("oid")] = {name: game.get("name"), lastJoin: ts};
};

Playing.prototype.removeGame = function (game) {
  shlog.info("remove game:", game.get("oid"));

  delete this._data.currentGames[game.get("oid")];
};