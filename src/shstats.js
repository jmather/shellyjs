var gStats = require(global.gBaseDir + "/src/stats/shstatsmem.js");

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
  try {
    gStats.get(domain, key, cb);
  } catch (e) {
    cb(1);
  }
};