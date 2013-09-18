var path = require("path");
var util = require("util");
var cluster = require("cluster");
var _ = require("lodash");

var shlog = exports;

var gDebug = {};  // holds the modules names that have debug on

var logLevels = {
  levels: {
    debug: 1,
    verbose: 2,
    info: 3,
    warn: 4,
    error: 5,
    system: 6
  },
  colors: {
    verbose: 'cyan',
    debug: 'blue',
    info: 'green',
    warn: 'yellow',
    error: 'red',
    system: 'white'
  }
};

shlog.workerId = 0;
if (cluster.worker !== null) {
  shlog.workerId = cluster.worker.id;
}

var winston = require("winston");

shlog.init = function (options, hook) {
  gDebug = options;
  winston.remove(winston.transports.Console);
  if (_.isFunction(hook)) {
    hook(winston);
  }
  winston.setLevels(logLevels.levels);
  winston.addColors(logLevels.colors);
};

shlog.log = function (level, args) {
  var group = args.shift();
  if (level === "error" || level === "system" || gDebug[group]) {
    var msg = util.format("%d %s - %s", shlog.workerId, group, util.format.apply(this, args));
//    if (msg.length > 80) {
//      msg = msg.substr(0, 80) + "...";
//    }
    winston.log(level, msg);
  }
};

shlog.debug = function () {
  var args = Array.prototype.slice.call(arguments);
  this.log("debug", args);
};

shlog.info = function () {
  var args = Array.prototype.slice.call(arguments);
  this.log("info", args);
};

shlog.error = function () {
  var args = Array.prototype.slice.call(arguments);
  this.log("error", args);
};

shlog.system = function () {
  var args = Array.prototype.slice.call(arguments);
  this.log("system", args);
};