var util = require("util");
var _ = require("lodash");

var sh = require(global.C.BASEDIR + "/src/shutil.js");
var shlog = require(global.C.BASEDIR + "/src/shlog.js");
var ShObject = require(global.C.BASEDIR + "/src/do/shobject.js");

function EmailMap() {
  ShObject.call(this);

  this._keyType = "kEmailMap";
  this._keyFormat = "em:%s";
  this._data = {
    uid: "",
    password: ""
  };
}

util.inherits(EmailMap, ShObject);
module.exports = EmailMap;