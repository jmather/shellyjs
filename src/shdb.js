// shdb - module to provide key value db access
var util = require("util");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");

var gDbScope = "dev:";

var shdb = exports;

var client = require(global.gBaseDir + global.CONF.db.wrapper);

var gKeyTypes = {
  kObject: {tpl: "obj:%s", file: "/src/shobject.js"},
  kEmailMap: {tpl: "em:%s", file: "/src/do/shemailmap.js"},
  kTokenMap: {tpl: "tm:%s", file: "/src/do/shtokenmap.js"},
  kUser: {tpl: "u:%s", file: "/src/shuser.js"},
  kGame: {tpl: "game:%s", file: "/src/shgame.js"},
  kPlaying: {tpl: "gp:%s", file: "/src/shplaying.js"},
  kMessageBank: {tpl: "mb:%s", file: "/src/do/shmessagebank.js"}
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

shdb.validKey = function (keyType) {
  return _.isObject(gKeyTypes[keyType]);
}

shdb.key = function (keyType, params) {
  return genKey(keyType, params);
};

shdb.moduleFile = function (keyType) {
  if (!_.isObject(gKeyTypes[keyType])) {
    return null;
  }
  return global.gBaseDir + gKeyTypes[keyType].file;
};

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
        cb(0);
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
