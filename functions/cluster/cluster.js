var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var shcluster = require(global.gBaseDir + "/src/shcluster");

var cluster = exports;

cluster.desc = "cluster information, statistics, and settings";
cluster.functions = {
  servers: {desc: "get all server in cluster", params: {}, security: ["admin"]},
  locate: {desc: "locate a user in the cluster", params: {uid: {dtype: "string"}}, security: ["admin"]},
};

cluster.servers = function (req, res, cb) {
  shlog.info("cluster.servers");

  shcluster.servers(function (err, data) {
    if (err) {
      res.add(sh.error("cluster_servers", "unable to get server list", err, data));
      return cb(1);
    }
    res.add(sh.event("cluster.servers", data));
    return cb(0);
  });
};

cluster.locate = function (req, res, cb) {
  shlog.info("cluster.locate");

  shcluster.locate(req.body.uid, function (err, locate) {
    if (err) {
      res.add(sh.error("cluster_locate", "unable to get user location", err, locate));
      return cb(1);
    }
    res.add(sh.event("cluster.location", locate.getData()));
    return cb(0);
  });
};