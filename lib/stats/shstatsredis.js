var _ = require("lodash");
var sh = require(global.C.BASEDIR + "/lib/shutil.js");

var shstatsredis = exports;

var gDb = require(global.C.BASEDIR + "/lib/db/shredis.js");


function makeKey(domain, key) {
  return domain + ":" + key;
}

shstatsredis.init = function (options, cb) {
  gDb.init(options, cb);
};

shstatsredis.reg = function (domain, key) {
  gDb.sadd("stats", makeKey(domain, key), function (err, data) {
    // ignore;
  });
};

shstatsredis.list = function (cb) {
  gDb.smembers("stats", cb);
};

shstatsredis.set = function (domain, key, amount) {
  if (_.isUndefined(amount)) {
    amount = 1;
  }
  gDb.set(makeKey(domain, key), amount, function (err, data) {
//    console.log(err, data);
  });
};

shstatsredis.incr = function (domain, key, amount) {
  if (_.isUndefined(amount)) {
    amount = 1;
  }
  gDb.incrby(makeKey(domain, key), amount, function (err, data) {
//    console.log(err, data);
  });
};

shstatsredis.decr = function (domain, key, amount) {
  if (_.isUndefined(amount)) {
    amount = 1;
  }
  gDb.decrby(makeKey(domain, key), amount, function (err, data) {
//    console.log(err, data);
  });
};

shstatsredis.stamp = function (domain, key, ts) {
  if (_.isUndefined(ts)) {
    ts = new Date().getTime();
  }
  gDb.set(makeKey(domain, key), ts, function (err, data) {
//    console.log(err, data);
  });
};

shstatsredis.get = function (domain, key, cb) {
  console.log("here");
  if (!_.isString(domain) || !_.isString(key)) {
    return cb(1, sh.intMsg("params-bad", "domain or key need to be strings"));
  }
  gDb.get(makeKey(domain, key), cb);
};