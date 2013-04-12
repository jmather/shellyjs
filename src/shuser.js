var util = require("util");
var _ = require("lodash");

var sh = require(global.gBaseDir + "/src/shutil.js");
var shlog = require(global.gBaseDir + "/src/shlog.js");
var ShObject = require(global.gBaseDir + "/src/shobject.js");

function User() {
  ShObject.call(this);

  this._keyType = "kUser";
  this._data = {
    name: "",
    email: "",
    age: "0",
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
    }
    cb(err, self);
  });
};

User.prototype.hasRole = function (role) {
  return _.contains(this._data.roles, role);
};