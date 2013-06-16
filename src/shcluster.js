var fs = require("fs");
var cluster = require("cluster");
var _ = require("lodash");
var async = require("async");
var uuid = require("node-uuid");
var dnode = require("dnode");

var shutil = require(__dirname + "/shutil.js");
var shlog = require(__dirname + "/shlog.js");
//var shdb = require(__dirname + "/shdb.js");
var ShLoader = require(global.gBaseDir + "/src/shloader.js");

// sync ok - only done on cluster startup

var ShCluster = exports;

var db = require(global.gBaseDir + "/src/shdb.js");
var gLoader = new ShLoader(db);
var driver = global.db.driver;
var gServer = null;

ShCluster.init = function (cb) {
  var clusterInfoFn = global.configBase + "/cluster.json";
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
    gLoader.get("kServer", global.cluster.clusterId, function (err, server) {
      server.set("ip", "localhost");
      server.set("port", global.CONF.clusterPort);
      shlog.info("set server info", server.getData());

      driver.sadd("serverList", global.cluster.clusterId, function (err) {
        gLoader.dump();
        if (err) {
          return cb(err, clusterInfo);
        }

        // start dnode
        gServer = dnode({
          event : function (msg, cb) {
            console.log("cluster event recv", msg);
            // cmd = direct.user
            // toWid = workerId
            // toWsid = websocket id of user
            // data = object to forward to user socket
            cluster.workers[msg.toWid].send(msg);
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

ShCluster.sendCluster = function (clusterId, data, cb) {
  gLoader.get("kServer", clusterId, function (err, server) {
    if (err) {
      shlog.error("bad_clusterid", "cannot find cluster id", clusterId);
      return cb(1, "bad_clusterId");
    }
    shlog.info("send:", clusterId, data);
    var d = dnode.connect(server.get("port"));
    d.on('remote', function (remote) {
      remote.event(data, function (s) {
        console.log('response => ' + s);
        d.end();
        cb(0, s);
      });
    });
  }, {checkCache: false});
};

ShCluster.sendUser = function (uid, data, cb) {
  var self = this;
  gLoader.get("kLocate", uid, function (err, locate) {
    if (err) {
      shlog.error("user_offline", "user is offline", uid);
      return cb(1, "user_offline");
    }
    var msg = {};
    msg.cmd = "user.direct";
    msg.clusterId = locate.get("clusterId");
    msg.toWid = locate.get("workerId");
    msg.toWsid = locate.get("socketId");
    msg.data = data;
    shlog.info("send remote:", msg);
    self.sendCluster(msg.clusterId, msg, cb);
  }, {checkCache: false});
};

ShCluster.shutdown = function () {
  async.series([
    function (cb) {
      shlog.info("stopping cluster server");
      gServer.end();
      cb(0);
    },
    function (cb) {
      shlog.info("delete server from serverList");
      driver.srem("serverList", global.cluster.clusterId, cb);
    },
    function (cb) {
      shlog.info("delete kServer object");
      gLoader.delete("kServer", global.cluster.clusterId, cb);
    },
    function (cb) {
      shlog.info("dumping loader");
      gLoader.dump(cb);
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
        gLoader.get("kServer", item, function (err, server) {
          serverList[item] = server.getData();
          lcb(0);
        }, {checkCache: false});
      },
      function (err) {
        if (err) {
          return cb(err, null);
        }
        cb(0, serverList);
      });
  });
};


ShCluster.locate = function (uid, cb) {
  gLoader.exists("kLocate", uid, function (err, locateInfo) {
    cb(err, locateInfo);
  }, {checkCache: false});
};
