var util = require("util");
var crypto = require("crypto");
var check = require("validator").check;
var sanitize = require("validator").sanitize;

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var session = require(global.gBaseDir + "/src/session.js");

var gDb = global.db;

var passwordSecret = "94d634f9-c273-4d59-9b28-bc26185d656f";
var passwordVersion = 1;

exports.desc = "handles user login/logout and new user registration";
exports.functions = {
  create: {desc: "register a user", params: {email: {dtype: "string"}, password: {dtype: "string"}}, security: []},
  anonymous: {desc: "register an anonymous user", params: {token: {dtype: "string"}}, security: []},
  upgrade: {desc: "upgrade a user id from anonymous to registered", params: {
    email: {dtype: "string"},
    password: {dtype: "string"}
  }, security: []},
  downgrade: {desc: "testing only - remove email from user object", params: {}, security: []},
  check: {desc: "check if user exists", params: {email: {dtype: "string"}}, security: []},
  login: {desc: "user login", params: {email: {dtype: "string"}, password: {dtype: "string"}}, security: []},
  logout: {desc: "user logout", params: {}, security: []}
};

function hashPassword(uid, password) {
  var secStr = util.format("uid=%s;pw=%s;secret=%s", uid, password, passwordSecret);
  return passwordVersion + ":" + crypto.createHash("md5").update(secStr).digest("hex");
}

function checkPassword(uid, password, hash) {
  var newHash = hashPassword(uid, password);
  return newHash === hash;
}

exports.login = function (req, res, cb) {
  var out = {};

  var email = sanitize(req.params.email).trim();
  var password = sanitize(req.params.password).trim();
  shlog.info("login attempt:", email);
  try {
    check(email, 102).isEmail();
  } catch (e) {
    cb(1, sh.error("bad_email", "email is not correct format"));
    return;
  }

  gDb.kget("kEmailMap", email, function (error, value) {
    if (value === null) {
      cb(1, sh.error("email_notfound", "email is not registered", {email: email}));
      return;
    }
    var emailMap = JSON.parse(value);
    emailMap.uid = emailMap.uid.toString();  // SWD some old data that has numbers

    // check password
    if (checkPassword(emailMap.uid, password, emailMap.password)) {
      shlog.info("login success:", email);
      var out = {};
      out.email = email;
      out.session = session.create(emailMap.uid);
      // push email into user object
      sh.userEmail(emailMap.uid, email);
      cb(0, sh.event("reg.login", out));
      return;
    }
    cb(1, sh.error("password_bad", "incorrect password", {email: email}));
  });
};

exports.logout = function (req, res, cb) {
  cb(null, {"reg.logout": "foo foo foo"});
};

exports.anonymous = function (req, res, cb) {

  //SWD check reg signature

  var token = sanitize(req.params.token).trim();
  try {
    check(token, "token not long enough").len(6);
  } catch (e) {
    cb(1, sh.error("params_bad", "token not valid", {info: e.message}));
    return;
  }

  gDb.kget("kTokenMap", token, function (error, value) {
    if (value !== null) {
      // SWD protect the json parse
      var tokenMap = JSON.parse(value);
      var out = {};
      out.uid = tokenMap.uid;
      out.session = session.create(tokenMap.uid);
      // check if uid has upgraded account
      sh.getUser(tokenMap.uid, function (error, user) {
        if (user !== null && user.get("email").length) {
          cb(1, sh.error("user_upgraded", "user has upgraded the anonymous account"));
          return;
        }
        cb(0, sh.event("reg.anonymous", out));
        return;
      });
      return;
    }
    global.db.nextId("user", function (error, value) {
      if (error) {
        cb(1, sh.error("user_id", "unable to generate user id"));
        return;
      }
      // create the user
      var tokenMap = {};
      tokenMap.uid = value;
      tokenMap.token = token;
      tokenMap.created = new Date().getTime();
      gDb.kset("kTokenMap", token, JSON.stringify(tokenMap));
      var out = {};
      out.uid = tokenMap.uid;
      out.session = session.create(tokenMap.uid);
      cb(0, sh.event("reg.anonymous", out));
    });
  });
};

exports.upgrade = function (req, res, cb) {
  var email = sanitize(req.params.email).trim();
  var password = sanitize(req.params.password).trim();
  try {
    check(email, "invalid email address").isEmail();
    check(password, "password too short").len(6);
  } catch (e) {
    cb(1, sh.error("params_bad", e.message, {info: e.message}));
    return;
  }

  // make sure the email is not already set
  var userRaw = req.session.user.getData();
  if (userRaw.email.length > 0) {
    cb(1, sh.error("email_set", "email is already set for this user", {uid: userRaw.uid, email: userRaw.email}));
    return;
  }

  // make sure the email is not in use by someone else
  var emailMap = {};
  gDb.kget("kEmailMap", email, function (error, value) {
    if (value !== null) {
      emailMap = JSON.parse(value);
      if (emailMap.uid === userRaw.uid) {
        // just set it as something must have gone wrong before
        // SWD - still need to work out user dirty/save
        req.session.user.set("email", email);
        cb(0, sh.event("reg.upgrade", userRaw));
      }
      cb(1, sh.error("email_in_use", "email is already used by another user", {uid: userRaw.uid, email: email}));
      return;
    }
    // create the email map
    req.session.user.set("email", email);
    emailMap.uid = userRaw.uid;
    emailMap.email = email;
    emailMap.password = hashPassword(emailMap.uid, password);
    emailMap.created = new Date().getTime();
    gDb.kset("kEmailMap", email, JSON.stringify(emailMap));
    cb(0, sh.event("reg.upgrade", userRaw));
  });
};

// SWD for testing only
exports.downgrade = function (req, res, cb) {
  gDb.kdelete("kEmailMap", req.session.user.get("email"));
  req.session.user.set("email", "");
  cb(0, sh.event("reg.downgrade", {status: "ok"}));
};

exports.create = function (req, res, cb) {
  var email = sanitize(req.params.email).trim();
  var password = sanitize(req.params.password).trim();
  try {
    check(email, "invalid email address").isEmail();
    check(password, "password too short").len(6);
  } catch (e) {
    cb(1, sh.error("params_bad", e.message, {info: e.message}));
    return;
  }

  gDb.kget("kEmailMap", email, function (error, value) {
    if (value !== null) {
      cb(1, sh.error("email_used", "this email is already registered", {email: email}));
      return;
    }
    global.db.nextId("user", function (error, value) {
      if (error) {
        cb(1, sh.error("user_id", "unable to generate user id"));
        return;
      }
      // create the user
      var emailMap = {};
      emailMap.uid = value;
      emailMap.email = email;
      emailMap.password = hashPassword(emailMap.uid, password);
      emailMap.created = new Date().getTime();
      gDb.kset("kEmailMap", email, JSON.stringify(emailMap));
      var out = {};
      out.uid = emailMap.uid;
      out.session = session.create(emailMap.uid);
      cb(0, sh.event("reg.create", out));
    });
  });
};

exports.check = function (req, res, cb) {
  var email = sanitize(req.params.email).trim();
  try {
    check(email, 102).isEmail();
  } catch (e) {
    cb(e.message);
    return;
  }

  gDb.kget("kEmailMap", email, function (error, value) {
    if (value !== null) {
      cb(0, JSON.parse(value));
      return;
    }
    cb(1, sh.error("unregistered", "this email is not registered", {email: email}));
  });
};