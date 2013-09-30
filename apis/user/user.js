var _ = require("lodash");
var async = require("async");

var shlog = require(global.C.BASE_DIR + "/lib/shlog.js");
var sh = require(global.C.BASE_DIR + "/lib/shutil.js");
var reg = require(global.C.BASE_DIR + "/apis/reg/reg.js");
var _w = require(global.C.BASE_DIR + "/lib/shcb.js")._w;

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

user.get = function (req, res, cb) {
  res.add(sh.event("user.get", req.session.user.getData()));
  return cb(0);
};

user.set = function (req, res, cb) {
  var userData = req.body.user;

  // only admin can change roles
  if (!_.isUndefined(userData.roles)  && !req.session.user.hasRole("admin")) {
    res.add(sh.error("user-roles", "user does not have rights to alter roles"));
    return cb(1);
  }

  req.loader.exists("kUser", req.session.uid, _w(cb, function (err, user) {
    if (err) {
      res.add(sh.errordb(user));
      return cb(1);
    }
    if (user === null) {
      res.add(sh.error("user-bad", "unable to load user", user));
      return cb(1);
    }
    var keyType = user.typeError(userData);
    if (keyType) {
      res.add(sh.error("user-data", "type mismatch in user data", keyType));
      return cb(1);
    }
    user.setData(userData);
    res.add(sh.event("user.set", user.getData()));
    return cb(0);
  }), {lock: true});
};

user.aget = function (req, res, cb) {
  var uid = req.body.uid;

  req.loader.exists("kUser", uid, _w(cb, function (error, user) {
    if (error) {
      res.add(sh.errordb(user));
      return cb(1);
    }
    if (user === null) {
      res.add(sh.error("user-aget", "user does not exist", uid));
      return cb(1);
    }
    res.add(sh.event("user.get", user.getData()));
    return cb(0);
  }));
};

user.aset = function (req, res, cb) {
  var uid = req.body.uid;
  var newUser = req.body.user;

  req.loader.exists("kUser", uid, _w(cb, function (error, user) {
    if (error) {
      res.add(sh.errordb(user));
      return cb(1);
    }
    if (user === null) {
      res.add(sh.error("user-aset", "user does not exist", uid));
      return cb(1);
    }
    user.setData(newUser);
    res.add(sh.event("user.get", user.getData()));
    return cb(0);
  }), {lock: true});
};

user.profiles = function (req, res, cb) {
  var userIds = req.body.users;
  sh.fillProfiles(req.loader, userIds, _w(cb, function (error, data) {
    if (error) {
      res.add(sh.error("profile-fill", "unable to fill in profile data", data));
      return cb(1);
    }
    res.add(sh.event("user.profiles", data));
    return cb(0);
  }));
};

user.find = function (req, res, cb) {
  if (req.body.by === "email") {
    reg.findUserByEmail(req.loader, req.body.value, _w(cb, function (err, data) {
      if (err) {
        res.add(sh.error("user-find-email", "unable to find user with email: '" + req.body.value + "'", data));
        return cb(1);
      }
      res.add(sh.event("user.find", data.getData()));
      return cb(0);
    }));
    return;
  }
  if (req.body.by === "uid") {
    req.loader.exists("kUser", req.body.value, _w(cb, function (err, data) {
      if (err) {
        res.add(sh.errordb(data));
        return cb(1);
      }
      if (data === null) {
        res.add(sh.error("user-find-uid", "unable to find user with uid: '" + req.body.value + "'", data));
        return cb(1);
      }
      res.add(sh.event("user.find", data.getData()));
      return cb(0);
    }));
    return;
  }
  if (req.body.by === "token") {
    reg.findUserByToken(req.loader, req.body.value, _w(cb, function (err, data) {
      if (err) {
        res.add(sh.error("user-find-token", "unable to find user with token: '" + req.body.value + "'", data));
        return cb(1);
      }
      res.add(sh.event("user.find", data.getData()));
      return cb(0);
    }));
    return;
  }

  res.add(sh.error("user-find-unknown", "no way to find a user by this data type", {by: req.body.by}));
  return cb(1);
};
