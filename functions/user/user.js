var _ = require("lodash");
var async = require("async");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var reg = require(global.gBaseDir + "/functions/reg/reg.js");

var user = exports;

user.desc = "utility functions for shelly modules";
user.functions = {
  get: {desc: "get current user object", params: {}, security: []},
  set: {desc: "set current user object", params: {user: {dtype: "object"}}, security: []},
  aget: {desc: "get any user object", params: {uid: {dtype: "string"}}, security: ["admin"]},
  aset: {desc: "set any user object", params: {uid: {dtype: "string"}, user: {dtype: "object"}}, security: ["admin"]},
  profiles: {desc: "get public user infoformation", params: {users : {dtype: "array"}}, security: []},
  find: {desc: "find a user based on email or token", params: {by : {dtype: "string"}, value: {dtype: "string"}}, security: ["admin"]}
};

user.pre = function (req, res, cb) {
  shlog.info("user.pre");
  cb(0);
};

user.post = function (req, res, cb) {
  shlog.info("user.post");
  cb(0);
};

user.get = function (req, res, cb) {
  cb(0, sh.event("event.user.get", req.session.user.getData()));
}

user.set = function (req, res, cb) {
  var userData = req.body.user

  // only admin can change roles
  if (!_.isUndefined(userData.roles)  && !req.session.user.hasRole("admin")) {
    cb(1, sh.error("no_permision", "user does not have rights to alter roles"));
    return;
  }

  req.session.user.setData(userData);
  cb(0, sh.event("event.user.get", req.session.user.getData()));
}

user.aget = function (req, res, cb) {
  var uid = req.body.uid;

  req.loader.exists("kUser", uid, function (error, user) {
    if (error) {
      cb(error, data);
      return;
    }
    cb(0, sh.event("event.user.get", user.getData()));
    return;
  });
};

user.aset = function (req, res, cb) {
  var uid = req.body.uid;
  var newUser = req.body.user;

  req.loader.exists("kUser", uid, function (error, user) {
    if (error) {
      cb(error, data);
      return;
    }
    console.log("set user data", newUser);
    user.setData(newUser);
    console.log("user data", user.getData());
    cb(0, sh.event("event.user.get", user.getData()));
    return;
  });

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
      cb(0, sh.event("event.user.find", data.getData()));
    });
    return;
  }
  if (req.body.by === "uid") {
    req.loader.exists("kUser", req.body.value, function (err, data) {
      if (err) {
        cb(1, sh.error("no_user", "unable to find user with uid = " + req.body.value));
        return;
      }
      cb(1, sh.event("event.user.find", data.getData()));
    });
    return;
  }
  if (req.body.by === "token") {
    reg.findUserByToken(req.loader, req.body.value, function (err, data) {
      if (err) {
        cb(err, data);
        return;
      }
      cb(0, sh.event("event.user.find", data.getData()));
    });
    return;
  }

  cb(1, sh.error("unknown_find_by", "no way to find a user by this data type = "  + req.body.by, {by: req.body.by}));
};
