// shdb - module to provide key value db access
var util = require("util");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");

var gDbScope = "dev:";

var shdb = exports;

var client = require(global.gBaseDir + global.CONF.db.wrapper);

var gKeyTypes = {
  kEmailMap: {tpl: "em:%s"},
  kTokenMap: {tpl: "token:%s"},
  kUser: {tpl: "u:%s"},
  kGame: {tpl: "game:%s"},
  kObject: {tpl: "obj:%s"},
  kPlaying: {tpl: "gp:%s"}
};

shdb.init = function (cb) {
  try {
    shlog.info("db init");
    client.init(global.CONF.db.options, function (err) {
      if (err) {
        shlog.error(err, global.CONF.db.settings);
        cb(err);
      }
      shlog.info("db initilized");
      cb(0);
    });
  } catch (e) {
    cb(1, {message: e.message, stack: e.stack});
    return;
  }

};

shdb.get = function (key, cb) {
  try {
    shlog.info(key, cb);
    client.get(key, cb);
  } catch (e) {
    cb(1, {message: e.message, stack: e.stack});
    return;
  }
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
  try {
    var key = genKey(keyType, params);
    shlog.info("kget: " + gKeyTypes[keyType].tpl + "->" + key);
    client.get(key, function (err, value) {
      cb(err, value);
    });
  } catch (e) {
    cb(1, {message: e.message, stack: e.stack});
    return;
  }
};

shdb.set = function (key, value, cb) {
  try {
    client.set(key, value, function (err, value) {
      if (err) {
        shlog.error("error on set", err, value);
      }
      if (_.isFunction(cb)) {
        cb(err);
      }
    });
  } catch (e) {
    cb(1, {message: e.message, stack: e.stack});
    return;
  }
};

shdb.kset = function (keyType, params, value, cb) {
  // SWD check keyType undefined
  try {
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
  } catch (e) {
    cb(1, {message: e.message, stack: e.stack});
    return;
  }
};

shdb.kdelete = function (keyType, params, cb) {
  // SWD check keyType undefined
  try {
    var key = genKey(keyType, params);
    shlog.info("kdelete: " + gKeyTypes[keyType].tpl + "->" + key);
    client.del(key, function (err) {
      if (err) {
        shlog.error("error on remove", err);
      }
      if (_.isFunction(cb)) {
        cb(err);
      }
    });
  } catch (e) {
    cb(1, {message: e.message, stack: e.stack});
    return;
  }
};

shdb.close = function (cb) {
  try {
    client.close(cb);
  } catch (e) {
    cb(1, {message: e.message, stack: e.stack});
    return;
  }
};
