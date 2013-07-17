var util = require("util");
var crypto = require("crypto");
var _ = require("lodash");

var sh = require(global.gBaseDir + "/src/shutil.js");
var shlog = require(global.gBaseDir + "/src/shlog.js");
var ShObject = require(global.gBaseDir + "/src/do/shobject.js");

function User() {
  ShObject.call(this);

  this._keyType = "kUser";
  this._keyFormat = "u:%s";
  this._data = {
    name: "",
    pict: "",
    email: "",
    age: 0,
    gender: "",
    roles: []
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

User.prototype.setData = function (data) {
  ShObject.prototype.setData.call(this, data);
  if (!_.isUndefined(data.roles)) {
    this._data.roles = data.roles;
  }
};

User.prototype.hasRole = function (role) {
  return _.contains(this._data.roles, role);
};