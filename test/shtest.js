var request = require("supertest");
var should = require("should");
var _ = require("lodash");

var shtest = exports;

request = request("http://localhost:5101");
var gUserSession = "";
var gAdminSession = "";

//var gEmail = "test@lgdales.com";
//var gEmailUpgrade = "testUpgrade@lgdales.com";
//var gPassword = "foofoo";
//var gToken = "00000000-0000-0000-0000-000000000000";

shtest.call = function (data, cb) {
  request.post("/api").send(data)
    .set("Accept", "application/json")
    .expect(200)
    .end(function (err, res) {
      should.not.exist(err);
      res.body = res.body[0];
      cb(err, res);
    });
};

shtest.uid = function (utype) {
  if (utype === "user") {
    return gUserSession.split(":")[1];
  }
  if (utype === "admin") {
    return gAdminSession.split(":")[1];
  }
  return "";
};

shtest.session = function (utype) {
  if (utype === "user") {
    return gUserSession;
  }
  if (utype === "admin") {
    return gAdminSession;
  }
  return "";
};

shtest.init = function (email, password, cb) {
  var self = this;
  this.call({cmd: "reg.login", email: "shelly", password: "shelly"}, function (err, res) {
    if (err) {
      cb(err, res);
      return;
    }
    gAdminSession = res.body.data.session;

    self.call({cmd: "reg.create", email: email, password: password}, function (err, res) {
      // ignore error for already exists and just try login
      self.call({cmd: "reg.login", email: email, password: password}, function (err, res) {
        if (err) {
          cb(err, res);
          return;
        }
        gUserSession = res.body.data.session;
        cb(err, res);
      });
    });
  });
};

shtest.adminCall = function (data, cb) {
  data.session = gAdminSession;
  this.call(data, cb);
};

shtest.userCall = function (data, cb) {
  data.session = gUserSession;
  this.call(data, cb);
};