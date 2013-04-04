var shlog = require(global.gBaseDir + "/src/shlog.js");

var shRedis = exports;

var redis = require("redis");
client = redis.createClient();

// if you"d like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });

shRedis.on = function (event, cb) {
  client.on(event, cb);
};

shRedis.init = function () {
  shlog.info("db init");
  /*
   client.set("string key", "string val", redis.print);
   client.hset("hash key", "hashtest 1", "some value", redis.print);
   client.hset(["hash key", "hashtest 2", "some other value"], redis.print);
   client.hkeys("hash key", function (err, replies) {
   shlog.info(replies.length + " replies:");
   replies.forEach(function (reply, i) {
   shlog.info("    " + i + ": " + reply);
   });
   });
   */
};

shRedis.get = function (key, cb) {
  shlog.info("get", key);
  client.get(key, cb);
};


shRedis.set = function (key, value, cb) {
  shlog.info("set", key, value);
  client.set(key, value, cb);
};


shRedis.del = function (key, cb) {
  shlog.info("del", key);
  client.del(key, cb);
};

shRedis.incrby = function (key, amount, cb) {
  shlog.info("del", key);
  client.incrby(key, amount, cb);
};

shRedis.quit = function () {
  // gracefull end
  client.quit();
};
