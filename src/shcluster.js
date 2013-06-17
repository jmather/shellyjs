var fs = require("fs");
var url = require("url");
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
  var serverInfoFn = global.configBase + "/cluster.json";
  var serverInfo = {};
  if (!fs.existsSync(serverInfoFn)) {
    serverInfo.serverId = shutil.uuid();
    fs.writeFile(serverInfoFn, JSON.stringify(serverInfo), function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("The file was saved!");
      }
      return cb(err, serverInfo);
    });
  } else {
    serverInfo = require(serverInfoFn);
  }

  global.server = serverInfo;
  shlog.info("cluster id:", global.server);

  db.init(function (err) {
    gLoader.get("kServer", global.server.serverId, function (err, server) {
      server.set("clusterUrl", global.CONF.clusterUrl);
      server.set("socketUrl", global.CONF.socketUrl);
      shlog.info("set server info", server.getData());

      driver.sadd("serverList", global.server.serverId, function (err) {
        gLoader.dump();
        if (err) {
          return cb(err, serverInfo);
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
        var urlParts = url.parse(global.CONF.clusterUrl);
        shlog.info("starting cluster server on:", urlParts.hostname, urlParts.port);
        gServer.listen(urlParts.port, urlParts.hostName);

        return cb(0, serverInfo);
      });
    });
  });
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
      driver.srem("serverList", global.server.serverId, cb);
    },
    function (cb) {
      shlog.info("delete kServer object");
      gLoader.delete("kServer", global.server.serverId, cb);
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

ShCluster.sendCluster = function (serverId, data, cb) {
  gLoader.exists("kServer", serverId, function (err, server) {
    if (err) {
      shlog.error("bad_serverId", "cannot find cluster id", serverId);
      return cb(1, "bad_serverId");
    }
    var urlParts = url.parse(server.get("clusterUrl"));
    shlog.info("send:", serverId, urlParts.hostname, urlParts.port, data);
    var d = dnode.connect(urlParts.port, urlParts.hostname);
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
  gLoader.exists("kLocate", uid, function (err, locate) {
    if (err) {
      shlog.error("user_offline", "user is offline", uid);
      return cb(1, "user_offline");
    }
    var msg = {};
    msg.cmd = "user.direct";
    msg.serverId = locate.get("serverId");
    msg.toWid = locate.get("workerId");
    msg.toWsid = locate.get("socketId");
    msg.data = data;
    shlog.info("send remote:", msg);
    self.sendCluster(msg.serverId, msg, cb);
  }, {checkCache: false});
};


ShCluster.home = function (oid, cb) {
  var self = this;
  driver.smembers("serverList", function (err, servers) {
    shlog.info("smembers err:", err, "data:", servers);
    if (err) {
      return cb(err, servers);
    }
    var idx = shutil.modString(oid, servers.length);
    var serverId = servers[idx];
    gLoader.get("kServer", serverId, function (err, server) {
      if (err) {
        shlog.error("bad_serverId", "cannot find cluster id", serverId);
        return cb(1, "bad_serverId");
      }
      shlog.info("server home", oid, idx, server.getData());
      return cb(0, server.getData());
    }, {checkCache: false});
  });
}
