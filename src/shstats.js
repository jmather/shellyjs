var gStats = require(global.gBaseDir + global.C.STATS_WRAPPER);

var shstats = exports;

shstats.incr = function (domain, key, amount) {
  return gStats.incr(domain, key, amount);
};

shstats.decr = function (domain, key, amount) {
  return gStats.decr(domain, key, amount);
};

shstats.stamp = function (domain, key, ts) {
  return gStats.stamp(domain, key, ts);
};

shstats.get = function (domain, key, cb) {
  gStats.incr("stats", "numGets");

  try {
    gStats.get(domain, key, function (err, data) {
      var stats = {};
      stats[domain] = {};
      stats[domain][key] = data;
      cb(err, stats);
    });
  } catch (e) {
    cb(1);
  }
};