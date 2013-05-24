var util = require("util");

var ShObject = require(global.gBaseDir + "/src/do/shobject.js");

function TokenMap() {
  ShObject.call(this);

  this._keyType = "kTokenMap";
  this._data = {
    uid: ""
  };
}

util.inherits(TokenMap, ShObject);
module.exports = TokenMap;