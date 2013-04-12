var util = require("util");
var crypto = require("crypto");
var _ = require("lodash");
var check = require("validator").check;
var sanitize = require("validator").sanitize;

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var session = require(global.gBaseDir + "/src/session.js");

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
  downgrade: {desc: "testing only - remove email from user object", params: {userId: {dtype: "string"}}, security: []},
  login: {desc: "user login", params: {
    email: {dtype: "string"},
    password: {dtype: "string"},
    role: {dtype: "string", optional: true}
  }, security: []},
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

function createEmailReg(loader, uid, email, password) {
  var em = loader.create("kEmailMap", email);
  em.set("email", email);
  em.set("uid", uid);
  em.set("password", hashPassword(uid, password));
  return em;
}

// used to create the default admin user
exports.verifyUser = function (loader, email, password, cb) {
  loader.exists("kEmailMap", email, function (error, em) {
    if (error) {
      em = createEmailReg(loader, sh.uuid(), email, password);
    }
    loader.get("kUser", em.get("uid"), function (error, user) {
      if (error) {
        cb(error, user);
        return;
      }
      if (user.get("email").length === 0) {
        user.set("email", email);
        user.set("name", email.split("@")[0]);
        user.set("roles", ["admin"]);
      }
      cb(0, user);
      return;
    });
  });
};

exports.findUserByEmail = function (loader, email, cb) {
  loader.exists("kEmailMap", email, function (error, em) {
    if (error) {
      cb(1, sh.error("no_user_email", "unable to find user with email", {email: email}));
      return;
    }
    loader.exists("kUser", em.get("uid"), function (error, user) {
      if (error) {
        cb(1, sh.error("no_user_uid", "unable to load user for id", {email: email, uid: em.get("uid")}));
        return;
      }
      cb(0, user);
    });
  });
};

exports.login = function (req, res, cb) {
  var out = {};

  var email = sanitize(req.body.email).trim();
  var password = sanitize(req.body.password).trim();
  shlog.info("login attempt:", email);
  try {
    if (email !== global.CONF.DEFAULT_ADMIN_NAME) {
      check(email, 102).isEmail();
    }
  } catch (e) {
    cb(1, sh.error("bad_email", "email is not correct format"));
    return;
  }
  var role = sanitize(req.body.role).trim();

  req.loader.exists("kEmailMap", email, function (error, em) {
    if (error) {
      cb(1, sh.error("email_notfound", "email is not registered", {email: email}));
      return;
    }

    // check password
    if (!checkPassword(em.get("uid"), password, em.get("password"))) {
      cb(1, sh.error("password_bad", "incorrect password", {email: email}));
      return;
    }

    req.loader.get("kUser", em.get("uid"), function (error, user) {
      if (error) {
        cb(error, user);
        return;
      }
      if (role.length && !_.contains(user.get("roles"), role)) {
        cb(1, sh.error("no_role", "user does not have this role: '" + role + "'", {role: role, roles: user.get("roles")}));
        return;
      }

      // push the email into the user object
      if (user.get("email").length === 0) {
        user.set("email", email);
      }

      shlog.info("login success:", email);
      var out = {};
      out.email = email;
      out.session = session.create(em.get("uid"));
      cb(0, sh.event("reg.login", out));
    });
  });
};

exports.logout = function (req, res, cb) {
  cb(null, {"reg.logout": "foo foo foo"});
};

exports.anonymous = function (req, res, cb) {

  //SWD check reg signature

  var token = sanitize(req.body.token).trim();
  try {
    check(token, "token not long enough").len(6);
  } catch (e) {
    cb(1, sh.error("params_bad", "token not valid", {info: e.message}));
    return;
  }

  req.loader.exists("kTokenMap", token, function (error, tm) {
    if (!error) {
      // check if uid has upgraded account
      req.loader.exists("kUser", tm.get("uid"), function (error, user) {
        if (!error && user.get("email").length) {
          cb(1, sh.error("user_upgraded", "user has upgraded the anonymous account"));
          return;
        }
        var out = {};
        out.uid = tm.get("uid");
        out.session = session.create(tm.get("uid"));
        cb(0, sh.event("reg.anonymous", out));
      });
      return;
    }

    // not there, so create token map
    tm = req.loader.create("kTokenMap", token);
    tm.set("uid", sh.uuid());
    // user will get created on first login if session is valid

    var out = {};
    out.uid = tm.get("uid");
    out.session = session.create(tm.get("uid"));
    cb(0, sh.event("reg.anonymous", out));
  });
};

exports.upgrade = function (req, res, cb) {
  var email = sanitize(req.body.email).trim();
  var password = sanitize(req.body.password).trim();
  try {
    check(email, "invalid email address").isEmail();
    check(password, "password too short").len(6);
  } catch (e) {
    cb(1, sh.error("params_bad", e.message, {info: e.message}));
    return;
  }

  // make sure the email is not already set
  if (req.session.user.get("email").length > 0) {
    cb(1, sh.error("email_set", "email is already set for this user", req.session.user.getData()));
    return;
  }

  // make sure the email is not in use by someone else
  req.loader.exists("kEmailMap", email, function (error, em) {
    if (!error) {
      if (em.get("uid") === req.session.user.get("oid")) {
        // set it just in case something went wrong before
        req.session.user.set("email", email);
        cb(0, sh.event("reg.upgrade", req.session.user.getData()));
      }
      cb(1, sh.error("email_in_use", "email is already used by another user"));
      return;
    }
    // set the email for the user
    req.session.user.set("email", email);
    // create the email map
    createEmailReg(req.loader, req.session.uid, email, password);
    cb(0, sh.event("reg.upgrade", req.session.user.getData()));
  });
};

// SWD for testing only
exports.downgrade = function (req, res, cb) {
  var userId = req.body.userId;
  req.loader.get("kUser", userId, function (err, user) {
    if (user !== null) {
      req.loader.delete("kEmailMap", user.get("email"), function (err, data) {
        if (err) {
          cb(err, sh.error("delete_error", "unable to delete email map", data));
          return;
        }
        user.set("email", "");
        cb(0, sh.event("reg.downgrade", {status: "ok"}));
      });
    } else {
      cb(1, sh.error("no_user", "unable to load user", {userId: userId}));
    }
  });
};

exports.create = function (req, res, cb) {
  var email = sanitize(req.body.email).trim();
  var password = sanitize(req.body.password).trim();
  try {
    check(email, "invalid email address").isEmail();
    check(password, "password too short").len(6);
  } catch (e) {
    cb(1, sh.error("params_bad", e.message, {info: e.message}));
    return;
  }

  req.loader.exists("kEmailMap", email, function (error, em) {
    if (!error) {
      cb(1, sh.error("email_used", "this email is already registered", {email: email}));
      return;
    }
    // create the user
    var em = createEmailReg(req.loader, sh.uuid(), email, password);
    var out = {};
    out.uid = em.get("uid");
    out.session = session.create(em.get("uid"));
    cb(0, sh.event("reg.create", out));
  });
};