var fs = require("fs");
var util = require("util");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");

var gDbScope = "dev:";

var shdb = exports;

var client = require(global.gBaseDir + global.C.DB_WRAPPER);
shdb.driver = client.driver;

var gKeyTypes = {};

function initObjects(cb) {
  shlog.info("object init");

  var modules = {};
  var funcDir = global.gBaseDir + "/src/do";
  fs.readdir(funcDir, function (err, files) {
    var error = 0;
    var fileCount = files.length;
    files.forEach(function (entry) {
      var fn = funcDir + "/" + entry;
      var ObjModule = require(fn);
      var obj = new ObjModule();
      if (!_.isUndefined(obj._keyType) && !_.isUndefined(obj._keyFormat)) {
        gKeyTypes[obj._keyType] = {tpl: obj._keyFormat, file: fn};
        shlog.info("object factory:", obj._keyType, fn);
      } else {
        shlog.info("bad data object missing keyType or keyFormat", fn);
      }
    });
    cb();
  });
}

shdb.getKeys = function () {
  return gKeyTypes;
};

shdb.init = function (cb) {
  initObjects(function () {
    try {
      shlog.info("db init");
      client.init(global.C.DB_OPTIONS, function (err) {
        if (err) {
          shlog.error(err, global.C.db.settings);
          cb(err);
        }
        shlog.info("db initilized");
        cb(0);
      });
    } catch (e) {
      return cb(1, {message: e.message, stack: e.stack});
    }
  });
};

shdb.get = function (key, cb) {
  try {
    shlog.info("get", key);
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
};

shdb.key = function (keyType, params) {
  return genKey(keyType, params);
};

shdb.moduleFile = function (keyType) {
  if (!_.isObject(gKeyTypes[keyType])) {
    return null;
  }
  return gKeyTypes[keyType].file;
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

shdb.incr = function (key, amount, cb) {
  shlog.info("incr:", key, amount);
  try {
    client.incr(key, amount, cb);
  } catch (e) {
    cb(1, {message: e.message, stack: e.stack});
  }
};

shdb.decr = function (key, amount, cb) {
  shlog.info("decr:", key, amount);
  try {
    client.decr(key, amount, cb);
  } catch (e) {
    cb(1, {message: e.message, stack: e.stack});
  }
};

shdb.sadd = function (key, value, cb) {
  shlog.info("sadd", key);
  try {
    client.sadd(key, value, cb);
  } catch (e) {
    cb(1, {message: e.message, stack: e.stack});
  }
};

shdb.srem = function (key, value, cb) {
  shlog.info("srem", key, value);
  try {
    client.srem(key, value, cb);
  } catch (e) {
    cb(1, {message: e.message, stack: e.stack});
  }
};

shdb.spop = function (key, cb) {
  shlog.info("spop");
  try {
    client.spop(key, cb);
  } catch (e) {
    cb(1, {message: e.message, stack: e.stack});
  }
};

shdb.smembers = function (key, cb) {
  shlog.info("smembers", key);
  try {
    client.smembers(key, cb);
  } catch (e) {
    cb(1, {message: e.message, stack: e.stack});
  }
};


shdb.dequeue = function (queueName, uid, cb) {
  shlog.info("dequeue:", queueName, uid);
  try {
    client.dequeue(queueName, uid, function(err, rdata) {
      if (err === 3) { // retry 1
        shlog.error("dequeue: txn failed, retry 1", queueName);
        client.dequeue(queueName, uid, function(err, rdata) {
          if (err === 3) { // retry 2
            shlog.error("dequeue: txn failed, retry 2", queueName);
            client.dequeue(queueName, uid, cb);
            return;
          }
          return cb(err, rdata);
        });
        return;
      }
      return cb(err, rdata);
    });
  } catch (e) {
    cb(1, {message: e.message, stack: e.stack});
  }
};

shdb.popOrPush = function (queueName, minMatches, data, cb) {
  shlog.info("popOrPush:", queueName);
  try {
    client.popOrPush(queueName, minMatches, data, function (err, rdata) {
      if (err === 3) { // retry 1
        shlog.error("popOrPush: txn failed, retry 1", queueName);
        client.popOrPush(queueName, minMatches, data, function (err, rdata) {
          if (err === 3) { // retry 2
            shlog.error("popOrPush: txn failed, retry 2", queueName);
            client.popOrPush(queueName, minMatches, data, cb);
            return;
          }
          return cb(err, rdata);
        });
        return;
      }
      return cb(err, rdata);
    });
  } catch (e) {
    cb(1, {message: e.message, stack: e.stack});
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
