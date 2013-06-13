var fs = require("fs");
var _ = require("lodash");
var async = require("async");
var uuid = require("node-uuid");

var shutil = require(__dirname + "/shutil.js");
var shlog = require(__dirname + "/shlog.js");
//var shdb = require(__dirname + "/shdb.js");
var ShLoader = require(global.gBaseDir + "/src/shloader.js");

// sync ok - only done on cluster startup

var ShCluster = exports;

var db = require(global.gBaseDir + "/src/shdb.js");
var loader = new ShLoader(db);
var driver = global.db.driver;

ShCluster.init = function (cb) {
  var clusterInfoFn = __dirname + "/../config/cluster.json";
  var clusterInfo = {};
  if (!fs.existsSync(clusterInfoFn)) {
    clusterInfo.clusterId = shutil.uuid();
    fs.writeFile(clusterInfoFn, JSON.stringify(clusterInfo), function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("The file was saved!");
      }
      return cb(err, clusterInfo);
    });
  } else {
    clusterInfo = require(clusterInfoFn);
  }

  global.cluster = clusterInfo;
  shlog.info("cluster id:", global.cluster);

  db.init(function (err) {
    loader.get("kServer", global.cluster.clusterId, function (err, server) {
      console.log(server);
      server.set("clusterId", global.cluster.clusterId);
      server.set("ip", "localhost");
      server.set("port", 5103);

      driver.sadd("serverList", global.cluster.clusterId, function (err) {
        console.log("serverList sadd", err);
        driver.smembers("serverList", function (err, data) {
          console.log("smembers", err, data);
          loader.dump();
          return cb(0, clusterInfo);
        });
      });
    });
  });
};

ShCluster.shutdown = function () {
  async.series([
    function (cb) {
      shlog.info("delete server object");
      driver.srem("serverList", global.cluster.clusterId, cb);
    },
    function (cb) {
      shlog.info("delete server object");
      loader.delete("kServer", global.cluster.clusterId, cb);
    },
    function (cb) {
      shlog.info("dumping loader");
      loader.dump(cb);
    }
  ],
    function (err, results) {
      shlog.info("done.");
      process.exit(0);
    });
};
