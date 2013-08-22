var async = require("async");
var _ = require("lodash");
var _w = require(global.C.BASEDIR + "/lib/shcb.js")._w;

var gStatsDb = null;

var shstats = exports;

var gStatTracker = {};

function regStat(domain, key) {
  if (_.isUndefined(gStatTracker[domain + ":" + key])) {
    gStatTracker[domain + ":" + key] = {domain: domain, key: key};
    gStatsDb.sadd("stats", domain + ":" + key, function (err, data) {
    });
  }
}

shstats.init = function (cb) {
  // using default db for now;
  if (_.isString(global.C.STATS_WRAPPER)) {
    var ShDb = require(global.C.STATS_WRAPPER);
    gStatsDb = new ShDb();
    gStatsDb.init(global.C.STATS_OPTIONS, cb);
  } else {
    // when using global.db init is in shcluster already
    gStatsDb = global.db;
    cb(0);
  }
};

shstats.shutdown = function (cb) {
  if (_.isString(global.C.STATS_WRAPPER)) {
    gStatsDb.close(cb);
  } else {
    // when using global.db close is in shcluster already
    cb(0);
  }
};

shstats.incr = function (domain, key, amount) {
  regStat(domain, key);
  if (_.isUndefined(amount)) {
    amount = 1;
  }
  gStatsDb.incrby(domain + ":" + key, amount, function (err, data) {
    // don't wait
  });
};

shstats.decr = function (domain, key, amount) {
  regStat(domain, key);
  if (_.isUndefined(amount)) {
    amount = 1;
  }
  gStatsDb.decrby(domain + ":" + key, amount, function (err, data) {
    // don't wait;
  });
};

shstats.stamp = function (domain, key, ts) {
  regStat(domain, key);
  return gStatsDb.stamp(domain + ":" + key, ts, function (err, data) {
    // don't wait
  });
};

shstats.get = function (domain, key, cb) {
  gStatsDb.get(domain + ":" + key, cb);
//  _w(cb, function (err, data) {
//    if (err) {
//      return cb(err, data);
//    }
//    cb(0, data);
//  }));
};

shstats.reset = function (domain, key, cb) {
  gStatsDb.set(domain + ":" + key, 0, _w(cb, function (err, data) {
    cb(0, 0);
  }));
};

shstats.getDomain = function (domain, cb) {
  gStatsDb.smembers("stats", _w(cb, function (err, statsKeys) {
    if (err) {
      return cb(err, statsKeys);
    }
    var stats = {};
    stats[domain] = {};
    async.each(statsKeys, function (key, lcb) {
      var parts = key.split(":");
      if (parts[0] === domain) {
        gStatsDb.get(parts[0] + ":" + parts[1], _w(lcb, function (err, data) {
          if (!err) {
            if (_.isUndefined(stats[parts[0]])) {
              stats[parts[0]] = {};
            }
            stats[parts[0]][parts[1]] = data;
          }
          return lcb(0);
        }));
      } else {
        return lcb(0);
      }
    }, function (err) {
      cb(0, stats);
    });
  }));
};

shstats.getAll = function (cb) {
  gStatsDb.smembers("stats", _w(cb, function (err, statsKeys) {
    if (err) {
      return cb(err, statsKeys);
    }
    var stats = {};
    async.each(statsKeys, function (key, lcb) {
      var parts = key.split(":");
      gStatsDb.get(parts[0] + ":" + parts[1], _w(lcb, function (err, data) {
        if (!err) {
          if (_.isUndefined(stats[parts[0]])) {
            stats[parts[0]] = {};
          }
          stats[parts[0]][parts[1]] = data;
        }
        lcb(0);
      }));
    }, function (err) {
      cb(0, stats);
    });
  }));
};

shstats.resetAll = function (cb) {
  gStatsDb.smembers("stats", _w(cb, function (err, statsKeys) {
    if (err) {
      return cb(err, statsKeys);
    }
    var stats = {};
    async.each(statsKeys, function (key, lcb) {
      var parts = key.split(":");
      gStatsDb.set(parts[0] + ":" + parts[1], 0);
      if (_.isUndefined(stats[parts[0]])) {
        stats[parts[0]] = {};
      }
      stats[parts[0]][parts[1]] = 0;
      lcb(0);
    }, function (err) {
      cb(0, stats);
    });
  }));
};