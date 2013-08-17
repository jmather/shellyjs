var util = require("util");
//var _ = require("lodash");

//var sh = require(global.C.BASEDIR + "/src/shutil.js");
//var shlog = require(global.C.BASEDIR + "/src/shlog.js");
var ShObject = require(global.C.BASEDIR + "/src/do/shobject.js");

function ShServer() {
  ShObject.call(this);

  this._keyType = "kServer";
  this._keyFormat = "serv:%s";
  this._data = {
    clusterUrl: "",
    socketUrl: ""
  };
}

util.inherits(ShServer, ShObject);
module.exports = ShServer;