// shdb - module to provide key value db access
var util = require("util");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");

var gDbScope = "dev:";

var shdb = exports;

var client = require(global.gBaseDir + global.CONF.dbWrapper);

// if you"d like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });

client.on("error", function (err) {
  shlog.error("Error " + err);
  // big trouble, just get out
  process.exit(1);
});

var gKeyTypes = {
  kEmailMap: {tpl: "em:%s"},
  kTokenMap: {tpl: "token:%s"},
  kUser: {tpl: "u:%s"},
  kGame: {tpl: "game:%s"},
  kObject: {tpl: "object:%s:%s"},
  kPlaying: {tpl: "gp:%s"}
};

shdb.init = function () {
  shlog.info("db init");
};

shdb.get = function (key, cb) {
  shlog.info(key, cb);
  client.get(key, cb);
};

function genKey(keyType, params) {
  var key = null;
  if (_.isObject(params)) {
    var paramArray = [gKeyTypes[keyType].tpl].concat(params);
    key = gDbScope + util.format.apply(util.format, paramArray);
  } else {
    key = gDbScope + util.format(gKeyTypes[keyType].tpl, params);
  }
  return key;
}

shdb.kget = function (keyType, params, cb) {
  // SWD check keyType undefined

  var key = genKey(keyType, params);
  shlog.info("kget: " + gKeyTypes[keyType].tpl + "->" + key);
  client.get(key, function (err, value) {
    cb(err, value);
  });
};

shdb.set = function (key, value, cb) {
  client.set(key, value, function (err, value) {
    if (err) {
      shlog.error("error on set", err, value);
    }
    if (_.isFunction(cb)) {
      cb(err);
    }
  });
};

shdb.kset = function (keyType, params, value, cb) {
  // SWD check keyType undefined

  var key = genKey(keyType, params);
  shlog.info("kset: " + gKeyTypes[keyType].tpl + "->" + key);
  client.set(key, value, function (err, value) {
    if (err) {
      shlog.error("error on set", err, value);
    }
    if (_.isFunction(cb)) {
      cb(err);
    }
  });
};

shdb.kdelete = function (keyType, params, value, cb) {
  // SWD check keyType undefined

  var key = genKey(keyType, params);
  shlog.info("kremove: " + gKeyTypes[keyType].tpl + "->" + key);
  client.del(key, function (err, value) {
    if (err) {
      shlog.error("error on remove", err, value);
    }
    if (_.isFunction(cb)) {
      cb(err);
    }
  });
};

shdb.nextId = function (keyType, cb) {
  var key = gDbScope + "idgen:" + keyType;
  shlog.info("shdb.nextId: key = " + key);
  client.incrby(key, 1, function (error, data) {
    if (!error) {
      data = data.toString();
    }
    cb(error, data);
  });
};

shdb.quit = function () {
  // gracefull end
  client.quit();
};
