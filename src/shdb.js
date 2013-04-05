// shdb - module to provide key value db access
var util = require("util");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");

var gDbScope = "dev:";

var shdb = exports;

//var client = require(global.gBaseDir + global.CONF.dbWrapper);
var ueberDB = require("ueberDB");
//var client = new ueberDB.database("sqlite");
var client = new ueberDB.database(global.CONF.db.name, global.CONF.db.settings);

var gKeyTypes = {
  kEmailMap: {tpl: "em:%s"},
  kTokenMap: {tpl: "token:%s"},
  kUser: {tpl: "u:%s"},
  kGame: {tpl: "game:%s"},
  kObject: {tpl: "object:%s:%s"},
  kPlaying: {tpl: "gp:%s"}
};

shdb.init = function (cb) {
  shlog.info("db init");
  client.init(function (err) {
    if (err) {
      shlog.error(err, global.CONF.db.settings);
      cb(err);
    }
    shlog.info("db initilized");
    cb(0);
  });
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
  client.remove(key, function (err) {
    if (err) {
      shlog.error("error on remove", err);
    }
    if (_.isFunction(cb)) {
      cb(err);
    }
  });
};

shdb.close = function (cb) {
  // graceful end
  client.close(cb);
};
