var _ = require("lodash");
var async = require("async");
var shlog = require(global.C.BASEDIR + "/lib/shlog.js");

var shSqlite = exports;

var sqlite3 = require("sqlite3");

shSqlite.init = function (options, cb) {
  shlog.info("shsqlite", "sqlite3 init", options);
  this.options = options;

  var _this = this;
  async.waterfall([
    function (cb1) {
      _this.client = new sqlite3.cached.Database(_this.options.filename, cb1);
    },
    function (cb1) {
      var sql = "CREATE TABLE IF NOT EXISTS store (key TEXT PRIMARY KEY, value TEXT)";
      _this.client.run(sql, cb1);
    },
    function (cb1) {
      var sql = "CREATE TABLE IF NOT EXISTS sstore (skey TEXT, value TEXT, PRIMARY KEY (skey, value))";
      _this.client.run(sql, cb1);
    },
    function (cb1) {
      var sql = "CREATE INDEX IF NOT EXISTS set_idx ON sstore (skey)";
      _this.client.run(sql, cb1);
    },
    function (cb1) {
      var sql = "CREATE TABLE IF NOT EXISTS hstore (hkey TEXT, field TEXT, value TEXT, PRIMARY KEY (hkey, field))";
      _this.client.run(sql, cb1);
    },
    function (cb1) {
      var sql = "CREATE INDEX IF NOT EXISTS hash_idx ON hstore (hkey)";
      _this.client.run(sql, cb1);
    },
    function (cb1) {
      var sql = "CREATE TABLE IF NOT EXISTS stats (key TEXT PRIMARY KEY, value INTEGER)";
      _this.client.run(sql, cb1);
    },
  ], cb);
};

shSqlite.close = function (cb) {
  this.client.close(cb);
};

shSqlite.lock = function (key, cb) {
  shlog.info("shsqlite", "lock", key);
  // SWD: no locks for now
//  global.db.set(lkey, "foo", "NX", "EX", 5], cb);
  // must be !error and data != null
  cb(0, 1);
};

shSqlite.unlock = function (key, cb) {
  shlog.info("shsqlite", "unlock", key);
//  global.db.driver.del(key, cb);
  cb(0);
};

shSqlite.get = function (key, cb) {
  shlog.info("shsqlite", "get", key);

  this.client.get("SELECT value FROM store WHERE key = ?", key, function (err, row) {
    cb(err, row ? row.value : null);
  });
};

shSqlite.set = function (key, value, cb) {
  shlog.info("shsqlite", "set", key, value);

  this.client.run("REPLACE INTO store VALUES (?, ?)", key, value, cb);
};


shSqlite.del = function (key, cb) {
  shlog.info("shsqlite", "del", key);

  this.client.run("DELETE FROM store WHERE key = ?", key, cb);
};

shSqlite.incrby = function (key, amount, cb) {
  shlog.info("shsqlite", "incrby", key, amount);

  var self = this;
  this.client.run("UPDATE store SET value = value + ? WHERE key = ?", amount, key, function (err) {
    console.log(err);
    if (err) {
      self.client.run("INSERT INTO store VALUES (?, ?)", key, amount, cb);
      return;
    }
    cb(err);
  });
};

shSqlite.decrby = function (key, amount, cb) {
  shlog.info("shsqlite", "decrby", key);

  var self = this;
  this.client.run("UPDATE store SET value = CAST(value AS INTEGER) - ? WHERE key = ?", amount, key, function (err) {
    if (err) {
      self.client.run("INSERT INTO store VALUES (?, ?)", key, amount, cb);
      return;
    }
    cb(err);
  });
};


// sets
shSqlite.sadd = function (key, value, cb) {
  this.client.run("REPLACE INTO sstore VALUES (?, ?)", key, value, cb);
};

shSqlite.srem = function (key, value, cb) {
  this.client.run("DELETE FROM sstore WHERE skey = ? AND value = ?", key, value, cb);
};

shSqlite.spop = function (key, cb) {
  var self = this;
  this.client.serialize(function () {
    self.client.run("BEGIN");
    self.client.get("SELECT value FROM sstore WHERE skey = ? LIMIT 1", key, function (err, row) {
      if (!row) {
        self.client.run("COMMIT", function (err) {
          return cb(0, 0);
        });
        return;
      }
      self.client.run("DELETE FROM sstore WHERE skey = ? AND value = ?", key, row.value, function (err, data) {
        self.client.run("COMMIT", function (err) {
          cb(0, row.value);
        });
      });
    });
  });
};

shSqlite.scard = function (key, cb) {
  this.client.get("SELECT COUNT(value) AS value FROM sstore WHERE skey = ?", key, function (err, row) {
    cb(err, row ? row.value : 0);
  });
};

shSqlite.sismember = function (key, value, cb) {
  this.client.get("SELECT value FROM sstore WHERE skey = ? AND value = ?", key, value, function (err, row) {
    cb(err, row ? 1 : 0);
  });
};

shSqlite.smembers = function (key, cb) {
  this.client.all("SELECT value FROM sstore WHERE skey = ?", key, function (err, rows) {
    var res = [];
    _.each(rows, function (obj) {
      res.push(obj.value);
    });
    cb(err, res);
  });
};

// hashes
shSqlite.hset = function (key, field, value, cb) {
  // redis returns 1 for new field and 0 for existing field
  // SWD - might want to add in txn later for it
  this.client.run("REPLACE INTO hstore VALUES (?, ?, ?)", key, field, value, cb);
};

shSqlite.hdel = function (key, field, cb) {
  this.client.run("DELETE FROM hstore WHERE hkey = ? AND field = ?", key, field, cb);
};

shSqlite.hgetall = function (key, cb) {
  this.client.all("SELECT field, value FROM hstore WHERE hkey = ?", key, function (err, rows) {
    var res = {};
    _.each(rows, function (obj) {
      res[obj.field] = obj.value;
    });
    cb(err, res);
  });
};