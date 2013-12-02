var util = require("util");
var _ = require("lodash");

var sh = require(global.C.BASE_DIR + "/lib/shutil.js");
var shlog = require(global.C.BASE_DIR + "/lib/shlog.js");
var ShObject = require(global.C.BASE_DIR + "/lib/do/shobject.js");

function EmailMap() {
  ShObject.call(this);

  this._keyType = "kEmailMap";
  this._keyFormat = "em:%s";
  this._data = {
    uid: "",
    password: "",
    confirmed: false,
    cid: sh.uuid()
  };
}

util.inherits(EmailMap, ShObject);
module.exports = EmailMap;