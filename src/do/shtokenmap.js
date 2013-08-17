var util = require("util");

var ShObject = require(global.C.BASEDIR + "/src/do/shobject.js");

function TokenMap() {
  ShObject.call(this);

  this._keyType = "kTokenMap";
  this._keyFormat = "tm:%s";
  this._data = {
    uid: ""
  };
}

util.inherits(TokenMap, ShObject);
module.exports = TokenMap;