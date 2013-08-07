var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var _w = require(global.gBaseDir + "/src/shcb.js").leanStacks(true)._w;

var shlock = exports;

shlock.acquire = function (key, cb) {
  var lkey = "lock:" + key;
  function tryLock(lkey, count, cb) {
    global.db.set([lkey, "foo", "NX", "EX", 5], _w(cb, function (err, data) {
      if (err || data === null) {
        if (count < 3) {
          shlog.info("lock retry:", lkey, err, data);
          count += 1;
          setTimeout(function () { tryLock(lkey, count, cb); }, 1000);
          return;
        }
        shlog.error("lock failed:", lkey, err, data);
        return cb(1, sh.intMsg("lock-failed", {error: err, data: data}));
      }
      shlog.info("lock aquired:", lkey, err, data);
      return cb(0);
    }));
  }

  tryLock(lkey, 0, cb);
};

shlock.release = function (key, cb) {
  var lkey = "lock:" + key;
  // SWD change this to lua script to check unique token to make sure we are releasing our own lock
  global.db.driver.del(lkey, function (err, data) {
    shlog.info("lock released:", lkey);
    return cb(err, data);
  });
};
