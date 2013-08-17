var util = require("util");
var _ = require("lodash");

var sh = require(global.C.BASEDIR + "/src/shutil.js");
var shlog = require(global.C.BASEDIR + "/src/shlog.js");
var ShObject = require(global.C.BASEDIR + "/src/do/shobject.js");

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