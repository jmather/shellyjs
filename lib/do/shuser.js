var util = require("util");
var crypto = require("crypto");
var _ = require("lodash");

var sh = require(global.C.BASE_DIR + "/lib/shutil.js");
var shlog = require(global.C.BASE_DIR + "/lib/shlog.js");
var ShObject = require(global.C.BASE_DIR + "/lib/do/shobject.js");

function User() {
  ShObject.call(this);

  this._keyType = "kUser";
  this._keyFormat = "u:%s";
  this._data = {
    name: "",
    pict: "",
    email: "",
    phone: "",
    age: 0,
    gender: "",
    roles: [],
    blockEmails: []
  };
}

util.inherits(User, ShObject);
module.exports = User;

User.prototype.loadOrCreate = function (uid, cb) {
  var self = this;
  ShObject.prototype.loadOrCreate.call(this, uid, function (err, data) {
    if (!err) {
      if (self._data.name.length === 0) {
        self._data.name = "player-" + uid.substr(0, 4);
      }
      // SWD - always set this for now
      var hash = crypto.createHash("md5").update(self._data.email).digest("hex");
      self._data.pict = "http://gravatar.com/avatar/" + hash + "?d=mm";
    }
    cb(err, self);
  });
};

User.prototype.hasRole = function (role) {
  return _.contains(this._data.roles, role);
};

User.prototype.profile = function () {
  var profile = {
    uid: this._data.oid,
    name: this._data.name,
    age: this._data.age,
    gender: this._data.gender,
    pict: this._data.pict
  };
  return profile;
};