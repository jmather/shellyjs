var fs = require("fs");
var util = require("util");
var _ = require("lodash");

var shlog = require(global.gBaseDir + "/src/shlog.js");

var shkeys = exports;

var gKeyTypes = {};

shkeys.init = function (cb) {
  shlog.info("object init");

  var funcDir = global.gBaseDir + "/src/do";
  fs.readdir(funcDir, function (err, files) {
    var error = 0;
    var fileCount = files.length;
    files.forEach(function (entry) {
      var fn = funcDir + "/" + entry;
      var ObjModule = require(fn);
      var obj = new ObjModule();
      if (!_.isUndefined(obj._keyType) && !_.isUndefined(obj._keyFormat)) {
        gKeyTypes[obj._keyType] = {tpl: obj._keyFormat, file: fn};
        shlog.info("object factory:", obj._keyType, fn);
      } else {
        shlog.info("bad data object missing keyType or keyFormat", fn);
      }
    });
    return cb(0);
  });
};

shkeys.moduleFile = function (keyType) {
  if (!_.isObject(gKeyTypes[keyType])) {
    return null;
  }
  return gKeyTypes[keyType].file;
};

shkeys.validKey = function (keyType) {
  return _.isObject(gKeyTypes[keyType]);
};

shkeys.getAll = function () {
  return gKeyTypes;
};

shkeys.get = function (keyType, params) {
  var key = null;
  if (_.isObject(params)) {
    var paramArray = [gKeyTypes[keyType].tpl].concat(params);
    key = global.C.DB_SCOPE + util.format.apply(util.format, paramArray);
  } else {
    key = global.C.DB_SCOPE + util.format(gKeyTypes[keyType].tpl, params);
  }
  return key;
};