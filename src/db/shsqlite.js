var _ = require("lodash");
var async = require("async");
var shlog = require(global.gBaseDir + "/src/shlog.js");

var shSqlite = exports;

var sqlite3 = require("sqlite3");

shSqlite.init = function (options, cb) {
  shlog.info("sqlite3 init", options);
  this.options = options;

  var _this = this;
  async.waterfall([
    function (cb1) {
      _this.client = new sqlite3.cached.Database(_this.options.filename, cb1);
    },
    function (cb1) {
      var sql = "CREATE TABLE IF NOT EXISTS store (key TEXT PRIMARY KEY,value TEXT)";
      _this.client.run(sql, cb1);
    }
  ], cb);
};

shSqlite.get = function (key, cb) {
  shlog.info("get", key);

  this.client.get("SELECT value FROM store WHERE key = ?", key, function (err, row) {
    cb(err, row ? row.value : null);
  });
};


shSqlite.set = function (key, value, cb) {
  shlog.info("set", key, value);

  this.client.run("REPLACE INTO store VALUES (?,?)", key, value, cb);
};


shSqlite.del = function (key, cb) {
  shlog.info("del", key);

  this.client.run("DELETE FROM store WHERE key = ?", key, cb);
};

shSqlite.close = function (cb) {
  this.client.close(cb);
};
