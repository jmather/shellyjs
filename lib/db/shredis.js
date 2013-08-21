var _ = require("lodash");
var shlog = require(global.C.BASEDIR + "/lib/shlog.js");
var sh = require(global.C.BASEDIR + "/lib/shutil.js");
var _w = require(global.C.BASEDIR + "/lib/shcb.js")._w;


var shRedis = exports;

var redis = require("redis");
var gClient = null;

var gCmds = ["get", "set", "del", "incrby", "decrby", "sadd", "srem", "spop", "scard", "sismember", "smembers",
  "hset", "hdel", "hgetall"];

shRedis.init = function (options, cb) {
  shlog.info("shredis", "db init");
  try {
    this.funcUp();
    gClient = redis.createClient();
    shRedis.driver = gClient;
    gClient.on("ready", function () {
      shlog.info("shredis", "db ready");
      return cb(0);
    });
  } catch (e) {
    return cb(1, sh.intMsg("init-failed", e.message));
  }
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
  gClient[cmd].apply(gClient, args);
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
shRedis.funcUp = function () {
  var self = this;
  _.each(gCmds, function (cmd) {
    self[cmd] = function () {
      var args = to_array(arguments);
      handleCmd(cmd, args);
    };
  });
};

shRedis.close = function (cb) {
  gClient.quit(cb);
};