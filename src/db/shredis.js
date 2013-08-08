var _ = require("lodash");
var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var _w = require(global.gBaseDir + "/src/shcb.js")._w;


var shRedis = exports;

var redis = require("redis");
var gClient = null;

// if you"d like to select database 3, instead of 0 (default), call
// gClient.select(3, function() { /* ... */ });

shRedis.on = function (event, cb) {
  gClient.on(event, cb);
};

shRedis.init = function (options, cb) {
  shlog.info("db init");
  try {
    gClient = redis.createClient();
    shRedis.driver = gClient;
    gClient.on("ready", function () {
      shlog.info("db ready");
      return cb(0);
    });
  } catch (e) {
    return cb(1, sh.intMsg("init-failed", e.message));
  }
};

shRedis.get = function (key, cb) {
  shlog.info("get", key);
  gClient.get(key, cb);
};


shRedis.set = function (key, value, cb) {
  shlog.info("set", key, value);
  gClient.set(key, value, _w(cb, function (err, data) {
    if (err) {
      return cb(1, sh.intMsg("redis-set", data));
    }
    return cb(0, data);
  }));
};

shRedis.seta = function (args, cb) {
  shlog.info("set", args);
  gClient.set(args, _w(cb, function (err, data) {
    if (err) {
      return cb(1, sh.intMsg("redis-set", data));
    }
    return cb(0, data);
  }));
};

shRedis.del = function (key, cb) {
  shlog.info("del", key);
  gClient.del(key, cb);
};

shRedis.incr = function (key, amount, cb) {
  shlog.info("incr", key);
  gClient.incrby(key, amount, cb);
};

shRedis.decr = function (key, amount, cb) {
  shlog.info("decr", key);
  gClient.incrby(key, amount, cb);
};

shRedis.sadd = function (key, value, cb) {
  shlog.info("sadd", key);
  gClient.sadd(key, value, cb);
};

shRedis.srem = function (key, value, cb) {
  shlog.info("srem", key, value);
  gClient.srem(key, value, cb);
};

shRedis.scard = function (key, cb) {
  shlog.info("scard", key);
  gClient.scard(key, cb);
};

shRedis.spop = function (key, cb) {
  shlog.info("spop", key);
  gClient.spop(key, cb);
};

shRedis.sismember = function (key, value, cb) {
  shlog.info("sismembers", key, value);
  gClient.sismember(key, value, cb);
};

shRedis.smembers = function (key, cb) {
  shlog.info("smembers", key);
  gClient.smembers(key, cb);
};

shRedis.hset = function (key, field, value, cb) {
  shlog.info("hset", key, field, value);
  gClient.hset(key, field, value, cb);
};

shRedis.hdel = function (key, field, cb) {
  shlog.info("hdel", key, field);
  gClient.hdel(key, field, cb);
};

shRedis.hgetall = function (key, cb) {
  shlog.info("hgetall", key);
  gClient.hgetall(key, cb);
};

shRedis.dequeue = function (queueName, uid, cb) {
  gClient.watch(queueName);
  gClient.get(queueName, function (err, row) {
    if (row === null) {
      // nothing to dequeue
      return cb(0);
    }
    var infoOld = JSON.parse(row);
    var infoNew = _.filter(infoOld, function (item) {
      return item.uid !== uid;
    });
    if (infoOld.length === infoNew.length) {
      // nothing to dequeue
      return cb(0);
    }
    var multi = gClient.multi();
    multi.set(queueName, JSON.stringify(infoNew));
    multi.exec(function (err, replies) {
      shlog.info("dequeue - save", queueName, err, replies);
      if (replies === null) {
        // must try again
        return cb(3);
      }
      return cb(0);
    });
  });
};

shRedis.popOrPush = function (queueName, minMatches, data, cb) {
  gClient.watch(queueName);
  gClient.get(queueName, function (err, row) {
    var multi = gClient.multi();
    if (row === null) {
      // nothing in queue - set it
      multi.set(queueName, JSON.stringify([data]));
      multi.exec(function (err, replies) {
        if (replies === null) {
          shlog.error("no set - object modified", queueName, err, replies);
          return cb(3, null);
        }
        shlog.info("popOrPush empty - set", queueName, err, replies);
        return cb(0, null);
      });
      return;
    }
    var info = JSON.parse(row);

    // check user already in queue
    var found = _.first(info, function (item) {
      return item.uid === data.uid;
    });
    if (found.length !== 0) {
      shlog.info("user queued already", queueName, data.uid, found);
      // SWD do we need to unwatch?
      multi.discard();
      return cb(2, null);
    }
    // check min matches against current list + me
    if (info.length + 1 < minMatches) {
      info.push(data);
      multi.set(queueName, JSON.stringify(info));
      multi.exec(function (err, replies) {
        if (replies === null) {
          shlog.error("no add - object modified", queueName, err, replies);
          return cb(3, null);
        }
        shlog.info("add user to existing queue", queueName, err, replies);
        cb(0, null);
      });
      return;
    }

    // match made - send list back
    multi.del(queueName);
    multi.exec(function (err, replies) {
      if (replies === null) {
        shlog.error("no del - object modified", queueName, err, replies);
        return cb(3, null);
      }
      shlog.info("clear queue", queueName, err, replies);
      cb(0, info);
    });
  });
};

shRedis.close = function (cb) {
  gClient.quit(cb);
};
