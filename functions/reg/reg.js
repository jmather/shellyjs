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
  shlog.info(email);
  try {
    check(email, 102).isEmail();
  } catch (e) {
    cb(e.message);
    return;
  }

  gDb.kget("kEmailMap", email, function (error, value) {
    if (value === null) {
      cb(1, sh.error("email_notfound", "email is not registered", {email: email}));
      return;
    }
    out = JSON.parse(value);

    // check password
    if (checkPassword(out.uid, password, out.password)) {
      out.session = session.create(out.uid);
      out.check = session.check(out.session);
      cb(0, out);
      return;
    }
    cb(1, sh.error("password_bad", "incorrect password", {email: email}));
  });
};

exports.logout = function (req, res, cb) {
  cb(null, {"reg.logout": "foo foo foo"});
};

exports.anonymous = function (req, res, cb) {
  var out = {};

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
      cb(0, sh.event("reg.anonymous", JSON.parse(value)));
      return;
    }
    global.db.nextId("user", function (error, value) {
      if (error) {
        cb(1, sh.error("user_id", "unable to generate user id"));
        return;
      }
      // create the user
      out.uid = value;
      out.session = session.create(out.uid);
      out.token = token;
      var ts = new Date().getTime();
      out.created = ts;
      out.lastModified = ts;
      gDb.kset("kTokenMap", token, JSON.stringify(out));
      cb(0, sh.event("reg.anonymous", out));
    });
  });
};

exports.create = function (req, res, cb) {
  var out = {};

  var email = sanitize(req.params.email).trim();
  var password = sanitize(req.params.password).trim();
  try {
    check(email, "invalid email").isEmail();
    check(password, "invalid password").len(6);
  } catch (e) {
    cb(1, sh.error("params_bad", "email or password is not valid", {info: e.message}));
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
      out.uid = value;
      out.session = session.create(out.uid);
      out.email = email;
      out.password = hashPassword(out.uid, password);
      var ts = new Date().getTime();
      out.created = ts;
      out.lastModified = ts;
      gDb.kset("kEmailMap", email, JSON.stringify(out));
      cb(0, out);
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