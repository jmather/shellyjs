var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var shcluster = require(global.gBaseDir + "/src/shcluster");

var cluster = exports;

cluster.desc = "cluster information, statistics, and settings";
cluster.functions = {
  servers: {desc: "get all servers in cluster", params: {}, security: ["admin"]},
  locate: {desc: "locate a user in the cluster", params: {uid: {dtype: "string"}}, security: ["admin"]},
  sendUser: {desc: "send a message to any user", params: {uid: {dtype: "string"}, data: {dtype: "object"}}, security: ["admin"]},
  home: {desc: "hash any string to get a home cluster server", params: {oid: {dtype: "string"}}, security: []}
};

cluster.servers = function (req, res, cb) {
  shlog.info("cluster.servers");

  shcluster.servers(function (err, serverList) {
    if (err) {
      res.add(sh.error("cluster_servers", "unable to get server list", serverList));
      return cb(1);
    }
    res.add(sh.event("cluster.servers", serverList));
    return cb(0);
  });
};

cluster.locate = function (req, res, cb) {
  shlog.info("cluster.locate");

  shcluster.locate(req.body.uid, function (err, locate) {
    if (err) {
      res.add(sh.error("cluster_locate", "unable to get user location", {uid: req.body.uid, error: err, info: locate}));
      return cb(1);
    }
    res.add(sh.event("cluster.location", locate.getData()));
    return cb(0);
  });
};

cluster.sendUser = function (req, res, cb) {
  shlog.info("cluster.send");

  shcluster.sendUser(req.body.uid, req.body.data, function (err, data) {
    if (err) {
      res.add(sh.error("cluster_send", "unable to send data", data));
      return cb(err);
    }
    res.add(sh.event("cluster.send", data));
    return cb(0);
  });
};

cluster.home = function (req, res, cb) {
  shlog.info("cluster.home");

  shcluster.home(req.body.oid, function (err, data) {
    if (err) {
      res.add(sh.error("cluster_home", "unable to locate a server for this oid", data));
      return cb(err);
    }
    res.add(sh.event("cluster.home", data));
    return cb(0);
  });
};