var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

var system = exports;

system.desc = "system information, statistics, and setting";
system.functions = {
  stats: {desc: "get all server stats", params: {}, security: ["admin"]},
  config: {desc: "get all server settings", params: {}, security: ["admin"]},
  get: {desc: "get server setting", params: {className: {dtype: "string"}}, security: ["admin"]},
  set: {desc: "set server setting", params: {className: {dtype: "string"}, value: {dtype: "string"}}, security: ["admin"]},
  test: {desc: "get server setting", params: {}, security: ["admin"]}
};

system.pre = function (req, res, cb) {
  cb(0);
};

system.post = function (req, res, cb) {
  cb(0);
};

system.stats = function (req, res, cb) {
  shlog.info("system.stats");

  cb(0, sh.event("system.stats", {stats: "here"}));
};

system.config = function (req, res, cb) {
  shlog.info("system.config");

  cb(0, sh.event("system.config", {gBaseDir: global.gBaseDir, CONF: global.CONF, PACKAGE: global.PACKAGE}));
};

var ShObject = require(global.gBaseDir + "/src/shobject.js");

system.test = function (req, res, cb) {
  shlog.info("system.test");

  var obj = new ShObject();
  obj.loadOrCreate("testobj2", function (err, data) {
    if(data === null) {
      cb(err, sh.error("object_load_or_create", "unabel to load or create object", data));
      return;
    }
    obj.set("foo", "foo3");
    obj.save(function (err, data) {
      // don't care
    });
    cb(0, sh.event("system.test", obj.getData()));
  });
};