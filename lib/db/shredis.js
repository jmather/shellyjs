var _ = require("lodash");
var shlog = require(global.C.BASEDIR + "/lib/shlog.js");
var sh = require(global.C.BASEDIR + "/lib/shutil.js");
var _w = require(global.C.BASEDIR + "/lib/shcb.js")._w;


function shRedis() {
  this.client = null;
}

module.exports = shRedis;

var redis = require("redis");

var gCmds = ["get", "set", "del", "incrby", "decrby",       // standard key/value
  "sadd", "srem", "spop", "scard", "sismember", "smembers", // sets
  "hset", "hdel", "hgetall"];                               // hashes

shRedis.prototype.init = function (options, cb) {
  shlog.info("shredis", "db init");
  try {
    this.funcUp();
    this.client = redis.createClient();
    this.client.on("ready", function () {
      shlog.info("shredis", "db ready");
      return cb(0);
    });
  } catch (e) {
    return cb(1, sh.intMsg("init-failed", e.message));
  }
};

shRedis.prototype.close = function (cb) {
  this.client.quit(cb);
};

shRedis.prototype.lock = function (key, cb) {
  this.set([key, "foo", "NX", "EX", 5], cb);
};

shRedis.prototype.unlock = function (key, cb) {
  // SWD change this to lua script to check unique token to make sure we are releasing our own lock
  this.del(key, cb);
};

function handleCmd(cmd, args) {
  if (_.isFunction(args[args.length - 1])) {
    var cb = args[args.length - 1];
    args[args.length - 1] = function (err, data) {
      if (err) {
        return cb(1, sh.intMsg("redis-" + cmd, err.toString()));
      }
      return cb(0, data);
    };
  }
  this.client[cmd].apply(this.client, args);
}

function to_array(args) {
  var arr = [];
  var i = 0;
  for (i = 0; i < args.length; i += 1) {
    arr[i] = args[i];
  }
  return arr;
}

// intercepts redis calls and converts callbacks to shelly format
shRedis.prototype.funcUp = function () {
  var self = this;
  _.each(gCmds, function (cmd) {
    self[cmd] = function () {
      var args = to_array(arguments);
      handleCmd.call(self, cmd, args);
    };
  });
};