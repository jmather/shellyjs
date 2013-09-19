var util = require("util");
//var _ = require("lodash");

//var sh = require(global.C.BASE_DIR + "/lib/shutil.js");
//var shlog = require(global.C.BASE_DIR + "/lib/shlog.js");
var ShObject = require(global.C.BASE_DIR + "/lib/do/shobject.js");

function ShReset() {
  ShObject.call(this);

  this._keyType = "kReset";
  this._keyFormat = "reset:%s";
  this._data = {
    rid: "",
    uid: ""
  };
}

util.inherits(ShReset, ShObject);
module.exports = ShReset;