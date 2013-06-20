var fs = require("fs");
var url = require("url");
var cluster = require("cluster");
var _ = require("lodash");
var async = require("async");
var uuid = require("node-uuid");
var dnode = require("dnode");

var shutil = require(__dirname + "/shutil.js");
var shlog = require(__dirname + "/shlog.js");
var ShLoader = require(global.gBaseDir + "/src/shloader.js");

if (_.isUndefined(global.gServerStats)) {
  global.gServerStats = {};
}

var ShCluster = exports;

var gDb = require(global.gBaseDir + "/src/shdb.js");
var gLoader = new ShLoader(gDb);
var gDriver = gDb.driver;
var gServer = null;

ShCluster.init = function (cb) {
  var self = this;
  gDb.init(function (err) {
    gLoader.get("kServer", global.server.serverId, function (err, server) {
      server.set("clusterUrl", global.CONF.clusterUrl);
      server.set("socketUrl", global.CONF.socketUrl);
      shlog.info("set server info", server.getData());

      gDriver.sadd("serverList", global.server.serverId, function (err) {
        gLoader.dump();
        if (err) {
          return cb(err, "unable to save to server list");
        }

        // start dnode
        gServer = dnode({
          event : function (msg, cb) {
            shlog.debug("server event recv: %j", msg);

            if (msg.cmd === "channel.count") {
              var ret = {};
              ret[msg.channel] = self.getStat(msg.channel);
              cb(ret);
              return;
            }

            // cmd = direct.user
            // toWid = workerId
            // toWsid = websocket id of user
            // data = object to forward to user socket
            if (_.isUndefined(msg.cmd)) {
              shlog.error("server event: bad command %j", msg);
              return;
            }
            if (_.isUndefined(msg.toWsid)) {
              shlog.error("server event: socket id %j", msg);
              return;
            }
            if (_.isUndefined(msg.toWid) || _.isUndefined(cluster.workers[msg.toWid])) {
              shlog.error("server event: bad worker id %j", msg);
              return;
            }
            cluster.workers[msg.toWid].send(msg);
            cb("ok");
          }
        });
        var urlParts = url.parse(global.CONF.clusterUrl);
        shlog.info("starting cluster server on:", urlParts.hostname, urlParts.port);
        gServer.listen(urlParts.port, urlParts.hostName);

        return cb(0, null);
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
      gDriver.srem("serverList", global.server.serverId, cb);
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

ShCluster.setStat = function (key, wid, value) {
  if (_.isUndefined(global.gServerStats[key])) {
    global.gServerStats[key] = {};
  }
  global.gServerStats[key][wid] = value;
  shlog.info("server stats: %s:%s = %s", key, wid, value);
};

ShCluster.getStat = function (key) {
  var ret = 0;
  _.each(global.gServerStats[key], function (value, wid) {
    ret += value;
  });
  return ret;
};

ShCluster.servers = function (cb) {
  var serverList = [];
  gDriver.smembers("serverList", function (err, servers) {
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

ShCluster.sendServer = function (serverId, data, cb) {
  gLoader.exists("kServer", serverId, function (err, server) {
    if (err) {
      shlog.error("bad_serverId", "cannot find cluster id", serverId);
      return cb(1, "bad_serverId");
    }
    var urlParts = url.parse(server.get("clusterUrl"));
    shlog.debug("send:", serverId, urlParts.hostname, urlParts.port, data);
    var d = dnode.connect(urlParts.port, urlParts.hostname);
    d.on('remote', function (remote) {
      remote.event(data, function (data) {
        shlog.debug("response: %j", data);
        d.end();
        cb(0, data);
      });
    });
  }, {checkCache: false});
};

ShCluster.sendServers = function (data, cb) {
  var ret = {};
  var self = this;
  var serverList = [];
  gDriver.smembers("serverList", function (err, servers) {
    if (err) {
      return cb(err, servers)
    }
    async.each(servers, function (serverId, lcb) {
      self.sendServer(serverId, data, function (err, data) {
        if (!err) {
          ret[serverId] = data;
        }
        lcb(0); // ingore any errors
      });
    }, function (error) {
      // ingore any errors
      cb(0, ret);
    });
  });
};

ShCluster.sendUser = function (uid, data, cb) {
  var self = this;
  gLoader.exists("kLocate", uid, function (err, locateInfo) {
    if (err) {
      shlog.error("user_offline", "user is offline", uid);
      return cb(1, "user_offline");
    }
    self.sendUserWithLocate(locateInfo, cb);
  }, {checkCache: false});
};

ShCluster.sendUserWithLocate = function (locateInfo, data, cb) {
  var msg = {};
  msg.cmd = "user.direct";
  msg.serverId = locateInfo.get("serverId");
  msg.toWid = locateInfo.get("workerId");
  msg.toWsid = locateInfo.get("socketId");
  msg.data = data;
  shlog.debug("send remote:", msg);
  this.sendServer(msg.serverId, msg, cb);
};

ShCluster.home = function (oid, cb) {
  var self = this;
  gDriver.smembers("serverList", function (err, servers) {
    shlog.debug("smembers err: %s, data: %j", err, servers);
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
      shlog.info("get home server oid: %s, idx: %s", oid, idx);
      shlog.debug("get home server data: %j", server.getData());
      return cb(0, server.getData());
    }, {checkCache: false});
  });
};
