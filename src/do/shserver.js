var util = require("util");
//var _ = require("lodash");

//var sh = require(global.gBaseDir + "/src/shutil.js");
//var shlog = require(global.gBaseDir + "/src/shlog.js");
var ShObject = require(global.gBaseDir + "/src/do/shobject.js");

function ShServer() {
  ShObject.call(this);

  this._keyType = "kServer";
  this._keyFormat = "serv:%s";
  this._data = {
    ip: "",
    port: 0
  };
}

util.inherits(ShServer, ShObject);
module.exports = ShServer;