var _ = require("lodash");
var shlog = require(global.gBaseDir + "/src/shlog.js");

var shRedis = exports;

var redis = require("redis");
var client = redis.createClient();

shRedis.driver = client;

// if you"d like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });

shRedis.on = function (event, cb) {
  client.on(event, cb);
};

shRedis.init = function (options, cb) {
  shlog.info("db init");
  cb(0);
};

shRedis.get = function (key, cb) {
  shlog.info("get", key);
  client.get(key, cb);
};


shRedis.set = function (key, value, cb) {
  shlog.info("set", key, value);
  client.set(key, value, cb);
};


shRedis.del = function (key, cb) {
  shlog.info("del", key);
  client.del(key, cb);
};

shRedis.incr = function (key, amount, cb) {
  shlog.info("incr", key);
  client.incrby(key, amount, cb);
};

shRedis.decr = function (key, amount, cb) {
  shlog.info("decr", key);
  client.incrby(key, amount, cb);
};

shRedis.sadd = function (key, value, cb) {
  shlog.info("sadd", key);
  client.sadd(key, value, cb);
};

shRedis.srem = function (key, value, cb) {
  shlog.info("srem", key, value);
  client.srem(key, value, cb);
};

shRedis.spop = function (key, cb) {
  shlog.info("spop", key);
  client.spop(key, cb);
};

shRedis.smembers = function (key, cb) {
  shlog.info("smembers", key);
  client.smembers(key, cb);
};

shRedis.dequeue = function (queueName, uid, cb) {
  client.watch(queueName);
  client.get(queueName, function (err, row) {
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
    var multi = client.multi();
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
  client.watch(queueName);
  client.get(queueName, function (err, row) {
    var multi = client.multi();
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
  client.quit(cb);
};
