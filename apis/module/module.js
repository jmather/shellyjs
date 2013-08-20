var fs = require("fs");
var path = require("path");
var async = require("async");
var _ = require("lodash");

var shlog = require(global.C.BASEDIR + "/src/shlog.js");
var sh = require(global.C.BASEDIR + "/src/shutil.js");

exports.desc = "utility functions for shelly modules";
exports.functions = {
  core: {desc: "list all core APIs installed", params: {}, security: []},
  app: {desc: "list all application APIs installed", params: {}, security: []},
  info: {desc: "get info for a single module", params: {name: {dtype: "string"}}, security: []}
};

exports.getInfo = function (fn, cb) {
  shlog.info("module", "getInfo fn=" + fn);

  var m = {};
  m.error = 0;
  m.path = fn;
  m.name = path.basename(fn, ".js");
  m.author = "";
  m.desc = "";
  m.functions = {};

  sh.require(fn, function (err, module) {
    if (err) {
      m.error = 100;
      m.message = module;
      return cb(1, m);
    }
    if (!_.isUndefined(module.desc)) {
      m.desc = module.desc;
    }
    if (!_.isUndefined(module.functions)) {
      m.functions = module.functions;
    }
    if (!global.C.APP_API_DIR) {
      return cb(0, m);
    }
    var appApiFile = global.C.APP_API_DIR + "/" + m.name + "/" + m.name + ".js";
    fs.exists(appApiFile, function (exists) {
      m.override = exists;
      return cb(0, m);
    });
  });
};

exports.info = function (req, res, cb) {
  shlog.info("module", "module.info name=" + req.body.name);
  // SWD centralize this path construction
  var funcDir = global.C.BASEDIR + "/apis";
  var moduleFn = funcDir + "/" + req.body.name + "/" + req.body.name + ".js";
  var m = exports.getInfo(moduleFn, function (err, m) {
    // error still returns info object
    res.add(sh.event("module.info", m));
    return cb(0);
  });
};

function apiInfoByDir(dir, cb) {
  var modules = {};
  fs.readdir(dir, function (err, files) {
    async.each(files, function (entry, lcb) {
      var fn = dir + "/" + entry;
      fs.stat(fn, function (err, stat) {
        if (stat.isDirectory()) {
          var moduleFn = fn + "/" + entry + ".js";
          exports.getInfo(moduleFn, function (err, m) {
            modules[m.name] = m;
            return lcb(0);
          });
        } else {
          return lcb(0);
        }
      });
    }, function (error) {
      return cb(0, modules);
    });
  });
}

exports.core = function (req, res, cb) {
  var apiDir = global.C.BASEDIR + "/apis";

  apiInfoByDir(apiDir, function (err, modules) {
    res.add(sh.event("module.core", modules));
    return cb(0);
  });
};

exports.app = function (req, res, cb) {
  if (!global.C.APP_API_DIR) {
    res.add(sh.error("api-dir-missing", "the APP_API_DIR is not set"));
    return cb(1);
  }

  apiInfoByDir(global.C.APP_API_DIR, function (err, modules) {
    res.add(sh.event("module.app", modules));
    return cb(0);
  });
};