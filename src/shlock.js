var shlog = require(global.gBaseDir + "/src/shlog.js");

var shlock = exports;

shlock.acquire = function (key, cb) {
  var lkey = "lock:" + key;
  function tryLock(lkey, count, cb) {
    global.db.driver.set([lkey, "foo", "NX", "EX", 5], function (err, data) {
      if (err || data === null) {
        if (count < 3) {
          shlog.info("lock retry:", lkey, err, data);
          count += 1;
          setTimeout(function () { tryLock(lkey, count, cb); }, 1500);
          return;
        }
        shlog.info("lock failed:", lkey, err, data);
        return cb(err, data);
      }
      shlog.info("lock aquired:", lkey);
      return cb(0);
    });
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
