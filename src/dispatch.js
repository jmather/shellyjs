var cluster = require("cluster");
var url = require("url");
var _ = require("lodash");
var async = require("async");
var dnode = require("dnode");

var shutil = require(__dirname + "/shutil.js");
var shlog = require(__dirname + "/shlog.js");
var shcluster = require(__dirname + "/shcluster.js");
var ShLoader = require(global.gBaseDir + "/src/shloader.js");
var socket = require(global.gBaseDir + "/src/socket.js");
var channel = require(global.gBaseDir + "/functions/channel/channel.js");
var _w = require(global.gBaseDir + "/src/shcb.js")._w;

// sync ok - only done on cluster startup

var dispatch = exports;
var gLoader = null;

dispatch.init = function (cb) {
  // use global db for now
  gLoader = new ShLoader();
  return cb(0);
};

dispatch.shutdown = function (cb) {
  async.series([
    function (lcb) {
      shlog.info("dumping loader");
      gLoader.dump(lcb);
    }
  ],
    function (err, results) {
      shlog.info("dispatch shutdown done.");
      cb(0);
    });
};

dispatch.sendUser = function (uid, data, cb) {
  shcluster.locate(uid, _w(cb, function (err, locateInfo) {
    if (err) {
      return cb(err, "user is not online: " + uid);
    }
    var l = locateInfo.getData();
    if (l.serverId === global.server.serverId) {
      // user is on this server
      if (l.workerId === cluster.worker.id) {
        shlog.info("sendUser - local socket:", l.socketId);
        socket.sendDirect(l.socketId, data);
        return cb(0, locateInfo);
      }
      shlog.info("sendUser - local cluster workerId:", l.workerId, "socketId:", l.socketId);
      process.send({cmd: "user.direct", wid: cluster.worker.id, toWid: l.workerId, toWsid: l.socketId, data: data});
      return cb(0, locateInfo);
    }

    // user is on different server
    shlog.info("sendUser - remote server:", l.serverId, "workerId:", l.workerId, "socketId:", l.socketId);
    shcluster.sendUserWithLocate(locateInfo, data, _w(cb, function (err, data) {
      // SWD ignore the error for now
      return cb(0, locateInfo);
    }));
  }));
};

dispatch.sendUsers = function (uids, data, excludeIds, cb) {
  if (_.isString(excludeIds)) {
    excludeIds = [excludeIds];
  }
  if (_.isUndefined(excludeIds) || excludeIds === null) {
    excludeIds = [];
  }
  shlog.info("sendUsers:", uids, excludeIds);

  var locateList = {};
  async.each(uids, function (uid, lcb) {
    if (_.contains(excludeIds, uid)) {
      return lcb();
    }
    dispatch.sendUser(uid, data, _w(lcb, function (err, locateInfo) {
      if (err) {
        shlog.info("bad user send", err, locateInfo);
        return lcb();
      }
      locateList[uid] = locateInfo.getData();
      return lcb();
    }));
  }, function (error) {
    if (_.isFunction(cb)) {
      if (error) {
        return cb(1, error);
      }
      return cb(0, locateList);
    }
  });
};

dispatch.sendServer = function (serverId, data, cb) {
  // SWD check for serverId === current server
  shcluster.sendServer(serverId, data, cb);
};

dispatch.sendServers = function (data, cb) {
  // SWD check for serverId === current server
  shcluster.sendServers(data, cb);
};
