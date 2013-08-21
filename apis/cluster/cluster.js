var _ = require("lodash");

var shlog = require(global.C.BASEDIR + "/lib/shlog.js");
var sh = require(global.C.BASEDIR + "/lib/shutil.js");
var shcluster = require(global.C.BASEDIR + "/lib/shcluster");
var _w = require(global.C.BASEDIR + "/lib/shcb.js")._w;

var cluster = exports;

cluster.desc = "cluster information, statistics, and settings";
cluster.functions = {
  servers: {desc: "get all servers in cluster", params: {}, security: ["admin"]},
  locate: {desc: "locate a user in the cluster", params: {uid: {dtype: "string"}}, security: ["admin"]},
  sendUser: {desc: "send a message to any user", params: {uid: {dtype: "string"}, data: {dtype: "object"}}, security: ["admin"]},
  home: {desc: "hash any string to get a home cluster server", params: {oid: {dtype: "string"}}, security: []}
};

cluster.servers = function (req, res, cb) {
  shlog.info("cluster", "cluster.servers");

  shcluster.servers(_w(cb, function (err, serverList) {
    if (err) {
      res.add(sh.error("servers-get", "unable to get server list", serverList));
      return cb(1);
    }
    res.add(sh.event("cluster.servers", serverList));
    return cb(0);
  }));
};

cluster.locate = function (req, res, cb) {
  shlog.info("cluster", "cluster.locate");

  shcluster.locate(req.body.uid, _w(cb, function (err, locate) {
    if (err) {
      res.add(sh.error("cluster-locate", "unable to get user location", {uid: req.body.uid, error: err, info: locate}));
      return cb(1);
    }
    res.add(sh.event("cluster.location", locate.getData()));
    return cb(0);
  }));
};

cluster.sendUser = function (req, res, cb) {
  shlog.info("cluster", "cluster.send");

  shcluster.sendUser(req.body.uid, req.body.data, _w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("cluster-senduser", "unable to send data to user", data));
      return cb(err);
    }
    res.add(sh.event("cluster.send", data));
    return cb(0);
  }));
};

cluster.home = function (req, res, cb) {
  shlog.info("cluster", "cluster.home");

  shcluster.home(req.body.oid, _w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("cluster-home", "unable to locate a server for this oid", data));
      return cb(err);
    }
    res.add(sh.event("cluster.home", data));
    return cb(0);
  }));
};