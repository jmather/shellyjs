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

var ShLoader = require(global.gBaseDir + "/src/shloader.js");

system.test = function (req, res, cb) {
  shlog.info("system.test");

  var loader = new ShLoader();
  loader.loadOrCreate("kObject", "testobj2", function (err, obj) {
    if (err) {
      cb(err, sh.error("object_load_or_create", "unable to load or create object", obj));
      return;
    }

    obj.set("foo", sh.uuid());

    loader.dump(function (err, data) {
      // nothing for now
    });
    cb(0, sh.event("system.test", obj.getData()));
  });
};