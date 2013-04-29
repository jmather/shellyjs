var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var system = exports;

system.desc = "system information, statistics, and setting";
system.functions = {
  stats: {desc: "get all server stats", params: {}, security: ["admin"]},
  config: {desc: "get all server settings", params: {}, security: ["admin"]},
};

system.stats = function (req, res, cb) {
  shlog.info("system.stats");

  cb(0, sh.event("system.stats", {stats: "here"}));
};

system.config = function (req, res, cb) {
  shlog.info("system.config");

  cb(0, sh.event("system.config", {gBaseDir: global.gBaseDir, CONF: global.CONF, PACKAGE: global.PACKAGE}));
};