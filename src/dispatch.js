var cluster = require("cluster");
var url = require("url");
var _ = require("lodash");
var async = require("async");
var dnode = require("dnode");

var shutil = require(__dirname + "/shutil.js");
var shlog = require(__dirname + "/shlog.js");
var shcluster = require(__dirname + "/shcluster.js");
var ShLoader = require(global.gBaseDir + "/src/shloader.js");
var channel = require(global.gBaseDir + "/functions/channel/channel.js");

// sync ok - only done on cluster startup

var dispatch = exports;

var gDb = require(global.gBaseDir + "/src/shdb.js");
var gLoader = null;
var gDriver = null;

dispatch.init = function (cb) {
  gDb.init(function (err) {
    if (err) {
      return cb(err);
    }
    gLoader = new ShLoader(gDb);
    gDriver = gDb.driver;
    return cb(err);
  });
};

dispatch.shutdown = function (cb) {
  async.series([
    function (lcb) {
      shlog.info("dumping loader");
      gLoader.dump(lcb);
    },
    function (lcb) {
      shlog.info("closing db");
      gDb.close(lcb);
    }
  ],
    function (err, results) {
      shlog.info("dispatch shutdown done.");
      cb(0);
    });
};

dispatch.sendUser = function (uid, data, cb) {
  shcluster.locate(uid, function (err, locateInfo) {
    if (err) {
      return cb(err, "user is not online");
    }
    var l = locateInfo.getData();
    if (l.serverId === global.server.serverId) {
      // user is on this server
      if (l.workerId === cluster.worker.id) {
        shlog.info("sendUser - local socket:", l.socketId);
        channel.sendDirect(l.socketId, data);
        return cb(0);
      }
      shlog.info("sendUser - local cluster workerId:", l.workerId, "socketId:", l.socketId);
      process.send({cmd: "user.direct", wid: cluster.worker.id, toWid: l.workerId, toWsid: l.socketId, data: data});
      return cb(0);
    }

    // user is on different server
    shlog.info("sendUser - remote server:", l.serverId, "workerId:", l.workerId, "socketId:", l.socketId);
    shcluster.sendUserWithLocate(locateInfo, data, cb);
  });
};

dispatch.sendUsers = function (ids, data, excludeIds) {
  shlog.info("sendUsers:", ids, excludeIds);
  if (_.isString(excludeIds)) {
    excludeIds = [excludeIds];
  }
  if (_.isUndefined(excludeIds)) {
    excludeIds = [];
  }

  _.each(ids, function (id) {
    if (!_.contains(excludeIds, id)) {
      dispatch.sendUser(id, data, function (err, data) {
        // ignore for now
      });
    }
  });
};

dispatch.sendChannel = function (channel, data, cb) {
  return cb(0);
};

dispatch.sendServer = function (serverId, data, cb) {
  // SWD check for serverId === current server
  shcluster.sendServer(serverId, data, cb);
};

dispatch.sendServers = function (data, cb) {
  // SWD check for serverId === current server
  shcluster.sendServers(data, cb);
};
