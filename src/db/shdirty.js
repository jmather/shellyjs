var _ = require("lodash");
var shlog = require(global.gBaseDir + "/src/shlog.js");

var shDirty = exports;

var dirty = require("dirty");
var client = dirty(global.gBaseDir + "/db/dirty.db");

shDirty.on = function (event, cb) {
  client.on(event, cb);
};

shDirty.init = function () {
  shlog.info("db init");
};

shDirty.get = function (key, cb) {
  shlog.info("get", key);
  var data = client.get(key);
  console.log(data);
  if (_.isUndefined(data)) {
    cb(1, null);
    return;
  }
  cb(0, data);
};


shDirty.set = function (key, value, cb) {
  shlog.info("set", key, value);
  client.set(key, value, function () {
    cb(0);
  });
};


shDirty.del = function (key, cb) {
  shlog.info("del", key);
  client.rm(key, cb);
};

shDirty.incrby = function (key, amount, cb) {
  // SWD: change to hold counters in memory and write out async
  shlog.info("incrby", key);
  var count = client.get(key);
  if (_.isUndefined(count)) {
    count = 0;
  }
  count += amount;
  client.set(key, count, function () {
    cb(0, count);
  });
};

shDirty.quit = function () {
};
