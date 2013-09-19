var shlog = require(global.C.BASE_DIR + "/lib/shlog.js");
var sh = require(global.C.BASE_DIR + "/lib/shutil.js");
var _w = require(global.C.BASE_DIR + "/lib/shcb.js")._w;

var shlock = exports;

shlock.acquire = function (key, cb) {
  var lkey = "lock:" + key;
  function tryLock(lkey, count, cb) {
    global.db.lock(lkey, _w(cb, function (err, data) {
      if (err) {
        if (count < global.C.DB_LOCK_RETRIES) {
          shlog.info("shlock", "lock retry:", count, lkey, err, data);
          count += 1;
          setTimeout(function () { tryLock(lkey, count, cb); }, global.C.DB_LOCK_SLEEP);
          return;
        }
        shlog.error("shlock", "lock failed:", lkey, err, data);
        return cb(1, sh.intMsg("lock-failed", {error: err, data: data}));
      }
      shlog.info("shlock", "lock aquired:", lkey, err, data);
      return cb(0);
    }));
  }

  tryLock(lkey, 0, cb);
};

shlock.release = function (key, cb) {
  var lkey = "lock:" + key;
  global.db.unlock(lkey, _w(cb, function (err, data) {
    shlog.info("shlock", "lock released:", lkey, err, data);
    return cb(err, data);
  }));
};
