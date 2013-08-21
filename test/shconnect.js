var util = require("util");
var crypto = require("crypto");
var _ = require("lodash");
var request = require("supertest");

//var sh = require(global.C.BASEDIR + "/lib/shutil.js");
//var shlog = require(global.C.BASEDIR + "/lib/shlog.js");

function ShConnect(server) {
  this._started = 0;
  this._session = "";
  this._uid = "";

  this._restUrl = "http://" + server + ":5101";
  this._request = request(this._restUrl);
}

module.exports = ShConnect;

ShConnect.prototype.uid = function () {
  return this._uid;
};

ShConnect.prototype.session = function () {
  return this._session;
};

ShConnect.prototype.login = function (email, password, cb) {
  var self = this;
  this.call("reg.login", {email: email, password: password},
    function (err, res) {
      if (err) {
        cb(err, res);
        return;
      }
      self.setSession(res[0].data.session);
      cb(0, res);
    });
};

ShConnect.prototype.register = function (email, password, cb) {
  var self = this;
  this.call("reg.create", {email: email, password: password},
    function (err, res) {
      if (err) {
        cb(err, res);
        return;
      }
      self.setSession(res[0].data.session);
      cb(0, res);
    });
};

ShConnect.prototype.setSession = function (session) {
  this._session = session;
  this._uid = session.split(":")[1];

  var ts = new Date().getTime();
  this._started = ts;
};

ShConnect.prototype.call = function (cmd, data, cb) {
  var obj = {};
  obj.session = this._session;
  obj.cmd = cmd;
  obj = _.extend(obj, data);
//  console.log("rest", "send", obj);
  this._request.post("/api").send(obj)
    .set("Accept", "application/json")
    .expect(200)
    .end(function (err, res) {
      if (err) {
        cb(err, [{event: "error", message: res}]);
        return;
      }
      cb(0, res.body);
    });
};