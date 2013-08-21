var async = require("async");
var _ = require("lodash");
var gStats = require(global.C.BASEDIR + global.C.STATS_WRAPPER);
var _w = require(global.C.BASEDIR + "/lib/shcb.js")._w;

var shstats = exports;

var gStatTracker = {};

function regStat(domain, key) {
  if (_.isUndefined(gStatTracker[domain + ":" + key])) {
    gStatTracker[domain + ":" + key] = {domain: domain, key: key};
    gStats.reg(domain, key);
  }
}

shstats.incr = function (domain, key, amount) {
  regStat(domain, key);
  return gStats.incr(domain, key, amount);
};

shstats.decr = function (domain, key, amount) {
  regStat(domain, key);
  return gStats.decr(domain, key, amount);
};

shstats.stamp = function (domain, key, ts) {
  regStat(domain, key);
  return gStats.stamp(domain, key, ts);
};

shstats.get = function (domain, key, cb) {
  gStats.get(domain, key, _w(cb, function (err, data) {
    if (err) {
      return cb(err, data);
    }
    cb(0, data);
  }));
};

shstats.reset = function (domain, key, cb) {
  gStats.set(domain, key, 0, _w(cb, function (err, data) {
    cb(0, 0);
  }));
};

shstats.getDomain = function (domain, cb) {
  gStats.list(function (err, statsKeys) {
    if (err) {
      return cb(err, statsKeys);
    }
    var stats = {};
    stats[domain] = {};
    async.each(statsKeys, function (key, lcb) {
      var parts = key.split(":");
      if (parts[0] === domain) {
        gStats.get(parts[0], parts[1], _w(lcb, function (err, data) {
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
  });
};

shstats.getAll = function (cb) {
  gStats.list(function (err, statsKeys) {
    if (err) {
      return cb(err, statsKeys);
    }
    var stats = {};
    async.each(statsKeys, function (key, lcb) {
      var parts = key.split(":");
      gStats.get(parts[0], parts[1], _w(lcb, function (err, data) {
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
  });
};

shstats.resetAll = function (cb) {
  gStats.list(_w(cb, function (err, statsKeys) {
    if (err) {
      return cb(err, statsKeys);
    }
    var stats = {};
    async.each(statsKeys, function (key, lcb) {
      var parts = key.split(":");
      gStats.set(parts[0], parts[1], 0);
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