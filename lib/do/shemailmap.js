var util = require("util");
var _ = require("lodash");

var sh = require(global.C.BASEDIR + "/lib/shutil.js");
var shlog = require(global.C.BASEDIR + "/lib/shlog.js");
var ShObject = require(global.C.BASEDIR + "/lib/do/shobject.js");

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