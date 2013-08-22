var shlog = require(global.C.BASEDIR + "/lib/shlog.js");
var sh = require(global.C.BASEDIR + "/lib/shutil.js");
var _w = require(global.C.BASEDIR + "/lib/shcb.js")._w;

var shlock = exports;

shlock.acquire = function (key, cb) {
  var lkey = "lock:" + key;
  function tryLock(lkey, count, cb) {
    global.db.lock(lkey, _w(cb, function (err, data) {
      if (err || data === null) {
        if (count < 3) {
          shlog.info("shlock", "lock retry:", lkey, err, data);
          count += 1;
          setTimeout(function () { tryLock(lkey, count, cb); }, 1000);
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
