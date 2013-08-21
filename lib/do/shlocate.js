var util = require("util");
var _ = require("lodash");

var sh = require(global.C.BASEDIR + "/lib/shutil.js");
var shlog = require(global.C.BASEDIR + "/lib/shlog.js");
var ShObject = require(global.C.BASEDIR + "/lib/do/shobject.js");

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