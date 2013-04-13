var _ = require("lodash");
var async = require("async");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var reg = require(global.gBaseDir + "/functions/reg/reg.js");

var user = exports;

user.desc = "utility functions for shelly modules";
user.functions = {
  get: {desc: "get user object", params: {}, security: []},
  set: {desc: "set user object", params: {user: {dtype: "object"}}, security: []},
  profiles: {desc: "get public user infoformation", params: {users : {dtype: "array"}}, security: []},
  find: {desc: "find a user based on email or token", params: {by : {dtype: "string"}, value: {dtype: "string"}}, security: []}
};

user.pre = function (req, res, cb) {
  shlog.info("user.pre");
  // user is always preloaded now in session check

  // SWD - eventually check security session.uid has rights to params.uid
  cb(0);
};

user.post = function (req, res, cb) {
  shlog.info("user.post");
  cb(0);
};

user.get = function (req, res, cb) {
  shlog.info(req.env.user);
  cb(0, sh.event("event.user.get", req.session.user.getData()));
};

user.set = function (req, res, cb) {
  var newUser = req.body.user;

  req.session.user.setData(newUser);

  cb(0, sh.event("event.user.get", req.session.user.getData()));
};

user.profiles = function (req, res, cb) {
  var userIds = req.body.users;
  sh.fillProfiles(req.loader, userIds, function (error, data) {
    if (!error) {
      cb(0, sh.event("event.user.profiles", data));
    } else {
      cb(error, data);
    }
  });
};

user.find = function (req, res, cb) {
  if (req.body.by === "email") {
    reg.findUserByEmail(req.loader, req.body.value, function (err, data) {
      if (err) {
        cb(err, data);
        return;
      }
      cb(0, sh.event("even.user.find", data.getData()));
    });
    return;
  }
  if (req.body.by === "token") {
    cb(1, sh.error("not_implemented", "not yet"));
    return;
  }

  cb(1, sh.error("unknown_find_by", "no way to find a user by this data type", {by: req.body.by}));
};
