// session - module to provide session key generation and checking
var util = require("util");
var crypto = require("crypto");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");

var session = exports;

var sessionSecret = "e8017600-764f-11e2-bcfd-0800200c9a66";
var sessionFormat = "uid=%s;ts=%s;secret=%s";
var sessionVersion = 1;

session.create = function (uid) {
  shlog.info("session", "session.create");

  var ts = new Date().getTime();

  var secStr = util.format(sessionFormat, uid, ts, sessionSecret);
  var hash = crypto.createHash("md5").update(secStr).digest("hex");

  return sessionVersion + ":" + uid + ":" + hash + ":" + ts;
};

session.check = function (key) {
  shlog.info("session", "session.check key=" + key);
  if (_.isUndefined(key)) {
    return false;
  }
  var keyParts = key.split(":");
  if (keyParts.length !== 4) {
    return false;
  }
  var version = keyParts[0];
  if (version !== "1") {
    return false;
  }
  var uid = keyParts[1];
  var hash = keyParts[2];
  // SWD for testing
  if (hash === "xxxx") {
    return true;
  }
  var ts = keyParts[3];
  var secStr = util.format(sessionFormat, uid, ts, sessionSecret);
  var newHash = crypto.createHash("md5").update(secStr).digest("hex");
  return newHash === hash;
};