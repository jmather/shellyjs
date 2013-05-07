var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var system = exports;

system.desc = "system information, statistics, and setting";
system.functions = {
  stats: {desc: "get all server stats", params: {}, security: ["admin"]},
  config: {desc: "get all server settings", params: {}, security: ["admin"]},
  rawGet: {desc: "get an object given any key", params: {key: {dtype: "string"}}, security: ["admin"]},
  rawSet: {desc: "set an object given any key", params: {key: {dtype: "string"}, data: {dtype: "object"}}, security: ["admin"]},
};

system.stats = function (req, res, cb) {
  shlog.info("system.stats");

  cb(0, sh.event("system.stats", {stats: "here"}));
};

system.config = function (req, res, cb) {
  shlog.info("system.config");

  cb(0, sh.event("system.config", {gBaseDir: global.gBaseDir, CONF: global.CONF, PACKAGE: global.PACKAGE}));
};

system.rawGet = function (req, res, cb) {
  global.db.get(req.body.key, function (err, data) {
    if (err) {
      cb(err, dataj);
      return;
    }
    cb(0, sh.event("system.rawGet", JSON.parse(data)));
  });
};

system.rawSet = function (req, res, cb) {
  global.db.set(req.body.key, JSON.stringify(req.body.data), function (err, obj) {
    if (err) {
      cb(err, obj);
      return;
    }
    cb(0, sh.event("system.rawSet", req.body.data));
  });
};