var path = require("path");
var util = require("util");
var cluster = require("cluster");
var _ = require("lodash");

var stackTrace = require("stack-trace");

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

var winston = require("winston");
winston.remove(winston.transports.Console);
//winston.add(winston.transports.Console, { level: "debug", colorize: true, timestamp: false });
winston.add(winston.transports.Console, { level: "info", colorize: true, timestamp: false });
// emerg      system is unusable
// alert      action must be taken immediately
// crit       critical conditions
// err        error conditions
// warning    warning conditions
// notice     normal, but significant, condition
// info       informational message
// debug      debug-level message

shlog.workerId = 0;
if (cluster.worker !== null) {
  shlog.workerId = cluster.worker.id;
}

shlog.log = function () {
  var callerName = "prod";
  // SWD: too slow for prod - might change to pass in module name to keep filters in prod
  if (global.C.LOG_STACKTRACE) {
    var trace = stackTrace.get();
    var callerFn = trace[1].getFileName();
    callerName = path.basename(callerFn, ".js");
    if (callerName === "shlog") { // ignore calls from this module
      callerFn = trace[2].getFileName();
      callerName = path.basename(callerFn, ".js");
    }
  }

  var args = Array.prototype.slice.call(arguments);
  var level = args.shift();

  if (level === "error" || !_.isUndefined(gDebug[callerName])) {
    var msg = util.format("%d %s - %s", shlog.workerId, callerName, util.format.apply(this, args));
//    if (msg.length > 80) {
//      msg = msg.substr(0, 80) + "...";
//    }
    winston.log(level, msg);
  }
};

shlog.debug = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift("debug");
  this.log.apply(this, args);
};

shlog.info = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift("info");
  this.log.apply(this, args);
};

shlog.error = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift("error");
  this.log.apply(this, args);
};

shlog.recv = function () {
  var callerName = "recv";
  var level = "info";
  var args = Array.prototype.slice.call(arguments);
  if (!_.isUndefined(gDebug[callerName])) {
    var msg = util.format("%s - %s", callerName, util.format.apply(this, args));
    winston.log(level, msg);
  }
};

shlog.send = function () {
  var callerName = "send";

  var args = Array.prototype.slice.call(arguments);
  var error = args.shift();
  var level = "info";
  if (error !== 0) {
    level = "error";
  }

  if (level === "error" || !_.isUndefined(gDebug[callerName])) {
    var msg = util.format("%s - %s", callerName, util.format.apply(this, args));
//		winston.log(level, msg.substr(0, 80));
    winston.log(level, msg);
  }
};