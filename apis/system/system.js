var cluster = require("cluster");
var os = require("os");
var _ = require("lodash");
var shlog = require(global.C.BASE_DIR + "/lib/shlog.js");
var sh = require(global.C.BASE_DIR + "/lib/shutil.js");
var stats = require(global.C.BASE_DIR + "/lib/shstats.js");
var _w = require(global.C.BASE_DIR + "/lib/shcb.js")._w;

var system = exports;

system.desc = "system information, statistics, and setting";
system.functions = {
  config: {desc: "get all server settings", params: {}, security: ["admin"]},
  rawGet: {desc: "get an object given any key", params: {key: {dtype: "string"}}, security: ["admin"]},
  rawSet: {desc: "set an object given any key", params: {key: {dtype: "string"}, value: {dtype: "object"}}, security: ["admin"]},
  connInfo: {desc: "return info about connection", params: {}, security: [], noSession: true},
  osInfo: {desc: "get operating system info", params: {}, security: ["admin"]}
};

system.config = function (req, res, cb) {
  shlog.debug("system", "system.config");
  res.add(sh.event("system.config", {CONFIG: sh.secure(global.C), PACKAGE: global.PACKAGE}));
  return cb(0);
};

system.rawGet = function (req, res, cb) {
  shlog.debug("system", "system.rawGet");

  global.db.get(req.body.key, _w(cb, function (err, data) {
    if (err || data === null) {
      res.add(sh.error("object-get", "unable to get object", data));
      return cb(1);
    }
    res.add(sh.event("system.rawGet", {key: req.body.key, value: JSON.parse(data)}));
    return cb(0);
  }));
};

system.rawSet = function (req, res, cb) {
  shlog.debug("system", "system.rawSet");

  global.db.set(req.body.key, JSON.stringify(req.body.value), _w(cb, function (err, data) {
    if (err) {
      res.add(sh.error("object-set", "unable to set object", data));
      return cb(1);
    }
    res.add(sh.event("system.rawSet", {key: req.body.key, value: req.body.value}));
    return cb(0);
  }));
};

system.connInfo = function (req, res, cb) {
  shlog.info("system", "system.connInfo");

  var wsid = 0;
  if (_.isObject(res.ws)) {
    wsid = res.ws.id;
  }

  var data = {
    serverId: global.server.serverId,
    wid: cluster.worker.id,
    wsid: wsid
  };

  res.add(sh.event("system.connInfo", data));
  return cb(0);
};

system.osInfo = function (req, res, cb) {
  var data = {};
  data.hostname = os.hostname();
  data.type = os.type();
  data.platform = os.platform();
  data.arch = os.arch();
  data.release = os.release();
  data.uptime = os.uptime();
  data.loadavg = os.loadavg();
  data.totalmem = os.totalmem();
  data.freemem = os.freemem();
  data.cpus = os.cpus();
  data.networkInterfaces = os.networkInterfaces();
  res.add(sh.event("system.osInfo", data));
  return cb(0);
}
