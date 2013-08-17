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
  "shcluster": {},
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

shlog.log = function (level, args) {
  var group = args[0];
  if (level === "error" || !_.isUndefined(gDebug[group])) {
    var msg = util.format("%d %s", shlog.workerId, util.format.apply(this, args));
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