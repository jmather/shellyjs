var fs = require("fs");
var _ = require("lodash");
var async = require("async");
var uuid = require("node-uuid");
var dnode = require('dnode');

var shutil = require(__dirname + "/shutil.js");
var shlog = require(__dirname + "/shlog.js");
//var shdb = require(__dirname + "/shdb.js");
var ShLoader = require(global.gBaseDir + "/src/shloader.js");

// sync ok - only done on cluster startup

var ShCluster = exports;

var db = require(global.gBaseDir + "/src/shdb.js");
var loader = new ShLoader(db);
var driver = global.db.driver;
var gServer = null;

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
      server.set("ip", "localhost");
      server.set("port", global.CONF.clusterPort);
      shlog.info("set server info", server.getData());

      driver.sadd("serverList", global.cluster.clusterId, function (err) {
        loader.dump();
        if (err) {
          return cb(err, clusterInfo);
        }
        ShCluster.servers(function (err, data) {
          // just a test
        });

        // start dnode
        gServer = dnode({
          transform : function (s, cb) {
            console.log("cluster recv", s);
            cb("ack");
          },
          event : function (s, cb) {
            console.log("cluster event recv", s);
            cb("ack-event");
          }
        });
        shlog.info("starting cluster server on:", global.CONF.clusterPort);
        gServer.listen(global.CONF.clusterPort);

        return cb(0, clusterInfo);
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
      shlog.info("shutdown done.");
      process.exit(0);
    });
};

ShCluster.servers = function (cb) {
  var serverList = {};
  driver.smembers("serverList", function (err, servers) {
    shlog.info("smembers err:", err, "data:", servers);
    if (err) {
      return cb(err, servers);
    }
    async.each(servers,
      function (item, lcb) {
        loader.get("kServer", item, function (err, server) {
          serverList[item] = server.getData();
          lcb(0);
        });
      },
      function (err) {
        if (err) {
          return cb(err, null);
        }
        cb(0, serverList);
      });
  });
};
