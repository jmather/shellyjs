var _ = require("lodash");
var async = require("async");
var shlog = require(global.C.BASEDIR + "/lib/shlog.js");

//var shSqlite = exports;
function shSqlite() {
  this.client = null;
}

module.exports = shSqlite;

var sqlite3 = require("sqlite3");

shSqlite.prototype.init = function (options, cb) {
  shlog.info("shsqlite", "sqlite3 init", options);
  this.options = options;

  var self = this;
  async.waterfall([
    function (cb1) {
      self.client = new sqlite3.cached.Database(self.options.filename, cb1);
    },
    function (cb1) {
      var sql = "CREATE TABLE IF NOT EXISTS store (key TEXT PRIMARY KEY, value TEXT)";
      self.client.run(sql, cb1);
    },
    function (cb1) {
      var sql = "CREATE TABLE IF NOT EXISTS sstore (skey TEXT, value TEXT, PRIMARY KEY (skey, value))";
      self.client.run(sql, cb1);
    },
    function (cb1) {
      var sql = "CREATE INDEX IF NOT EXISTS set_idx ON sstore (skey)";
      self.client.run(sql, cb1);
    },
    function (cb1) {
      var sql = "CREATE TABLE IF NOT EXISTS hstore (hkey TEXT, field TEXT, value TEXT, PRIMARY KEY (hkey, field))";
      self.client.run(sql, cb1);
    },
    function (cb1) {
      var sql = "CREATE INDEX IF NOT EXISTS hash_idx ON hstore (hkey)";
      self.client.run(sql, cb1);
    },
    function (cb1) {
      var sql = "CREATE TABLE IF NOT EXISTS locks (key TEXT PRIMARY KEY, value INTEGER)";
      self.client.run(sql, cb1);
    }
  ], function (err, data) {
    return cb(err ? 1 : 0, data);
  });
};

shSqlite.prototype.close = function (cb) {
  this.client.close(cb);
};

shSqlite.prototype.lock = function (key, cb) {
  shlog.info("shsqlite", "lock", key);
  var value = new Date().getTime();
  var self = this;
  this.client.run("INSERT INTO locks VALUES (?, ?)", key, value, function (err, row) {
    if (err) {
      // try and delete any locks > 5s old, and let the retry work next time
      self.client.run("DELETE FROM locks WHERE value < ?", value - 5000, function (err) {
        return cb(err, row);
      });
    }
    return cb(err, row);
  });
};

shSqlite.prototype.unlock = function (key, cb) {
  shlog.info("shsqlite", "unlock", key);
  this.client.run("DELETE FROM locks WHERE key = ?", key, cb);
};

shSqlite.prototype.get = function (key, cb) {
  shlog.info("shsqlite", "get", key);

  this.client.get("SELECT value FROM store WHERE key = ?", key, function (err, row) {
    cb(err ? 1 : 0, row ? row.value : null);
  });
};

shSqlite.prototype.set = function (key, value, cb) {
  shlog.info("shsqlite", "set", key, value);

  this.client.run("REPLACE INTO store VALUES (?, ?)", key, value, function (err, row) {
    cb(err ? 1 : 0, err ? err.toString() : "ok");
  });
};


shSqlite.prototype.del = function (key, cb) {
  shlog.info("shsqlite", "del", key);

  this.client.run("DELETE FROM store WHERE key = ?", key, function (err, row) {
    cb(err ? 1 : 0, err ? err.toString() : 0);
  });
};

shSqlite.prototype.incrby = function (key, amount, cb) {
  shlog.info("shsqlite", "incrby", key, amount);

  var self = this;
  this.client.run("UPDATE store SET value = value + ? WHERE key = ?", amount, key, function (err, data) {
    if (err || this.changes === 0) {
      self.client.run("INSERT INTO store VALUES (?, ?)", key, amount, function (err, data) {
        cb(err ? 1 : 0, amount);
      });
      return;
    }
    self.get(key, function (err, data) {
      if (!err) {
        data = parseInt(data, 10);
      }
      cb(err, data);
    });
  });
};

shSqlite.prototype.decrby = function (key, amount, cb) {
  shlog.info("shsqlite", "decrby", key);

  var self = this;
  this.client.run("UPDATE store SET value = value - ? WHERE key = ?", amount, key, function (err) {
    if (err || this.changes === 0) {
      self.client.run("INSERT INTO store VALUES (?, ?)", key, amount, function (err, row) {
        return cb(err ? 1 : 0, err ? err.toString() : -amount);
      });
      return;
    }
    self.get(key, function (err, data) {
      if (!err) {
        data = parseInt(data, 10);
      }
      cb(err, data);
    });
  });
};

// sets
shSqlite.prototype.sadd = function (key, value, cb) {
  this.client.run("REPLACE INTO sstore VALUES (?, ?)", key, value, function (err, row) {
    return cb(err ? 1 : 0, err ? err.toString() : this.changes);
  });
};

shSqlite.prototype.srem = function (key, value, cb) {
  this.client.run("DELETE FROM sstore WHERE skey = ? AND value = ?", key, value, function (err, row) {
    return cb(err ? 1 : 0, err ? err.toString() : this.changes);
  });
};

shSqlite.prototype.spop = function (key, cb) {
  var self = this;
  this.client.run("BEGIN", function (err, data) {
    if (err) {
      return cb(1, err.toString());
    }
    self.client.get("SELECT value FROM sstore WHERE skey = ? LIMIT 1", key, function (err, row) {
      if (!row) {
        self.client.run("COMMIT", function (err) {
          return cb(1, null);
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

shSqlite.prototype.scard = function (key, cb) {
  this.client.get("SELECT COUNT(value) AS value FROM sstore WHERE skey = ?", key, function (err, row) {
    cb(err ? 1 : 0, row ? row.value : 0);
  });
};

shSqlite.prototype.sismember = function (key, value, cb) {
  this.client.get("SELECT value FROM sstore WHERE skey = ? AND value = ?", key, value, function (err, row) {
    cb(err ? 1 : 0, row ? 1 : 0);
  });
};

shSqlite.prototype.smembers = function (key, cb) {
  this.client.all("SELECT value FROM sstore WHERE skey = ?", key, function (err, rows) {
    var res = [];
    _.each(rows, function (obj) {
      res.push(obj.value);
    });
    cb(err ? 1 : 0, res);
  });
};

// hashes
shSqlite.prototype.hset = function (key, field, value, cb) {
  this.client.run("REPLACE INTO hstore VALUES (?, ?, ?)", key, field, value, function (err, row) {
    cb(err ? 1 : 0, this.changes); // redis uses 0 for update and 1 for new - sqlite always sends back changes=1
  });
};

shSqlite.prototype.hdel = function (key, field, cb) {
  this.client.run("DELETE FROM hstore WHERE hkey = ? AND field = ?", key, field, function (err, row) {
    cb(err ? 1 : 0, row ? 1 : 0);
  });
};

shSqlite.prototype.hgetall = function (key, cb) {
  this.client.all("SELECT field, value FROM hstore WHERE hkey = ?", key, function (err, rows) {
    var res = {};
    _.each(rows, function (obj) {
      res[obj.field] = obj.value;
    });
    cb(err ? 1 : 0, res);
  });
};