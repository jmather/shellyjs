var util = require("util");
var _ = require("lodash");

var sh = require(global.gBaseDir + "/src/shutil.js");
var shlog = require(global.gBaseDir + "/src/shlog.js");
var ShObject = require(global.gBaseDir + "/src/do/shobject.js");

function ShLocate() {
  ShObject.call(this);

  this._keyType = "kLocate";
  this._keyFormat = "loc:%s";
  this._data = {
    oid: "",
    serverId: null,
    workerId: null,
    socketId: null,
    name: "player0"
  };
}

util.inherits(ShLocate, ShObject);
module.exports = ShLocate;