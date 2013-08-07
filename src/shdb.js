var fs = require("fs");
var util = require("util");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var shdb = exports;

var client = require(global.gBaseDir + global.C.DB_WRAPPER);
shdb.driver = client.driver;

shdb.init = function (cb) {
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
    return cb(1, sh.intMsg("init-failed", e.message));
  }
};

shdb.get = function (key, cb) {
  try {
    shlog.info("get: ", key);
    client.get(key, cb);
  } catch (e) {
    return cb(1, sh.intMsg("get-failed", e.message));
  }
};

// SWD - maybe change to setA for array
shdb.set = function (key, value, cb) {
  if (_.isArray(key)) {
    client.set(key, value);  // value must be cb;
    return;
  }
  client.set([key, value], cb);
};

shdb.delete = function (key, cb) {
  try {
    shlog.info("kdelete: " + key);
    client.del(key, function (err) {
      if (err) {
        shlog.error("error on delete:", err);
      }
      if (_.isFunction(cb)) {
        cb(0);
      }
    });
  } catch (e) {
    return cb(1, sh.intMsg("delete-failed", e.message));
  }
};

shdb.incr = function (key, amount, cb) {
  shlog.info("incr:", key, amount);
  try {
    client.incr(key, amount, cb);
  } catch (e) {
    return cb(1, sh.intMsg("incr-failed", e.message));
  }
};

shdb.decr = function (key, amount, cb) {
  shlog.info("decr:", key, amount);
  try {
    client.decr(key, amount, cb);
  } catch (e) {
    return cb(1, sh.intMsg("decr-failed", e.message));
  }
};

shdb.sadd = function (key, value, cb) {
  shlog.info("sadd", key);
  try {
    client.sadd(key, value, cb);
  } catch (e) {
    return cb(1, sh.intMsg("sadd-failed", e.message));
  }
};

shdb.srem = function (key, value, cb) {
  shlog.info("srem", key, value);
  try {
    client.srem(key, value, cb);
  } catch (e) {
    return cb(1, sh.intMsg("srem-failed", e.message));
  }
};

shdb.scard = function (key, cb) {
  shlog.info("scard", key);
  try {
    client.scard(key, cb);
  } catch (e) {
    return cb(1, sh.intMsg("scard-failed", e.message));
  }
};

shdb.spop = function (key, cb) {
  shlog.info("spop");
  try {
    client.spop(key, cb);
  } catch (e) {
    return cb(1, sh.intMsg("spop-failed", e.message));
  }
};

shdb.sismember = function (key, value, cb) {
  shlog.info("sismember", key, value);
  try {
    client.sismember(key, value, cb);
  } catch (e) {
    return cb(1, sh.intMsg("sismember-failed", e.message));
  }
};

shdb.smembers = function (key, cb) {
  shlog.info("smembers", key);
  try {
    client.smembers(key, cb);
  } catch (e) {
    return cb(1, sh.intMsg("smembers-failed", e.message));
  }
};

shdb.hset = function (key, field, value, cb) {
  shlog.info("hset", key);
  try {
    client.hset(key, field, value, cb);
  } catch (e) {
    return cb(1, sh.intMsg("hset-failed", e.message));
  }
};

shdb.hdel = function (key, field, cb) {
  shlog.info("hdel", key);
  try {
    client.hdel(key, field, cb);
  } catch (e) {
    return cb(1, sh.intMsg("hdel-failed", e.message));
  }
};

shdb.hgetall = function (key, cb) {
  shlog.info("hgetall", key);
  try {
    client.hgetall(key, cb);
  } catch (e) {
    return cb(1, sh.intMsg("hgetall-failed", e.message));
  }
};

shdb.dequeue = function (queueName, uid, cb) {
  shlog.info("dequeue:", queueName, uid);
  try {
    client.dequeue(queueName, uid, function (err, rdata) {
      if (err === 3) { // retry 1
        shlog.error("dequeue: txn failed, retry 1", queueName);
        client.dequeue(queueName, uid, function (err, rdata) {
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
    return cb(1, sh.intMsg("dequeue-failed", e.message));
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
    return cb(1, sh.intMsg("popOrPush-failed", e.message));
  }
};

shdb.close = function (cb) {
  try {
    client.close(cb);
  } catch (e) {
    return cb(1, sh.intMsg("close-failed", e.message));
  }
};
