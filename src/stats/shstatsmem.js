var _ = require("lodash");

var shstats = exports;

if (_.isUndefined(global.stats)) {
  global.stats = {};
}

function verifyDomainKey(domain, key) {
  if (_.isUndefined(global.stats[domain])) {
    global.stats[domain] = {};
  }
  if (_.isString(key) && _.isUndefined(global.stats[domain][key])) {
    global.stats[domain][key] = 0;
  }
}

shstats.incr = function (domain, key, amount) {
  if (_.isUndefined(amount)) {
    amount = 1;
  }
  verifyDomainKey(domain, key);
  global.stats[domain][key] += amount;
};

shstats.decr = function (domain, key, amount) {
  if (_.isUndefined(amount)) {
    amount = 1;
  }
  verifyDomainKey(domain, key);
  global.stats[domain][key] -= amount;
};

shstats.stamp = function (domain, key, ts) {
  verifyDomainKey(domain, key);
  if (_.isUndefined(ts)) {
    global.stats[domain][key] = new Date().getTime();
  } else {
    global.stats[domain][key] = ts;
  }
};

shstats.get = function (domain, key, cb) {
  this.incr("stats", "numCalls");

  if (!_.isString(domain)) {
    return cb(0, global.stats);
  }
  if (_.isString(domain) && _.isString(key)) {
    verifyDomainKey(domain, key);
    return cb(0, global.stats[domain][key]);
  }
  return cb(0, {});
};