var path = require("path");
var util = require("util");
var cluster = require("cluster");
var _ = require("lodash");

var shlog = exports;

var gDebug = {
//  "shloader": {},
//  "shlock": {},
//  "shobject": {},
//  "shdb": {},
//  "shsqlite": {},
//  "shredis": {},
//  "shmail": {},
//  "shmailer": {},
//  "shmatcher": {},
//  "shcall": {},
//  "socket": {},
//  "rest": {},
//  "admin": {},
//  "games": {},
//  "channel": {},
//  "channel": {},
//	"game": {},
//	"user": {},
//	"reg": {},
//  "shutil": {},
//	"recv": {},
//	"send": {},
//  "dispatch": {},
//  "shcluster": {},
  "shelly": {}
};

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

var winston = require("winston");
winston.remove(winston.transports.Console);
if (_.isFunction(global.logHook)) {
  global.logHook(winston);
}
if (global.C.LOG_CONSOLE) {
  winston.add(winston.transports.Console, global.C.LOG_CONSOLE_OPTS);
}
if (global.C.LOG_FILE) {
  winston.add(winston.transports.File, global.C.LOG_FILE_OPTS);
}
winston.setLevels(logLevels.levels);
winston.addColors(logLevels.colors);

shlog.workerId = 0;
if (cluster.worker !== null) {
  shlog.workerId = cluster.worker.id;
}

shlog.init = function (options) {
  gDebug = options;
};

shlog.log = function (level, args) {
  var group = args.shift();
  if (level === "error" || level === "system" || !_.isUndefined(gDebug[group])) {
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