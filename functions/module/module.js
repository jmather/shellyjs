var fs = require("fs");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");
var sh = require(global.gBaseDir + "/src/shutil.js");

exports.desc = "utility functions for shelly modules";
exports.functions = {
  list: {desc: "list all modules installed", params: {}, security: []},
  info: {desc: "get info for a single module", params: {name: {dtype: "string"}}, security: []}
};

function getInfo(name) {
  shlog.info("getInfo name=" + name);
  var funcDir = global.gBaseDir + "/functions";
  var cmdFile = funcDir + "/" + name + "/" + name + ".js";

  var m = {};
  m.error = 0;
  m.path = cmdFile;
  m.name = name;
  m.author = "scott";
  m.desc = "none";
  m.functions = {};

  var funcModule = null;
  try {
    delete require.cache[require.resolve(cmdFile)];
    funcModule = require(cmdFile);
  } catch (e) {
    m.error = 100;
    m.info = "unable to load module";
    return m;
  }
  if (!_.isUndefined(funcModule.desc)) {
    m.desc = funcModule.desc;
  }
  if (!_.isUndefined(funcModule.functions)) {
    m.functions = funcModule.functions;
  }
  return m;
}

exports.info = function (req, res, cb) {
  shlog.info("module.info name=" + req.body.name);
  var m = getInfo(req.body.name);
  cb(m.error, sh.event("module.info", m));
};

exports.list = function (req, res, cb) {
  var modules = {};
  var funcDir = global.gBaseDir + "/functions";
  fs.readdir(funcDir, function (err, files) {
    var error = 0;
    var fileCount = files.length;
    files.forEach(function (entry) {
      var fn = funcDir + "/" + entry;
      fs.stat(fn, function (err, stat) {
        if (stat.isDirectory()) {
          var m = getInfo(entry);
          if (m.error) {
            error = 1;
          }
          modules[m.name] = m;
        }
        fileCount -= 1;
        if (fileCount === 0) {
          cb(error, sh.event("module.list", modules));
        }
      });
    });
  });
};