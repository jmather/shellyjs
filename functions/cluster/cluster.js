var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");
var shcluster = require(global.gBaseDir + "/src/shcluster");

var cluster = exports;

cluster.desc = "cluster information, statistics, and settings";
cluster.functions = {
  servers: {desc: "get all server in cluster", params: {}, security: ["admin"]}
};

cluster.servers = function (req, res, cb) {
  shlog.info("cluster.servers");

  var data = {
  };

  shcluster.servers(function (err, data) {
    if (err) {
      res.add(sh.error("cluster_servers", "unable to servers", err, data));
      return cb(1);
    }
    res.add(sh.event("cluster.servers", data));
    return cb(0);
  });
};