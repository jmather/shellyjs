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

shSqlite.popOrPush = function (queueName, minMatches, data, cb) {
  var self = this;
  this.client.serialize(function () {
    self.client.run("BEGIN");
    self.get(queueName, function (err, row) {
      if (row === null) {
        // nothing in queue - set it
        self.set(queueName, JSON.stringify([data]), function (err) {
          console.log("set", queueName, err);
          self.client.run("COMMIT", function (err) {
            cb(0, null);
          });
        });
        return;
      }
      var info = JSON.parse(row);

      // check user already in queue
      console.log(info);
      var me = _.first(info, function (user) {
        return user.uid === data.uid;
      });
      if (me.length !== 0) {
        console.log("user queued already", queueName, data.uid, me);
        self.client.run("COMMIT", function (err) {
          return cb(2, null);
        });
        return;
      }
      // check min matches against current list + me
      if (info.length + 1 < minMatches) {
        info.push(data);
        self.set(queueName, JSON.stringify(info), function (err) {
          console.log("add user to existing queue", queueName, err);
          self.client.run("COMMIT", function (err) {
            cb(0, null);
          });
        });
        return;
      }

      // match made - send list back
      self.del(queueName, function (err) {
        console.log("clear queue", queueName, err);
        self.client.run("COMMIT", function (err) {
          cb(0, info);
        });
      });
    });
  });
}

shSqlite.close = function (cb) {
  this.client.close(cb);
};
