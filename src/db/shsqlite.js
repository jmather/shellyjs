var _ = require("lodash");
var async = require("async");
var shlog = require(global.gBaseDir + "/src/shlog.js");

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
    }
  ], cb);
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

shSqlite.decr = function (key, amount, cb) {
  shlog.info("shsqlite", "decr", key);

  var self = this;
  this.client.run("UPDATE store SET value = value - ? WHERE key = ?", amount, key, function (err) {
    if (err) {
      self.client.run("INSERT INTO store VALUES (?, ?)", key, amount, cb);
      return;
    }
    cb(err);
  });
};

shSqlite.incr = function (key, amount, cb) {
  shlog.info("shsqlite", "incr", key);

  var self = this;
  this.client.run("UPDATE store SET value = value + ? WHERE key = ?", amount, key, function (err) {
    if (err) {
      self.client.run("INSERT INTO store VALUES (?, ?)", key, amount, cb);
      return;
    }
    cb(err);
  });
};

shSqlite.dequeue = function (queueName, uid, cb) {
  var self = this;
  this.client.serialize(function () {
    self.client.run("BEGIN");
    self.get(queueName, function (err, row) {
      if (row === null) {
        // nothing to dequeue
        self.client.run("COMMIT", function (err) {
          return cb(0);
        });
        return;
      }
      var infoOld = JSON.parse(row);
      var infoNew = _.filter(infoOld, function (item) {
        return item.uid !== uid;
      });
      if (infoOld.length === infoNew.length) {
        // nothing to dequeue
        self.client.run("COMMIT", function (err) {
          return cb(0);
        });
        return;
      }
      self.set(queueName, JSON.stringify(infoNew), function (err) {
        shlog.info("shsqlite", "set", queueName, err);
        self.client.run("COMMIT", function (err) {
          cb(0);
        });
      });
    });
  });
};

shSqlite.popOrPush = function (queueName, minMatches, data, cb) {
  var self = this;
  this.client.serialize(function () {
    self.client.run("BEGIN");
    self.get(queueName, function (err, row) {
      if (row === null) {
        // nothing in queue - set it
        self.set(queueName, JSON.stringify([data]), function (err) {
          shlog.info("shsqlite", "set", queueName, err);
          self.client.run("COMMIT", function (err) {
            cb(0, null);
          });
        });
        return;
      }
      var info = JSON.parse(row);

      // check user already in queue
      var found = _.first(info, function (item) {
        return item.uid === data.uid;
      });
      if (found.length !== 0) {
        shlog.info("shsqlite", "user queued already", queueName, data.uid, found);
        self.client.run("COMMIT", function (err) {
          return cb(2, null);
        });
        return;
      }
      // check min matches against current list + me
      if (info.length + 1 < minMatches) {
        info.push(data);
        self.set(queueName, JSON.stringify(info), function (err) {
          shlog.info("shsqlite", "add user to existing queue", queueName, err);
          self.client.run("COMMIT", function (err) {
            cb(0, null);
          });
        });
        return;
      }

      // match made - send list back
      self.del(queueName, function (err) {
        shlog.info("shsqlite", "clear queue", queueName, err);
        self.client.run("COMMIT", function (err) {
          cb(0, info);
        });
      });
    });
  });
};

shSqlite.close = function (cb) {
  this.client.close(cb);
};
